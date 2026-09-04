import { describe, it, expect } from 'vitest';
import { StatsService, quantiles, linearRegression, percentile } from '../../app/src/services/analytics/StatsService.js';
import { processRawRows } from '../../app/src/utils/dataParser.js';
import { HEADERS_KM, SMALL_EXPORT, row } from '../fixtures/rows.js';

const { data } = processRawRows(SMALL_EXPORT, HEADERS_KM);
const stats = new StatsService('km');

describe('quantiles and regression', () => {
    it('interpolates percentiles', () => {
        expect(percentile([1, 2, 3, 4], 0.5)).toBe(2.5);
        expect(percentile([10], 0.9)).toBe(10);
        expect(percentile([], 0.5)).toBeNull();
        const q = quantiles([5, 1, 3, 2, 4, 'x', NaN]);
        expect(q).toMatchObject({ n: 5, min: 1, p50: 3, max: 5, mean: 3 });
    });

    it('fits a line and reports r²', () => {
        const fit = linearRegression([{ x: 1, y: 3 }, { x: 2, y: 5 }, { x: 3, y: 7 }]);
        expect(fit.slope).toBeCloseTo(2);
        expect(fit.intercept).toBeCloseTo(1);
        expect(fit.r2).toBeCloseTo(1);
        expect(linearRegression([{ x: 1, y: 1 }]).slope).toBeNull();
        expect(linearRegression([{ x: 1, y: 1 }, { x: 1, y: 2 }, { x: 1, y: 3 }]).slope).toBeNull();
    });
});

describe('distributionTable', () => {
    it('reports one row per measure with percentiles', () => {
        const rows = stats.distributionTable(data);
        expect(rows.map((r) => r.key)).toEqual(['distance', 'efficiency', 'consumption', 'duration', 'avgSpeed', 'socDrop']);
        const distance = rows[0];
        expect(distance.n).toBe(8);
        expect(distance.min).toBe(6.3);
        expect(distance.max).toBe(6.5);
        expect(distance.unit).toBe('km');
    });
});

describe('consumptionModel', () => {
    it('recovers overhead and marginal consumption from a synthetic fleet', () => {
        // energy = 0.4 kWh + 0.18 kWh/km · distance
        const rows = Array.from({ length: 20 }, (_, i) => {
            const km = 2 + i * 3;
            return row({ start: `2026-05-${String(i + 1).padStart(2, '0')}, 08:00`, end: `2026-05-${String(i + 1).padStart(2, '0')}, 09:00`, km, kwh: Math.round((0.4 + 0.18 * km) * 100) / 100, socStart: 80, socEnd: 70, odo: 5000 + i * 100 });
        });
        const model = stats.consumptionModel(processRawRows(rows, HEADERS_KM).data);
        expect(model.overall.overheadKwh).toBeCloseTo(0.4, 1);
        expect(model.overall.marginalPer100).toBeCloseTo(18, 0);
        expect(model.overall.r2).toBeGreaterThan(0.99);
        expect(model.breakEvenDistance).toBeCloseTo(2.2, 1);
        expect(model.bySeason.spring.n).toBe(20);
        expect(model.bySeason.winter.marginalPer100).toBeNull();
    });
});

describe('efficiency drivers', () => {
    it('bins by speed, hour and start SOC', () => {
        const bySpeed = stats.efficiencyBySpeed(data);
        expect(bySpeed).toHaveLength(8);
        expect(bySpeed.reduce((s, b) => s + b.n, 0)).toBe(8);
        const byHour = stats.efficiencyByHour(data);
        expect(byHour).toHaveLength(24);
        expect(byHour[8].n).toBe(4);
        expect(byHour[8].median).not.toBeNull();
        expect(byHour[3].median).toBeNull();
        const bySoc = stats.efficiencyByStartSoc(data);
        expect(bySoc.map((b) => b.label)).toEqual(['0–20%', '20–40%', '40–60%', '60–80%', '80–100%']);
    });

    it('scales speed bands for miles', () => {
        expect(new StatsService('mi').efficiencyBySpeed(data)[1].label).toBe('12–19');
    });
});

describe('battery and charging', () => {
    it('fits kWh per percent through the origin', () => {
        const rows = Array.from({ length: 8 }, (_, i) =>
            row({ start: `2026-04-0${i + 1}, 08:00`, end: `2026-04-0${i + 1}, 09:00`, km: 40, kwh: (i + 3) * 0.79, socStart: 90, socEnd: 90 - (i + 3), odo: 3000 + i * 50 })
        );
        const fit = stats.batteryFit(processRawRows(rows, HEADERS_KM).data);
        expect(fit.n).toBe(8);
        expect(fit.kwhPerPct).toBeCloseTo(0.79, 2);
        expect(fit.usableKwh).toBeCloseTo(79, 0);
    });

    it('lists charge sessions with a from/to histogram', () => {
        const { sessions, histogram, sessionsPerWeek } = stats.chargeSessions(data);
        expect(sessions).toHaveLength(3);
        expect(sessions[0]).toMatchObject({ from: 72, to: 90, gain: 18 });
        expect(histogram.reduce((s, b) => s + b.from, 0)).toBe(3);
        expect(histogram[9].to).toBe(1); // one session ended in the 90–100 band
        expect(sessionsPerWeek).toBeGreaterThan(0);
    });
});

describe('dataQuality', () => {
    it('reports unlogged distance per month and issue counts', () => {
        const q = stats.dataQuality(data, [{ conflicts: 1, duplicates: 4 }]);
        expect(q.months.map((m) => m.key)).toEqual(['2026-01', '2026-07']);
        expect(q.months[0].logged).toBeCloseTo(25.7, 0);
        expect(q.months[0].unlogged).toBe(0);
        expect(q.months[1].unlogged).toBe(3); // fixture odometers round 6.4 km to 6, leaving 1 km gaps
        expect(q.issues.find((i) => i.key === 'noCoords').count).toBe(0);
        expect(q.conflicts).toBe(1);
        expect(q.duplicates).toBe(4);
    });

    it('counts odometer gaps between logged trips', () => {
        const gappy = processRawRows([
            row({ start: '2026-02-02, 08:00', end: '2026-02-02, 08:20', km: 10, kwh: 2, odo: 2000 }),
            row({ start: '2026-02-01, 08:00', end: '2026-02-01, 08:20', km: 10, kwh: 2, odo: 1000 }),
        ], HEADERS_KM).data;
        const q = stats.dataQuality(gappy);
        expect(q.months[0].unlogged).toBe(990);
        expect(q.months[0].coveragePct).toBe(2);
    });
});
