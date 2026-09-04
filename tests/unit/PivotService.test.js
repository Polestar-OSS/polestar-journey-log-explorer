import { describe, it, expect } from 'vitest';
import { PivotService } from '../../app/src/services/analytics/PivotService.js';
import { processRawRows } from '../../app/src/utils/dataParser.js';
import { HEADERS_KM, SMALL_EXPORT, row } from '../fixtures/rows.js';

const { data } = processRawRows(SMALL_EXPORT, HEADERS_KM);
const pivot = new PivotService('km');

describe('PivotService', () => {
    it('exposes dimension and metric options', () => {
        expect(pivot.dimensionOptions().map((o) => o.value)).toContain('month');
        expect(pivot.metricOptions().find((o) => o.value === 'efficiency').label).toBe('Efficiency (energy ÷ distance) (kWh/100km)');
    });

    it('groups by month in calendar order with shares for additive metrics', () => {
        const r = pivot.pivot(data, 'month', 'distance');
        expect(r.rows.map((x) => x.label)).toEqual(['Jan 26', 'Jul 26']);
        expect(r.rows[0].value).toBeCloseTo(25.7, 1);
        expect(r.rows[0].share + r.rows[1].share).toBeCloseTo(100, 0);
        expect(r.total).toBeCloseTo(51.3, 1);
        expect(r.dimension.timeline).toBe(true);
    });

    it('computes ratio metrics without a share', () => {
        const r = pivot.pivot(data, 'season', 'efficiency');
        expect(r.rows.map((x) => x.label)).toEqual(['Winter', 'Summer']);
        expect(r.rows[0].value).toBeGreaterThan(r.rows[1].value);
        expect(r.rows[0].share).toBeNull();
        expect(r.total).toBeNull();
    });

    it('supports weekday, hour, distance and SOC bands', () => {
        expect(pivot.pivot(data, 'weekday', 'trips').rows.map((x) => x.label)).toEqual(['Mon', 'Tue', 'Wed', 'Thu']);
        expect(pivot.pivot(data, 'hour', 'trips').rows.map((x) => x.label)).toEqual(['08:00', '17:00']);
        expect(pivot.pivot(data, 'distanceBand', 'trips').rows[0]).toMatchObject({ label: '5–10 km', value: 8 });
        expect(pivot.pivot(data, 'socBand', 'trips').rows.map((x) => x.label)).toEqual(['0–5%']);
    });

    it('ranks free-text dimensions by value and folds the tail into Other', () => {
        const rows = Array.from({ length: 15 }, (_, i) =>
            row({ start: `2026-03-${String(i + 1).padStart(2, '0')}, 08:00`, end: `2026-03-${String(i + 1).padStart(2, '0')}, 08:20`, km: 5 + i, kwh: 1, from: { lat: 57 + i * 0.01, lng: 11, addr: `Place ${i}` }, odo: 100 * i })
        );
        const r = pivot.pivot(processRawRows(rows, HEADERS_KM).data, 'startPlace', 'distance');
        expect(r.rows).toHaveLength(13);
        expect(r.rows[0].label).toBe('Place 14');
        expect(r.rows.at(-1).label).toBe('Other (3)');
        expect(r.rows.at(-1).trips).toBe(3);
    });

    it('serialises to CSV with the metric header', () => {
        const csv = pivot.toCSV(pivot.pivot(data, 'season', 'trips'));
        expect(csv.split('\n')[0]).toBe('Season,Trips,Trips,Distance (km),Energy (kWh),Share (%)');
        expect(csv.split('\n')).toHaveLength(3);
    });

    it('rejects unknown keys', () => {
        expect(() => pivot.pivot(data, 'nope', 'trips')).toThrow(/Unknown dimension/);
    });
});
