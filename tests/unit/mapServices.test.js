import { describe, it, expect, vi } from 'vitest';
import { RouteSnapper } from '../../app/src/services/map/RouteSnapper.js';
import { ReplayService } from '../../app/src/services/map/ReplayService.js';
import { ColorCalculator } from '../../app/src/services/map/ColorCalculator.js';
import { MapDataProcessor, FALLBACK_CENTER } from '../../app/src/services/map/MapDataProcessor.js';
import { hasCoordinates, hasPoint } from '../../app/src/utils/geo.js';
import { processRawRows } from '../../app/src/utils/dataParser.js';
import { HEADERS_KM, SMALL_EXPORT, row } from '../fixtures/rows.js';

const { data } = processRawRows(SMALL_EXPORT, HEADERS_KM);

const memoryStorage = () => {
    const store = new Map();
    return { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), store };
};

describe('RouteSnapper', () => {
    it('keys pairs at ~10 m and collapses repeated commutes', () => {
        const pairs = RouteSnapper.uniquePairs(data);
        expect(pairs).toHaveLength(2); // home→work and work→home
        expect(RouteSnapper.pairKey(data[0])).toMatch(/^11\.967,57\.6985>11\.9385,57\.7065$/);
    });

    it('keeps trips on the equator or prime meridian and drops only missing points', () => {
        const equator = { ...data[0], startLat: 0, startLng: 9.5, endLat: 0.2, endLng: 9.6 };
        const meridian = { ...data[0], startLat: 51.4, startLng: 0, endLat: 51.5, endLng: -0.1 };
        const missingEnd = { ...data[0], endLat: 0, endLng: 0 };
        const nan = { ...data[0], startLat: NaN };
        expect(RouteSnapper.uniquePairs([equator, meridian, missingEnd, nan])).toHaveLength(2);
    });

    it('fetches each missing pair once, caches it, and reports progress', async () => {
        const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => ({ routes: [{ geometry: { coordinates: [[11.967, 57.6985], [11.95, 57.70], [11.9385, 57.7065]] } }] }) }));
        const storage = memoryStorage();
        const snapper = new RouteSnapper({ fetchImpl, storage, concurrency: 1 });
        const progress = [];
        const stats = await snapper.snapAll(data, { onProgress: (d, t) => progress.push([d, t]) });
        expect(fetchImpl).toHaveBeenCalledTimes(2);
        expect(stats).toMatchObject({ fetched: 2, failed: 0, cached: 0, total: 2 });
        expect(progress.at(-1)).toEqual([2, 2]);
        expect(snapper.cached(data[0])).toHaveLength(3);
        // A second snapper on the same storage starts warm
        const again = new RouteSnapper({ fetchImpl, storage });
        expect(again.cacheSize()).toBe(2);
        const stats2 = await again.snapAll(data);
        expect(fetchImpl).toHaveBeenCalledTimes(2);
        expect(stats2.cached).toBe(2);
    });

    it('counts router failures without throwing and sends only coordinates', async () => {
        const fetchImpl = vi.fn(async (url) => {
            expect(url).not.toMatch(/Vasagatan|2026-/);
            return { ok: false, status: 429 };
        });
        const snapper = new RouteSnapper({ fetchImpl, storage: memoryStorage() });
        const stats = await snapper.snapAll(data);
        expect(stats.failed).toBe(2);
        expect(snapper.cached(data[0])).toBeNull();
    });

    it('is a no-op without fetch (server-side render, tests)', async () => {
        const snapper = new RouteSnapper({ fetchImpl: null, storage: memoryStorage() });
        expect(await snapper.snapAll(data)).toMatchObject({ fetched: 0, failed: 0 });
    });
});

describe('ReplayService', () => {
    const replay = new ReplayService();
    const { frames, totalDays } = replay.build(data);

    it('builds one frame per driving day with running totals', () => {
        expect(totalDays).toBe(4);
        expect(frames[0].dayKey).toBe('2026-01-12');
        expect(frames[0].trips).toHaveLength(2);
        expect(frames[0].cumulative.trips).toBe(2);
        expect(frames.at(-1).cumulative.trips).toBe(8);
        expect(frames.at(-1).cumulative.distance).toBeCloseTo(51.3, 1);
        expect(frames[1].label).toMatch(/^Jan 13 2026$/);
    });

    it('splits visible trips into current, recent trail and older', () => {
        const at = replay.visibleAt(frames, 3, 2);
        expect(at.current).toHaveLength(2);
        expect(at.recent).toHaveLength(4); // frames 1 and 2
        expect(at.older).toHaveLength(2); // frame 0
        expect(replay.visibleAt(frames, 99).frame.index).toBe(3);
        expect(replay.visibleAt([], 0).current).toEqual([]);
    });
});

describe('ColorCalculator', () => {
    it('scales thresholds for miles', () => {
        expect(new ColorCalculator('km').getEfficiencyColor(14)).toEqual([18, 184, 134]);
        expect(new ColorCalculator('mi').getEfficiencyColor(23)).toEqual([18, 184, 134]);
        expect(new ColorCalculator('km').getEfficiencyColor(26)).toEqual([250, 82, 82]);
    });
});

describe('geo helpers', () => {
    it('treats null island and non-finite values as missing, a lone zero as present', () => {
        expect(hasPoint(0, 0)).toBe(false);
        expect(hasPoint(0, 12.5)).toBe(true);
        expect(hasPoint(57.7, 0)).toBe(true);
        expect(hasPoint(undefined, 12)).toBe(false);
        expect(hasPoint(Infinity, 12)).toBe(false);
        expect(hasCoordinates(null)).toBe(false);
        expect(hasCoordinates({ startLat: 57.7, startLng: 11.9, endLat: 0, endLng: 0 })).toBe(false);
        expect(hasCoordinates(data[0])).toBe(true);
    });
});

describe('MapDataProcessor', () => {
    const processor = new MapDataProcessor();

    it('keeps only located trips, newest first, grouped by day in time order', () => {
        const nowhere = { lat: 0, lng: 0, addr: 'Unknown' };
        const unlocated = processRawRows([row({ start: '2026-02-01, 09:00', end: '2026-02-01, 09:20', km: 5, kwh: 1, from: nowhere, to: nowhere, odo: 3000 })], HEADERS_KM).data[0];
        const { allTrips, tripsByDay, center } = processor.prepare([...data, unlocated]);
        expect(allTrips).toHaveLength(data.length);
        expect(allTrips[0].startTs).toBeGreaterThan(allTrips.at(-1).startTs);
        Object.values(tripsByDay).forEach((list) => list.forEach((t, i) => i > 0 && expect(t.startTs).toBeGreaterThanOrEqual(list[i - 1].startTs)));
        expect(center[0]).toBeCloseTo(11.95, 1);
        expect(center[1]).toBeCloseTo(57.7, 1);
    });

    it('falls back to a default centre without coordinates', () => {
        expect(processor.prepare([]).center).toEqual(FALLBACK_CENTER);
        expect(processor.centerOf([{ startLat: 0, startLng: 0, endLat: 0, endLng: 0 }])).toEqual(FALLBACK_CENTER);
    });
});
