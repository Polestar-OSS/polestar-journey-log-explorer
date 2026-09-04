import { describe, it, expect } from 'vitest';
import { processRawRows, calculateStatistics, parseCSV } from '../../app/src/utils/dataParser.js';
import { HEADERS_KM, HEADERS_MI, SMALL_EXPORT, row } from '../fixtures/rows.js';

describe('processRawRows', () => {
    const { data, distanceUnit } = processRawRows(SMALL_EXPORT, HEADERS_KM);

    it('detects the unit from the header and drops zero-distance rows', () => {
        expect(distanceUnit).toBe('km');
        expect(data).toHaveLength(8);
        expect(data.every((t) => t.distanceKm > 0)).toBe(true);
    });

    it('orders trips chronologically and assigns sequential ids', () => {
        expect(data[0].startDate).toBe('2026-01-12, 08:05');
        expect(data.at(-1).startDate).toBe('2026-07-02, 17:10');
        expect(data.map((t) => t.id)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
        expect(data.every((t, i) => i === 0 || t.startTs >= data[i - 1].startTs)).toBe(true);
    });

    it('derives numeric efficiency and time fields', () => {
        const first = data[0];
        expect(typeof first.efficiency).toBe('number');
        expect(first.efficiency).toBeCloseTo((1.8 / 6.4) * 100, 2);
        expect(first.durationMin).toBe(19);
        expect(first.avgSpeed).toBeCloseTo(6.4 / (19 / 60), 1);
        expect(first.hour).toBe(8);
        expect(first.weekday).toBe(0); // Monday 2026-01-12
        expect(first.dayKey).toBe('2026-01-12');
        expect(first.monthKey).toBe('2026-01');
        expect(first.socDrop).toBe(2);
    });

    it('detects miles from the alternate header', () => {
        const mi = processRawRows(SMALL_EXPORT.map((r) => { const { 'Distance in KM': d, ...rest } = r; return { ...rest, 'Distance in Mile': d }; }), HEADERS_MI);
        expect(mi.distanceUnit).toBe('mi');
        expect(mi.data).toHaveLength(8);
    });

    it('keeps rows whose dates fail to parse but marks the time fields null', () => {
        const { data: bad } = processRawRows([row({ start: 'yesterday', end: 'later', km: 5, kwh: 1 })], HEADERS_KM);
        expect(bad).toHaveLength(1);
        expect(bad[0].startTs).toBeNull();
        expect(bad[0].durationMin).toBeNull();
        expect(bad[0].hour).toBeNull();
    });
});

describe('calculateStatistics', () => {
    const { data } = processRawRows(SMALL_EXPORT, HEADERS_KM);
    const stats = calculateStatistics(data, 'km');

    it('sums distance and energy and derives the period average', () => {
        expect(stats.totalTrips).toBe(8);
        expect(parseFloat(stats.totalDistance)).toBeCloseTo(51.3, 1);
        expect(parseFloat(stats.totalConsumption)).toBeCloseTo(11.4, 1);
        expect(parseFloat(stats.avgEfficiency)).toBeCloseTo((11.4 / 51.3) * 100, 1);
    });

    it('reports odometer span, active days and the longest trip', () => {
        expect(stats.odometerStart).toBe(994);
        expect(stats.odometerEnd).toBe(1047);
        expect(stats.activeDays).toBe(4);
        expect(stats.longestTrip.distanceKm).toBe(6.5);
    });

    it('returns null for an empty set', () => {
        expect(calculateStatistics([], 'km')).toBeNull();
    });

    it('uses gallons and the US ICE baseline for miles', () => {
        const mi = calculateStatistics(data, 'mi');
        expect(mi.fuelUnit).toBe('gal');
        expect(parseFloat(mi.gasSaved)).toBeCloseTo((51.3 / 100) * 4.2, 1);
    });
});

describe('parseCSV', () => {
    it('parses a CSV string through PapaParse with the same pipeline', async () => {
        const csv = [HEADERS_KM.join(','), ...SMALL_EXPORT.slice(0, 2).map((r) => HEADERS_KM.map((h) => `"${r[h]}"`).join(','))].join('\n');
        const { data, distanceUnit } = await parseCSV(csv);
        expect(distanceUnit).toBe('km');
        expect(data).toHaveLength(2);
        expect(data[0].startTs).toBeLessThan(data[1].startTs);
    });
});
