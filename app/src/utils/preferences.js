/**
 * Small, typed-by-convention preference store on localStorage. Everything
 * here is a convenience (theme, experience level, tariff); the app must
 * render correctly when storage is empty or unavailable.
 */
export const PREFERENCES_STORAGE_KEY = 'polestar-journey-explorer:prefs';
const STORAGE_KEY = PREFERENCES_STORAGE_KEY;

export const EXPERIENCE_LEVELS = [
    { value: 'simple', label: 'Simple', description: 'Plain-language summary of your driving.' },
    { value: 'detailed', label: 'Detailed', description: 'Charts, insights, map and trip table.' },
    { value: 'expert', label: 'Expert', description: 'Pivot builder, distributions, models and data quality.' },
];

export const DEFAULT_PREFERENCES = {
    experienceLevel: 'simple',
    unitSystem: 'metric', // display units; the export's own unit is converted at the app boundary
    persistJourney: true, // keep the de-duplicated journey in localStorage between visits (services/persistence/JourneyStore)
    electricityRate: 0.13,
    currency: '',
    homeChargingPercent: 80,
    tariff: null, // see services/cost/TariffModel.js; null until the user saves one
    comparisonVehicleId: null, // services/comparison/Vehicles.js id; null → DEFAULT_VEHICLE_ID
    fuelPrice: null, // per litre (km) or per US gallon (mi); null → costs not stated
};

const readAll = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) } : { ...DEFAULT_PREFERENCES };
    } catch {
        return { ...DEFAULT_PREFERENCES };
    }
};

export const getPreference = (key) => readAll()[key];

export const setPreference = (key, value) => {
    try {
        const next = { ...readAll(), [key]: value };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        window.dispatchEvent(new CustomEvent('ps:preferences', { detail: next }));
        return next;
    } catch {
        return { ...readAll(), [key]: value };
    }
};

export const getAllPreferences = readAll;

