import { describe, it, expect, vi } from 'vitest';
import { RouteSnapper } from '../../app/src/services/map/RouteSnapper.js';
import { ReplayService } from '../../app/src/services/map/ReplayService.js';
import { ColorCalculator } from '../../app/src/services/map/ColorCalculator.js';
import { processRawRows } from '../../app/src/utils/dataParser.js';
import { HEADERS_KM, SMALL_EXPORT } from '../fixtures/rows.js';

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
