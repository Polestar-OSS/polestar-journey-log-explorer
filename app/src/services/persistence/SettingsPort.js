import { getAllPreferences, setPreference, DEFAULT_PREFERENCES } from '../../utils/preferences';
import { getTripAnnotations, saveTripAnnotations } from '../../utils/tripAnnotations';

const VERSION = 1;

/**
 * SettingsPort - export and import of everything the user configured:
 * preferences (level, units, tariff, comparison car, fuel price,
 * persistence) and trip notes/tags. A file is plain JSON so it can be
 * inspected, and import only writes keys the app knows.
 */
export class SettingsPort {
    exportSettings() {
        return { version: VERSION, app: 'polestar-journey-log-explorer', exportedAt: new Date().toISOString(), preferences: getAllPreferences(), annotations: getTripAnnotations() };
    }

    exportText() {
        return JSON.stringify(this.exportSettings(), null, 2);
    }

    /** @returns {{ ok: boolean, preferences: number, annotations: number, errors: string[] }} */
    importText(text) {
        let doc;
        try { doc = JSON.parse(text); } catch { return { ok: false, preferences: 0, annotations: 0, errors: ['Not a JSON file'] }; }
        if (!doc || typeof doc !== 'object' || doc.app !== 'polestar-journey-log-explorer') return { ok: false, preferences: 0, annotations: 0, errors: ['Not a settings file from this app'] };
        if (doc.version !== VERSION) return { ok: false, preferences: 0, annotations: 0, errors: [`Unsupported settings version ${doc.version}`] };
        const known = new Set(Object.keys(DEFAULT_PREFERENCES));
        let preferences = 0;
        Object.entries(doc.preferences ?? {}).forEach(([k, v]) => { if (known.has(k)) { setPreference(k, v); preferences += 1; } });
        let annotations = 0;
        if (doc.annotations && typeof doc.annotations === 'object') {
            const clean = Object.fromEntries(Object.entries(doc.annotations).filter(([, v]) => v && typeof v === 'object').map(([k, v]) => [k, { notes: typeof v.notes === 'string' ? v.notes : '', tags: Array.isArray(v.tags) ? v.tags.filter((t) => typeof t === 'string') : [] }]));
            annotations = Object.keys(clean).length;
            saveTripAnnotations({ ...getTripAnnotations(), ...clean });
        }
        return { ok: true, preferences, annotations, errors: [] };
    }
}
