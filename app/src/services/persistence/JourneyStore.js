import { exportHeaders } from '../export/JourneyLogWriter';

export const JOURNEY_STORAGE_KEY = 'polestar-journey-explorer:journey';
const VERSION = 1;

/**
 * JourneyStore - the de-duplicated journey, kept in the browser between
 * visits. The payload is the export format itself (rows plus headers), so
 * loading goes through the same parser as an upload and the stored file can
 * be exported byte-for-byte. Storage is injected so tests use a Map.
 */
export class JourneyStore {
    constructor({ storage = typeof localStorage !== 'undefined' ? localStorage : null, key = JOURNEY_STORAGE_KEY } = {}) {
        this.storage = storage;
        this.key = key;
    }

    /** @returns {{ version, distanceUnit, headers, rows, sources: Array<{fileName, trips}>, savedAt } | null} */
    load() {
        if (!this.storage) return null;
        try {
            const raw = this.storage.getItem(this.key);
            if (!raw) return null;
            const doc = JSON.parse(raw);
            if (!doc || doc.version !== VERSION || !Array.isArray(doc.rows) || !Array.isArray(doc.headers) || !doc.rows.length) return null;
            return doc;
        } catch {
            return null;
        }
    }

    /**
     * @param {{ rows: Array, distanceUnit: 'km'|'mi', sources: Array<{fileName, trips}> }} payload
     * @returns {{ ok: boolean, bytes: number, reason?: string }}
     */
    save({ rows, distanceUnit = 'km', sources = [] }) {
        if (!this.storage) return { ok: false, bytes: 0, reason: 'no storage' };
        const doc = { version: VERSION, distanceUnit, headers: exportHeaders(distanceUnit), rows, sources, savedAt: new Date().toISOString() };
        const text = JSON.stringify(doc);
        try {
            this.storage.setItem(this.key, text);
            return { ok: true, bytes: text.length };
        } catch (e) {
            return { ok: false, bytes: text.length, reason: e?.name === 'QuotaExceededError' || /quota/i.test(e?.message ?? '') ? 'quota' : (e?.message ?? 'error') };
        }
    }

    clear() {
        try { this.storage?.removeItem(this.key); } catch { /* nothing to do */ }
    }

    /** Size of the stored document in bytes (UTF-16 code units, close enough for a quota gauge). */
    bytes() {
        try { return this.storage?.getItem(this.key)?.length ?? 0; } catch { return 0; }
    }

    summary() {
        const doc = this.load();
        if (!doc) return null;
        return { trips: doc.rows.length, files: doc.sources?.length ?? 0, distanceUnit: doc.distanceUnit, savedAt: doc.savedAt, bytes: this.bytes(), sources: doc.sources ?? [] };
    }
}
