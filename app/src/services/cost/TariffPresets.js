import { normalizeTariff, LIMITS } from './TariffModel';

/**
 * Tariff presets are data, not code: one JSON file per provider under
 * src/data/tariffs, discovered at build time. This module validates them
 * (so a broken contribution fails `make test`, never the user) and flattens
 * provider → plans into the list the settings panel shows.
 */
const files = import.meta.glob(['../../data/tariffs/*.json', '!**/*.schema.json'], { eager: true, import: 'default' });

const ID_RE = /^[a-z0-9][a-z0-9-]*$/;
const TIME_RE = /^([01]?\d|2[0-3]):[0-5]\d$/;
const MMDD_RE = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/**
 * Structural checks a contributor is likely to get wrong. Returns a list of
 * human-readable problems; empty means the file is usable.
 */
export const validateProvider = (doc, fileName = 'provider') => {
    const errors = [];
    const fail = (msg) => errors.push(`${fileName}: ${msg}`);
    if (!doc || typeof doc !== 'object') return [`${fileName}: not a JSON object`];
    if (!ID_RE.test(doc.id ?? '')) fail('id must be lower-case letters, digits and dashes');
    if (fileName !== 'provider' && doc.id && !fileName.startsWith(doc.id)) fail(`file should be named ${doc.id}.json`);
    ['provider', 'region'].forEach((k) => { if (typeof doc[k] !== 'string' || !doc[k]) fail(`${k} is required`); });
    if (doc.effective && !/^\d{4}-\d{2}-\d{2}$/.test(doc.effective)) fail('effective must be YYYY-MM-DD');
    if (doc.source && !/^https?:\/\//.test(doc.source)) fail('source must be a URL');
    if (!Array.isArray(doc.plans) || !doc.plans.length) { fail('plans must be a non-empty array'); return errors; }
    const planIds = new Set();
    doc.plans.forEach((plan, i) => {
        const where = `plans[${i}]`;
        if (!ID_RE.test(plan?.id ?? '')) fail(`${where}.id must be lower-case letters, digits and dashes`);
        if (planIds.has(plan?.id)) fail(`${where}.id "${plan.id}" is duplicated`);
        planIds.add(plan?.id);
        if (typeof plan?.label !== 'string' || !plan.label) fail(`${where}.label is required`);
        const t = plan?.tariff;
        if (!t || typeof t !== 'object') { fail(`${where}.tariff is required`); return; }
        if (!['flat', 'tou', 'tiered'].includes(t.mode)) fail(`${where}.tariff.mode must be flat, tou or tiered`);
        const seasons = Array.isArray(t.seasons) ? t.seasons : [];
        if (seasons.length > LIMITS.seasons) fail(`${where}: at most ${LIMITS.seasons} seasons`);
        const seasonIds = new Set();
        seasons.forEach((s, j) => {
            if (!ID_RE.test(s?.id ?? '')) fail(`${where}.seasons[${j}].id is invalid`);
            if (!MMDD_RE.test(s?.from ?? '') || !MMDD_RE.test(s?.to ?? '')) fail(`${where}.seasons[${j}] from/to must be MM-DD`);
            seasonIds.add(s?.id);
        });
        if (t.mode === 'tou') {
            const periods = t.tou?.periods;
            if (!Array.isArray(periods) || !periods.length) fail(`${where}.tariff.tou.periods is required for time of use`);
            else {
                if (periods.length > LIMITS.periods) fail(`${where}: at most ${LIMITS.periods} periods`);
                periods.forEach((p, j) => {
                    const at = `${where}.tou.periods[${j}]`;
                    if (typeof p?.rate !== 'number' || p.rate < 0) fail(`${at}.rate must be a non-negative number`);
                    if (!TIME_RE.test(p?.from ?? '') || !TIME_RE.test(p?.to ?? '')) fail(`${at} from/to must be HH:MM`);
                    if (p?.days && !['all', 'weekday', 'weekend'].includes(p.days)) fail(`${at}.days must be all, weekday or weekend`);
                    if (p?.season && p.season !== 'all' && !seasonIds.has(p.season)) fail(`${at}.season "${p.season}" is not declared in seasons`);
                });
            }
            if (typeof t.tou?.defaultRate !== 'number') fail(`${where}.tariff.tou.defaultRate is required`);
        }
        if (t.mode === 'tiered') {
            const tiers = t.tiered?.tiers;
            if (!Array.isArray(tiers) || !tiers.length) fail(`${where}.tariff.tiered.tiers is required for tiered`);
            else if (tiers.at(-1).upToKwh !== null) fail(`${where}: the last tier must have upToKwh null`);
            Object.keys(t.tiered?.tiersBySeason ?? {}).forEach((id) => { if (!seasonIds.has(id)) fail(`${where}.tiersBySeason has unknown season "${id}"`); });
        }
        if (t.mode === 'flat' && typeof t.flat?.rate !== 'number') fail(`${where}.tariff.flat.rate is required for flat`);
    });
    return errors;
};

/** Every provider file, sorted with named providers first and generic regions last. */
export const TARIFF_PROVIDERS = Object.entries(files)
    .map(([path, doc]) => ({ ...doc, fileName: path.split('/').pop() }))
    .sort((a, b) => (a.provider === 'Generic') - (b.provider === 'Generic') || a.provider.localeCompare(b.provider) || a.region.localeCompare(b.region));

/** Flat list for pickers: one entry per plan, id = `${provider.id}/${plan.id}`. */
export const TARIFF_PRESETS = TARIFF_PROVIDERS.flatMap((prov) =>
    prov.plans.map((plan) => ({
        id: `${prov.id}/${plan.id}`,
        label: plan.label,
        description: plan.description ?? '',
        group: prov.provider === 'Generic' ? prov.region : `${prov.provider} · ${prov.region}`,
        provider: prov.provider,
        region: prov.region,
        source: prov.source ?? null,
        effective: prov.effective ?? null,
        notes: prov.notes ?? '',
        tariff: normalizeTariff({ currency: prov.currency, ...plan.tariff }),
    }))
);

export const findPreset = (id) => TARIFF_PRESETS.find((p) => p.id === id) ?? null;

/** Picker data grouped by provider, in the shape Mantine's Select expects. */
export const presetGroups = () => {
    const groups = new Map();
    TARIFF_PRESETS.forEach((p) => {
        if (!groups.has(p.group)) groups.set(p.group, []);
        groups.get(p.group).push({ value: p.id, label: p.label });
    });
    return [...groups.entries()].map(([group, items]) => ({ group, items }));
};
