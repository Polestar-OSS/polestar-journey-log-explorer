/**
 * Storage adapters for the saved journey. One async contract:
 *   get()      → the stored document or null
 *   set(doc)   → resolves when written, rejects on quota or failure
 *   remove()
 *   bytes()    → size of the stored document, for the gauge
 *
 * IndexedDB is the default: browsers give it hundreds of megabytes where
 * localStorage stops at about five. localStorage is the fallback for
 * browsers that refuse IndexedDB (private windows in some engines), and
 * it is also where the first release kept the journey, so the IndexedDB
 * adapter migrates from it once.
 */
export const DB_NAME = 'polestar-journey-explorer';
export const DB_VERSION = 1;
export const STORE_NAME = 'journey';
export const RECORD_KEY = 'current';
export const LEGACY_LOCAL_KEY = 'polestar-journey-explorer:journey';

const sizeOf = (doc) => (doc ? JSON.stringify(doc).length : 0);

export class MemoryJourneyStorage {
    constructor() { this.doc = null; }
    async get() { return this.doc; }
    async set(doc) { this.doc = doc; }
    async remove() { this.doc = null; }
    async bytes() { return sizeOf(this.doc); }
}

export class LocalStorageJourneyStorage {
    constructor(storage = typeof localStorage !== 'undefined' ? localStorage : null, key = LEGACY_LOCAL_KEY) {
        this.storage = storage;
        this.key = key;
    }
    async get() {
        try { const raw = this.storage?.getItem(this.key); return raw ? JSON.parse(raw) : null; } catch { return null; }
    }
    async set(doc) {
        if (!this.storage) throw new Error('no storage');
        this.storage.setItem(this.key, JSON.stringify(doc)); // throws QuotaExceededError when full
    }
    async remove() { try { this.storage?.removeItem(this.key); } catch { /* nothing */ } }
    async bytes() { try { return this.storage?.getItem(this.key)?.length ?? 0; } catch { return 0; } }
}

export class IndexedDbJourneyStorage {
    constructor({ indexedDB: idb = typeof indexedDB !== 'undefined' ? indexedDB : null, legacy = new LocalStorageJourneyStorage() } = {}) {
        this.idb = idb;
        this.legacy = legacy;
        this.dbPromise = null;
    }

    static available() {
        return typeof indexedDB !== 'undefined' && indexedDB !== null;
    }

    _db() {
        if (!this.idb) return Promise.reject(new Error('IndexedDB unavailable'));
        if (!this.dbPromise) {
            this.dbPromise = new Promise((resolve, reject) => {
                const req = this.idb.open(DB_NAME, DB_VERSION);
                req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE_NAME)) req.result.createObjectStore(STORE_NAME); };
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
                req.onblocked = () => reject(new Error('IndexedDB blocked'));
            });
        }
        return this.dbPromise;
    }

    _tx(mode, work) {
        return this._db().then((db) => new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, mode);
            const req = work(tx.objectStore(STORE_NAME));
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));
            tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
        }));
    }

    async get() {
        const doc = await this._tx('readonly', (s) => s.get(RECORD_KEY));
        if (doc) return doc;
        // First run after the localStorage release: move the journey across
        const old = await this.legacy.get();
        if (old) {
            await this.set(old);
            await this.legacy.remove();
            return old;
        }
        return null;
    }

    async set(doc) { await this._tx('readwrite', (s) => s.put(doc, RECORD_KEY)); }
    async remove() { await this._tx('readwrite', (s) => s.delete(RECORD_KEY)); await this.legacy.remove(); }
    async bytes() { return sizeOf(await this._tx('readonly', (s) => s.get(RECORD_KEY))); }
}

/** The best adapter this browser offers. */
export const defaultJourneyStorage = () => (IndexedDbJourneyStorage.available() ? new IndexedDbJourneyStorage() : new LocalStorageJourneyStorage());
