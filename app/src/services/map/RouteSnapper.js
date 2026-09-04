/**
 * RouteSnapper - turns a start/end pair into a road-following path using
 * the public OSRM demo router. Opt-in only: it sends coordinates (never
 * addresses, dates or energy) to a third party, so the UI must say so
 * before enabling it. Results are cached in localStorage so a pair is
 * fetched once per browser.
 *
 * Single Responsibility: fetching and caching snapped geometries. Drawing
 * stays in FeatureBuilder; deciding when to snap stays in the view.
 */
import { hasCoordinates } from '../../utils/geo';

export const ROUTE_CACHE_KEY = 'polestar-route-cache:v1';
const CACHE_KEY = ROUTE_CACHE_KEY;
const DEFAULT_ENDPOINT = 'https://router.project-osrm.org/route/v1/driving';
const MAX_CACHE_ENTRIES = 2000;

const round4 = (n) => Math.round(n * 1e4) / 1e4;

export class RouteSnapper {
    constructor({ endpoint = DEFAULT_ENDPOINT, concurrency = 2, fetchImpl, storage } = {}) {
        this.endpoint = endpoint;
        this.concurrency = concurrency;
        // `null` disables fetching explicitly (tests, SSR); undefined means "use the global"
        this.fetch = fetchImpl === undefined ? (typeof fetch === 'function' ? fetch.bind(globalThis) : null) : fetchImpl;
        this.storage = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
        this.cache = this._load();
        this.inFlight = new Map();
    }

    /** Stable key for an origin/destination pair at ~10 m precision. */
    static pairKey(trip) {
        return `${round4(trip.startLng)},${round4(trip.startLat)}>${round4(trip.endLng)},${round4(trip.endLat)}`;
    }

    /** Unique pairs in a trip set, so 500 commutes become a few dozen requests. */
    static uniquePairs(trips) {
        const seen = new Map();
        trips.forEach((t) => {
            if (!hasCoordinates(t)) return;
            const key = RouteSnapper.pairKey(t);
            if (!seen.has(key)) seen.set(key, t);
        });
        return [...seen.entries()].map(([key, trip]) => ({ key, trip }));
    }

    cached(trip) {
        return this.cache.get(RouteSnapper.pairKey(trip)) ?? null;
    }

    cacheSize() {
        return this.cache.size;
    }

    /**
     * Fetch every missing pair with bounded concurrency.
     * @param {Array} trips
     * @param {{ onProgress?: (done, total) => void, signal?: AbortSignal }} options
     * @returns {Promise<{ fetched: number, failed: number, cached: number }>}
     */
    async snapAll(trips, { onProgress, signal } = {}) {
        const pairs = RouteSnapper.uniquePairs(trips);
        const missing = pairs.filter((p) => !this.cache.has(p.key));
        const stats = { fetched: 0, failed: 0, cached: pairs.length - missing.length, total: missing.length };
        if (!this.fetch || missing.length === 0) {
            onProgress?.(0, 0);
            return stats;
        }
        let index = 0;
        const worker = async () => {
            while (index < missing.length) {
                if (signal?.aborted) return;
                const item = missing[index++];
                try {
                    const path = await this.snapOne(item.trip, signal);
                    if (path) stats.fetched += 1;
                    else stats.failed += 1;
                } catch {
                    stats.failed += 1;
                }
                onProgress?.(stats.fetched + stats.failed, missing.length);
            }
        };
        await Promise.all(Array.from({ length: Math.min(this.concurrency, missing.length) }, worker));
        this._save();
        return stats;
    }

    /** One pair → array of [lng, lat], or null when the router has no route. */
    async snapOne(trip, signal) {
        const key = RouteSnapper.pairKey(trip);
        if (this.cache.has(key)) return this.cache.get(key);
        if (this.inFlight.has(key)) return this.inFlight.get(key);

        const url = `${this.endpoint}/${round4(trip.startLng)},${round4(trip.startLat)};${round4(trip.endLng)},${round4(trip.endLat)}?overview=full&geometries=geojson&steps=false`;
        const promise = (async () => {
            const res = await this.fetch(url, { signal, headers: { Accept: 'application/json' } });
            if (!res.ok) throw new Error(`OSRM ${res.status}`);
            const json = await res.json();
            const coords = json?.routes?.[0]?.geometry?.coordinates;
            const path = Array.isArray(coords) && coords.length > 1 ? coords.map(([lng, lat]) => [round4(lng), round4(lat)]) : null;
            if (path) this.cache.set(key, path);
            return path;
        })();
        this.inFlight.set(key, promise);
        try {
            return await promise;
        } finally {
            this.inFlight.delete(key);
        }
    }

    clear() {
        this.cache.clear();
        this._save();
    }

    _load() {
        try {
            const raw = this.storage?.getItem(CACHE_KEY);
            return new Map(raw ? JSON.parse(raw) : []);
        } catch {
            return new Map();
        }
    }

    _save() {
        if (!this.storage) return;
        try {
            let entries = [...this.cache.entries()];
            if (entries.length > MAX_CACHE_ENTRIES) entries = entries.slice(entries.length - MAX_CACHE_ENTRIES);
            this.storage.setItem(CACHE_KEY, JSON.stringify(entries));
        } catch {
            // Quota exceeded or private mode: the in-memory cache still works for this session
        }
    }
}
