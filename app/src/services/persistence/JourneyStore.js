import { exportHeaders } from '../export/JourneyLogWriter';
import { defaultJourneyStorage } from './JourneyStorage';

const VERSION = 1;

/**
 * JourneyStore - the de-duplicated journey, kept in the browser between
 * visits. The payload is the export format itself (rows plus headers), so
 * loading goes through the same parser as an upload and the stored file can
 * be exported byte-for-byte. The storage adapter is injected (IndexedDB by
 * default, see JourneyStorage.js); every method is async.
 */
export class JourneyStore {
    constructor({ storage = defaultJourneyStorage() } = {}) {
        this.storage = storage;
    }

    /** @returns {Promise<{ version, distanceUnit, headers, rows, sources: Array<{fileName, trips}>, savedAt } | null>} */
    async load() {
        try {
            const doc = await this.storage.get();
            if (!doc || doc.version !== VERSION || !Array.isArray(doc.rows) || !Array.isArray(doc.headers) || !doc.rows.length) return null;
            return doc;
        } catch {
            return null;
        }
    }

    /**
     * @param {{ rows: Array, distanceUnit: 'km'|'mi', sources: Array<{fileName, trips}> }} payload
     * @returns {Promise<{ ok: boolean, bytes: number, reason?: string }>}
     */
    async save({ rows, distanceUnit = 'km', sources = [] }) {
        const doc = { version: VERSION, distanceUnit, headers: exportHeaders(distanceUnit), rows, sources, savedAt: new Date().toISOString() };
        const bytes = JSON.stringify(doc).length;
        try {
            await this.storage.set(doc);
            return { ok: true, bytes };
        } catch (e) {
            return { ok: false, bytes, reason: e?.name === 'QuotaExceededError' || /quota/i.test(e?.message ?? '') ? 'quota' : (e?.message ?? 'error') };
        }
    }

    async clear() {
        try { await this.storage.remove(); } catch { /* nothing to do */ }
    }

    async summary() {
        const doc = await this.load();
        if (!doc) return null;
        let bytes = 0;
        try { bytes = await this.storage.bytes(); } catch { /* size is cosmetic */ }
        return { trips: doc.rows.length, files: doc.sources?.length ?? 0, distanceUnit: doc.distanceUnit, savedAt: doc.savedAt, bytes, sources: doc.sources ?? [] };
    }
}
