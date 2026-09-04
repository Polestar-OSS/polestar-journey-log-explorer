import { describe, it, expect } from 'vitest';
import { InsightsCalculator } from '../../app/src/services/insights/InsightsCalculator.js';
import { processRawRows } from '../../app/src/utils/dataParser.js';
import { HEADERS_KM, SMALL_EXPORT, PLACES, row } from '../fixtures/rows.js';

const { data } = processRawRows(SMALL_EXPORT, HEADERS_KM);
const calc = new InsightsCalculator('km');

describe('InsightsCalculator.compute', () => {
    const insights = calc.compute(data);

    it('returns null for an empty set', () => {
        expect(calc.compute([])).toBeNull();
    });

    it('compares winter with summer and folds months onto one calendar', () => {
        const { seasonality } = insights;
        expect(seasonality.winter.trips).toBe(4);
        expect(seasonality.summer.trips).toBe(4);
        expect(seasonality.winter.efficiency).toBeGreaterThan(seasonality.summer.efficiency);
        expect(seasonality.winterPenaltyPct).toBeNull(); // below the 5-trip floor per season
        expect(seasonality.months).toHaveLength(12);
        expect(seasonality.months[0].trips).toBe(4);
        expect(seasonality.months[6].trips).toBe(4);
    });

    it('requires five trips per season before stating a penalty', () => {
        const more = processRawRows(
            [
                ...SMALL_EXPORT,
                row({ start: '2026-01-14, 08:00', end: '2026-01-14, 08:20', km: 6.4, kwh: 1.8, socStart: 80, socEnd: 78, odo: 1100 }),
                row({ start: '2026-07-03, 08:00', end: '2026-07-03, 08:15', km: 6.4, kwh: 1.0, socStart: 80, socEnd: 79, odo: 1110 }),
            ],
            HEADERS_KM
        ).data;
        const { seasonality } = calc.compute(more);
        expect(seasonality.winterPenaltyPct).toBeGreaterThan(50);
    });

    it('finds home as the busiest cluster', () => {
        const { places } = insights;
        expect(places.uniquePlaces).toBe(2);
        expect(places.top[0].address).toBe(PLACES.HOME.addr);
        expect(places.homeSharePct).toBe(50);
        expect(places.tripsTouchingHome).toBe(8);
    });

    it('merges endpoints that straddle a grid boundary into one place', () => {
        const jitter = (r, d) => ({ ...r, 'Start Latitude': r['Start Latitude'] + d, 'End Latitude': r['End Latitude'] + d });
        const rows = SMALL_EXPORT.map((r, i) => jitter(r, (i % 2 ? 1 : -1) * 0.0006));
        const { places } = calc.compute(processRawRows(rows, HEADERS_KM).data);
        expect(places.uniquePlaces).toBe(2);
    });

    it('infers charging sessions from SOC rising between trips', () => {
        const { charging } = insights;
        // gains: Jan13 90 after 72 (+18), Jan13 evening 72 after 88? no (72<88), Jul1 80 after 70 (+10), Jul2 80 after 77 (+3)
        expect(charging.sessions).toBe(3);
        expect(charging.significantSessions).toBe(2);
        expect(charging.typicalTargetSoc).toBe(85);
        expect(charging.lowestSoc).toBe(69);
        expect(charging.totalSocUsedPct).toBe(12);
    });

    it('does not estimate the battery from tiny SOC drops', () => {
        expect(insights.battery.usableKwh).toBeNull();
        expect(insights.battery.samples).toBe(0);
    });

    it('estimates usable capacity from trips that moved the gauge', () => {
        const long = processRawRows(
            Array.from({ length: 6 }, (_, i) =>
                row({ start: `2026-03-0${i + 1}, 08:00`, end: `2026-03-0${i + 1}, 09:30`, km: 80, kwh: 15.8, socStart: 80, socEnd: 60, odo: 2000 + i * 100 })
            ),
            HEADERS_KM
        ).data;
        const { battery } = calc.compute(long);
        expect(battery.usableKwh).toBeCloseTo(79, 0);
        expect(battery.likelyPack).toContain('Polestar 2 Long Range');
        expect(battery.estimatedRange).toBe(400);
        expect(battery.rangeAt80).toBe(320);
    });

    it('measures log coverage against the odometer', () => {
        const { coverage } = insights;
        expect(coverage.odometerSpan).toBe(53);
        expect(coverage.loggedDistance).toBeCloseTo(51.3, 1);
        expect(coverage.coveragePct).toBe(97);
        expect(coverage.unloggedDistance).toBe(2);
    });

    it('describes rhythm and records', () => {
        const { rhythm, records } = insights;
        expect(rhythm.busiestWeekday).toBe(0); // Monday twice, Tuesday twice, Wednesday twice, Thursday twice → first max
        expect(rhythm.peakHour).toBe(8);
        expect(rhythm.activeDays).toBe(4);
        expect(rhythm.longestStreakDays).toBe(2);
        expect(rhythm.tripsPerActiveDay).toBe(2);
        expect(records.longestTrip.distanceKm).toBe(6.5);
        expect(records.longestDay.trips).toBe(2);
        expect(records.mostEfficient).toBeNull(); // no trip ≥ 10 km
    });

    it('reports the short-hop share', () => {
        const { shortTrips } = insights;
        expect(shortTrips.threshold).toBe(3);
        expect(shortTrips.count).toBe(0);
        expect(shortTrips.sharePct).toBe(0);
    });
});

describe('period comparison', () => {
    it('slices the equally long period before a range', () => {
        const from = new Date(2026, 6, 1).getTime();
        const to = new Date(2026, 6, 3).getTime();
        const previous = InsightsCalculator.previousPeriod(data, from, to);
        expect(previous).toHaveLength(0); // Jun 29 – Jul 1 holds no trips
        const wide = InsightsCalculator.previousPeriod(data, from, from + 200 * 86400000);
        expect(wide).toHaveLength(4); // the January trips
    });

    it('computes signed percentage deltas', () => {
        const current = data.filter((t) => t.monthKey === '2026-07');
        const previous = data.filter((t) => t.monthKey === '2026-01');
        const delta = InsightsCalculator.comparePeriods(current, previous);
        expect(delta.hasPrevious).toBe(true);
        expect(delta.trips).toBe(0);
        expect(delta.consumption).toBeLessThan(0);
        expect(delta.efficiency).toBeLessThan(-30);
        expect(InsightsCalculator.comparePeriods(current, []).hasPrevious).toBe(false);
    });
});
