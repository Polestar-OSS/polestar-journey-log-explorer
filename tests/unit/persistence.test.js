import { describe, it, expect, beforeEach } from 'vitest';
import { JourneyLogWriter, exportHeaders } from '../../app/src/services/export/JourneyLogWriter.js';
import { JourneyStore } from '../../app/src/services/persistence/JourneyStore.js';
import { MemoryJourneyStorage, LocalStorageJourneyStorage, LEGACY_LOCAL_KEY } from '../../app/src/services/persistence/JourneyStorage.js';
import { processRawRows } from '../../app/src/utils/dataParser.js';
import { HEADERS_KM, SMALL_EXPORT } from '../fixtures/rows.js';

const { data } = processRawRows(SMALL_EXPORT, HEADERS_KM);
const memoryLocal = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };

describe('JourneyLogWriter', () => {
    it('round-trips through the parser with the original columns, newest first', () => {
        const writer = new JourneyLogWriter();
        const rows = writer.toRows(data, 'km');
        expect(Object.keys(rows[0])).toEqual(exportHeaders('km'));
        expect(rows[0]['Start Date'] >= rows.at(-1)['Start Date']).toBe(true);
        const again = processRawRows(rows, exportHeaders('km')).data;
        expect(again).toHaveLength(data.length);
        expect(again.map((t) => [t.startTs, t.distanceKm, t.consumptionKwh, t.socSource])).toEqual(data.map((t) => [t.startTs, t.distanceKm, t.consumptionKwh, t.socSource]));
    });

    it('labels the distance column by unit and writes CSV', () => {
        expect(exportHeaders('mi')[4]).toBe('Distance in Mile');
        const csv = new JourneyLogWriter().toCSV(data.slice(0, 2), 'mi');
        expect(csv.split('\n')[0]).toContain('Distance in Mile');
        expect(csv.split('\n')).toHaveLength(3);
    });
});

describe('JourneyStore', () => {
    let store;
    beforeEach(() => { store = new JourneyStore({ storage: new MemoryJourneyStorage() }); });

    it('saves and loads the export-format payload with sources and a timestamp', async () => {
        const rows = new JourneyLogWriter().toRows(data, 'km');
        const res = await store.save({ rows, distanceUnit: 'km', sources: [{ fileName: 'a.csv', trips: 8 }] });
        expect(res.ok).toBe(true);
        expect(res.bytes).toBeGreaterThan(100);
        const doc = await store.load();
        expect(doc.rows).toHaveLength(8);
        expect(doc.headers).toEqual(exportHeaders('km'));
        expect(doc.sources[0].fileName).toBe('a.csv');
        expect(await store.summary()).toMatchObject({ trips: 8, files: 1, distanceUnit: 'km' });
        await store.clear();
        expect(await store.load()).toBeNull();
    });

    it('works on the localStorage adapter and reports quota failures instead of throwing', async () => {
        const local = new JourneyStore({ storage: new LocalStorageJourneyStorage(memoryLocal()) });
        expect((await local.save({ rows: [{ a: 1 }], distanceUnit: 'mi' })).ok).toBe(true);
        expect((await local.load()).distanceUnit).toBe('mi');
        const full = { getItem: () => null, setItem: () => { const e = new Error('exceeded'); e.name = 'QuotaExceededError'; throw e; }, removeItem: () => {} };
        expect(await new JourneyStore({ storage: new LocalStorageJourneyStorage(full) }).save({ rows: [{}], distanceUnit: 'km' })).toMatchObject({ ok: false, reason: 'quota' });
        const bad = memoryLocal(); bad.setItem(LEGACY_LOCAL_KEY, '{not json');
        expect(await new JourneyStore({ storage: new LocalStorageJourneyStorage(bad) }).load()).toBeNull();
    });
});
