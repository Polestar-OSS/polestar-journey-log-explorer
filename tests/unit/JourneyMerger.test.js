import { describe, it, expect } from 'vitest';
import { JourneyMerger } from '../../app/src/services/ingest/JourneyMerger.js';
import { processRawRows } from '../../app/src/utils/dataParser.js';
import { HEADERS_KM, HEADERS_MI, SMALL_EXPORT, row } from '../fixtures/rows.js';

const merger = new JourneyMerger();
const source = (rows, fileName, headers = HEADERS_KM) => ({ ...processRawRows(rows, headers), fileName });

describe('JourneyMerger.merge', () => {
    it('returns an empty journey for no sources', () => {
        expect(merger.merge([])).toEqual({ data: [], distanceUnit: 'km', sources: [], duplicatesRemoved: 0 });
    });

    it('is a set union: overlapping exports add only the new trips', () => {
        const older = source(SMALL_EXPORT.slice(2), 'older.xlsx'); // Jan + 1 Jul
        const newer = source(SMALL_EXPORT.slice(0, 6), 'newer.xlsx'); // Jul + 2 Jan
        const merged = merger.merge([older, newer]);
        expect(merged.data).toHaveLength(8);
        expect(merged.duplicatesRemoved).toBe(4);
        expect(merged.sources.map((s) => [s.fileName, s.added, s.duplicates])).toEqual([
            ['older.xlsx', 6, 0],
            ['newer.xlsx', 2, 4],
        ]);
    });

    it('is idempotent and order-insensitive in size', () => {
        const a = source(SMALL_EXPORT, 'a.csv');
        const b = source(SMALL_EXPORT.slice(0, 4), 'b.csv');
        expect(merger.merge([a, a]).data).toHaveLength(8);
        expect(merger.merge([a, b]).data).toHaveLength(merger.merge([b, a]).data.length);
    });

    it('re-sorts chronologically, re-ids, and tags each trip with its source', () => {
        const a = source(SMALL_EXPORT.slice(4), 'jan.csv');
        const b = source(SMALL_EXPORT.slice(0, 4), 'jul.csv');
        const merged = merger.merge([b, a]);
        expect(merged.data.map((t) => t.id)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
        expect(merged.data.every((t, i) => i === 0 || t.startTs >= merged.data[i - 1].startTs)).toBe(true);
        expect(merged.data[0].sourceFile).toBe('jan.csv');
        expect(merged.data.at(-1).sourceFile).toBe('jul.csv');
    });

    it('keeps the first file\'s values and counts a conflict when duplicates disagree', () => {
        const base = row({ start: '2026-03-01, 08:00', end: '2026-03-01, 08:20', km: 10, kwh: 2, socStart: 80, socEnd: 77 });
        const disagree = { ...base, 'Consumption in Kwh': 2.5 };
        const merged = merger.merge([source([base], 'first.csv'), source([disagree], 'second.csv')]);
        expect(merged.data).toHaveLength(1);
        expect(merged.data[0].consumptionKwh).toBe(2);
        expect(merged.sources[1].conflicts).toBe(1);
    });

    it('normalises a mile export into a km journey (and vice versa)', () => {
        const km = source([row({ start: '2026-03-01, 08:00', end: '2026-03-01, 08:20', km: 16.0934, kwh: 3 })], 'km.csv');
        const miRows = [row({ start: '2026-03-02, 08:00', end: '2026-03-02, 08:20', km: 10, kwh: 3 })].map((r) => {
            const { 'Distance in KM': d, ...rest } = r;
            return { ...rest, 'Distance in Mile': d };
        });
        const mi = source(miRows, 'mi.csv', HEADERS_MI);
        const asKm = merger.merge([km, mi]);
        expect(asKm.distanceUnit).toBe('km');
        expect(asKm.data[1].distanceKm).toBeCloseTo(16.09, 2);
        expect(asKm.data[1].efficiency).toBeCloseTo((3 / 16.0934) * 100, 1);
        const asMi = merger.merge([mi, km]);
        expect(asMi.distanceUnit).toBe('mi');
        expect(asMi.data[0].distanceKm).toBeCloseTo(10, 2);
    });

    it('treats the same drive exported in km and in miles as one trip', () => {
        const km = source([row({ start: '2026-03-01, 08:00', end: '2026-03-01, 08:20', km: 16.1, kwh: 3 })], 'km.csv');
        const miRows = [row({ start: '2026-03-01, 08:00', end: '2026-03-01, 08:20', km: 10, kwh: 3 })].map((r) => {
            const { 'Distance in KM': d, ...rest } = r;
            return { ...rest, 'Distance in Mile': d };
        });
        const merged = merger.merge([km, source(miRows, 'mi.csv', HEADERS_MI)]);
        expect(merged.data).toHaveLength(1);
        expect(merged.duplicatesRemoved).toBe(1);
    });
});

describe('JourneyMerger.tripKey', () => {
    it('depends on start, end and rounded distance only', () => {
        const a = { startTs: 1, endTs: 2, distanceKm: 10.04, consumptionKwh: 1 };
        const b = { startTs: 1, endTs: 2, distanceKm: 9.96, consumptionKwh: 9 };
        const c = { startTs: 1, endTs: 3, distanceKm: 10, consumptionKwh: 1 };
        expect(JourneyMerger.tripKey(a)).toBe(JourneyMerger.tripKey(b));
        expect(JourneyMerger.tripKey(a)).not.toBe(JourneyMerger.tripKey(c));
    });
});
