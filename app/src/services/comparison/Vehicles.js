/**
 * Comparison vehicles are data files, one per make, under src/data/vehicles.
 * Every file is validated in the unit suite so a contribution with a made-up
 * number or a missing source fails CI rather than reaching a user.
 */
const files = import.meta.glob(['../../data/vehicles/*.json', '!**/*.schema.json'], { eager: true, import: 'default' });

const ID_RE = /^[a-z0-9][a-z0-9-]*$/;
const POWERTRAINS = ['petrol', 'mild-hybrid-petrol', 'hybrid', 'plug-in-hybrid', 'diesel'];

export const validateMake = (doc, fileName = 'make') => {
    const errors = [];
    const fail = (m) => errors.push(`${fileName}: ${m}`);
    if (!doc || typeof doc !== 'object') return [`${fileName}: not a JSON object`];
    if (typeof doc.make !== 'string' || !doc.make) fail('make is required');
    if (!/^https?:\/\//.test(doc.source ?? '')) fail('source must be the URL of the official database the figures come from');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(doc.retrieved ?? '')) fail('retrieved must be YYYY-MM-DD');
    if (!Array.isArray(doc.vehicles) || !doc.vehicles.length) { fail('vehicles must be a non-empty array'); return errors; }
    const ids = new Set();
    doc.vehicles.forEach((v, i) => {
        const at = `vehicles[${i}]`;
        if (!ID_RE.test(v?.id ?? '')) fail(`${at}.id is invalid`);
        if (ids.has(v?.id)) fail(`${at}.id "${v.id}" is duplicated`);
        ids.add(v?.id);
        ['make', 'model', 'trim'].forEach((k) => { if (typeof v?.[k] !== 'string' || !v[k]) fail(`${at}.${k} is required`); });
        if (!Number.isInteger(v?.year)) fail(`${at}.year must be an integer`);
        if (!POWERTRAINS.includes(v?.powertrain)) fail(`${at}.powertrain must be one of ${POWERTRAINS.join(', ')}`);
        if (!(v?.mpg?.combined > 0)) fail(`${at}.mpg.combined must be a positive number`);
        if (!(v?.lPer100km > 0)) fail(`${at}.lPer100km must be a positive number`);
        if (!(v?.co2GPerKm >= 0)) fail(`${at}.co2GPerKm must be a number`);
        if (v?.powertrain === 'plug-in-hybrid') {
            if (!(v?.electric?.kwhPer100km > 0) || !(v?.electric?.rangeKm > 0)) fail(`${at}.electric.kwhPer100km and rangeKm are required for a plug-in hybrid`);
        }
    });
    return errors;
};

export const VEHICLE_MAKES = Object.entries(files).map(([path, doc]) => ({ ...doc, fileName: path.split('/').pop() })).sort((a, b) => a.make.localeCompare(b.make));

export const POWERTRAIN_LABELS = { petrol: 'petrol', 'mild-hybrid-petrol': 'mild hybrid petrol', hybrid: 'hybrid', 'plug-in-hybrid': 'plug-in hybrid', diesel: 'diesel' };

/** Every vehicle across makes, newest year first within a model, with a display label. */
export const VEHICLES = VEHICLE_MAKES.flatMap((doc) =>
    doc.vehicles.map((v) => ({
        ...v,
        makeSource: doc.source,
        retrieved: doc.retrieved,
        label: `${v.year} ${v.make} ${v.model} ${v.trim}`,
        shortLabel: `${v.model} ${v.trim} (${v.year})`,
        powertrainLabel: POWERTRAIN_LABELS[v.powertrain] ?? v.powertrain,
    }))
).sort((a, b) => a.make.localeCompare(b.make) || a.model.localeCompare(b.model) || b.year - a.year || a.trim.localeCompare(b.trim));

export const findVehicle = (id) => VEHICLES.find((v) => v.id === id) ?? null;

/** The comparator used until the user picks one: the most recent Volvo XC60 mild hybrid, the closest sibling to a Polestar 2. */
export const DEFAULT_VEHICLE_ID = (VEHICLES.find((v) => v.model === 'XC60' && v.powertrain === 'mild-hybrid-petrol') ?? VEHICLES[0])?.id ?? null;

/** Picker data grouped by make and model, in the shape Mantine's Select expects. */
export const vehicleGroups = () => {
    const groups = new Map();
    VEHICLES.forEach((v) => {
        const key = `${v.make} ${v.model}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push({ value: v.id, label: `${v.year} ${v.trim} · ${v.powertrainLabel}` });
    });
    return [...groups.entries()].map(([group, items]) => ({ group, items }));
};
