/**
 * Small, typed-by-convention preference store on localStorage. Everything
 * here is a convenience (theme, experience level, tariff); the app must
 * render correctly when storage is empty or unavailable.
 */
const STORAGE_KEY = 'polestar-journey-explorer:prefs';

export const EXPERIENCE_LEVELS = [
    { value: 'simple', label: 'Simple', description: 'Plain-language summary of your driving.' },
    { value: 'detailed', label: 'Detailed', description: 'Charts, insights, map and trip table.' },
    { value: 'expert', label: 'Expert', description: 'Pivot builder, distributions, models and data quality.' },
];

export const DEFAULT_PREFERENCES = {
    experienceLevel: 'simple',
    electricityRate: 0.13,
    currency: 'USD',
    homeChargingPercent: 80,
    tariff: null, // see services/cost/TariffModel.js; null until the user saves one
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

export const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', CAD: 'C$', AUD: 'A$', SEK: 'kr', NOK: 'kr', DKK: 'kr', CHF: 'CHF ' };
