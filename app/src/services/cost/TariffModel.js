/**
 * The tariff a user pays for electricity, everything the cost calculator
 * needs and nothing about the UI. Persisted as-is in preferences.
 *
 *  mode      'flat'   one price per kWh
 *            'tou'    time-of-use: price depends on weekday and hour
 *            'tiered' price depends on how much the household has used this month
 *
 * Charging is not logged by the car, so the model also carries how the
 * user charges: public share and price, wall-to-battery losses, charger
 * power and the charging strategy, which decide *when* home charging lands
 * on a time-of-use schedule.
 */
export const TARIFF_VERSION = 2;

/** Upper bounds that keep the editor and the engine honest. */
export const LIMITS = { periods: 12, tiers: 6, seasons: 4 };

export const DEFAULT_TARIFF = {
    version: TARIFF_VERSION,
    currency: '', // optional display label ('$', 'EUR', 'kr'); pricing never depends on it
    mode: 'flat',
    /**
     * Optional seasons, as MM-DD ranges (wrapping the year end is fine).
     * Time-of-use periods and tier thresholds may then differ per season.
     * Empty means the same schedule all year.
     */
    seasons: [],
    flat: { rate: 0.13 },
    tou: {
        defaultRate: 0.16,
        periods: [
            { id: 'offpeak', label: 'Off-peak', rate: 0.08, days: 'all', season: 'all', from: '22:00', to: '07:00' },
            { id: 'midpeak', label: 'Mid-peak', rate: 0.12, days: 'weekday', season: 'all', from: '07:00', to: '16:00' },
            { id: 'peak', label: 'On-peak', rate: 0.2, days: 'weekday', season: 'all', from: '16:00', to: '22:00' },
        ],
    },
    tiered: {
        householdBaselineKwh: 0,
        tiers: [
            { upToKwh: 600, rate: 0.1 },
            { upToKwh: null, rate: 0.15 },
        ],
        /** Per-season tier tables, keyed by season id; a season without an entry uses `tiers`. */
        tiersBySeason: {},
    },
    fixedMonthlyFee: 0,
    publicCharging: { enabled: true, sharePct: 20, rate: 0.35 },
    chargingLossPct: 10,
    homeCharger: { powerKw: 7.4, strategy: 'cheapest' }, // 'plugin' | 'cheapest' | 'window'
    homeChargingWindow: { from: '22:00', to: '07:00' },
    batteryUsableKwh: null, // null → use the estimate from the data
};

const num = (v, fallback, { min = -Infinity, max = Infinity } = {}) => {
    const n = typeof v === 'string' ? parseFloat(v) : v;
    if (typeof n !== 'number' || !isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
};

const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;
const time = (v, fallback) => (typeof v === 'string' && TIME_RE.test(v) ? v : fallback);
const MMDD_RE = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const monthDay = (v, fallback) => (typeof v === 'string' && MMDD_RE.test(v) ? v : fallback);
const slug = (v, fallback) => (typeof v === 'string' && /^[a-z0-9][a-z0-9-]{0,31}$/i.test(v) ? v : fallback);

const normalizeTiers = (raw, fallback) => {
    const tiers = Array.isArray(raw) && raw.length ? raw : fallback;
    return tiers.slice(0, LIMITS.tiers).map((t, i, arr) => ({
        upToKwh: i === arr.length - 1 ? null : num(t.upToKwh, 0, { min: 0, max: 1e6 }) || null,
        rate: num(t.rate, fallback[0].rate, { min: 0, max: 100 }),
    }));
};

/**
 * Merge a stored/partial tariff over the defaults and clamp every number,
 * so a corrupted localStorage entry can never crash a calculation.
 */
export const normalizeTariff = (raw) => {
    const r = raw && typeof raw === 'object' ? raw : {};
    const d = DEFAULT_TARIFF;
    const periods = Array.isArray(r.tou?.periods) && r.tou.periods.length ? r.tou.periods : d.tou.periods;
    const seasons = (Array.isArray(r.seasons) ? r.seasons : []).slice(0, LIMITS.seasons).map((x, i) => ({
        id: slug(x?.id, `season-${i + 1}`),
        label: typeof x?.label === 'string' && x.label ? x.label : `Season ${i + 1}`,
        from: monthDay(x?.from, '01-01'),
        to: monthDay(x?.to, '12-31'),
    }));
    const seasonIds = new Set(seasons.map((x) => x.id));
    const tiers = normalizeTiers(r.tiered?.tiers, d.tiered.tiers);
    const tiersBySeason = {};
    if (r.tiered?.tiersBySeason && typeof r.tiered.tiersBySeason === 'object') {
        Object.entries(r.tiered.tiersBySeason).forEach(([id, list]) => {
            if (seasonIds.has(id) && Array.isArray(list) && list.length) tiersBySeason[id] = normalizeTiers(list, tiers);
        });
    }
    return {
        version: TARIFF_VERSION,
        currency: typeof r.currency === 'string' ? r.currency.trim().slice(0, 8) : '',
        mode: ['flat', 'tou', 'tiered'].includes(r.mode) ? r.mode : d.mode,
        seasons,
        flat: { rate: num(r.flat?.rate, d.flat.rate, { min: 0, max: 100 }) },
        tou: {
            defaultRate: num(r.tou?.defaultRate, d.tou.defaultRate, { min: 0, max: 100 }),
            periods: periods.slice(0, LIMITS.periods).map((p, i) => ({
                id: typeof p.id === 'string' && p.id ? p.id : `period-${i}`,
                label: typeof p.label === 'string' && p.label ? p.label : `Period ${i + 1}`,
                rate: num(p.rate, d.tou.defaultRate, { min: 0, max: 100 }),
                days: ['all', 'weekday', 'weekend'].includes(p.days) ? p.days : 'all',
                season: seasonIds.has(p.season) ? p.season : 'all',
                from: time(p.from, '00:00'),
                to: time(p.to, '00:00'),
            })),
        },
        tiered: {
            householdBaselineKwh: num(r.tiered?.householdBaselineKwh, d.tiered.householdBaselineKwh, { min: 0, max: 100000 }),
            tiers,
            tiersBySeason,
        },
        fixedMonthlyFee: num(r.fixedMonthlyFee, d.fixedMonthlyFee, { min: 0, max: 1e5 }),
        publicCharging: {
            enabled: r.publicCharging?.enabled !== false,
            sharePct: num(r.publicCharging?.sharePct, d.publicCharging.sharePct, { min: 0, max: 100 }),
            rate: num(r.publicCharging?.rate, d.publicCharging.rate, { min: 0, max: 100 }),
        },
        chargingLossPct: num(r.chargingLossPct, d.chargingLossPct, { min: 0, max: 50 }),
        homeCharger: {
            powerKw: num(r.homeCharger?.powerKw, d.homeCharger.powerKw, { min: 0.5, max: 350 }),
            strategy: ['plugin', 'cheapest', 'window'].includes(r.homeCharger?.strategy) ? r.homeCharger.strategy : d.homeCharger.strategy,
        },
        homeChargingWindow: {
            from: time(r.homeChargingWindow?.from, d.homeChargingWindow.from),
            to: time(r.homeChargingWindow?.to, d.homeChargingWindow.to),
        },
        batteryUsableKwh: r.batteryUsableKwh === null || r.batteryUsableKwh === undefined || r.batteryUsableKwh === '' ? null : num(r.batteryUsableKwh, null, { min: 10, max: 300 }),
    };
};

/**
 * Display helper: the label to print before an amount. Known ISO codes map
 * to a symbol; anything else is printed as typed; empty prints nothing.
 */
export const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', CAD: 'C$', AUD: 'A$', SEK: 'kr ', NOK: 'kr ', DKK: 'kr ', CHF: 'CHF ', BRL: 'R$', JPY: '¥', INR: '₹', PLN: 'zł ', CZK: 'Kč ' };
export const currencyPrefix = (currency) => {
    if (!currency) return '';
    const upper = currency.toUpperCase();
    return CURRENCY_SYMBOLS[upper] ?? (/^[A-Z]{3}$/.test(upper) ? `${upper} ` : currency);
};

