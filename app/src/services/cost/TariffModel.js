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
export const TARIFF_VERSION = 1;

export const DEFAULT_TARIFF = {
    version: TARIFF_VERSION,
    currency: 'USD',
    mode: 'flat',
    flat: { rate: 0.13 },
    tou: {
        defaultRate: 0.16,
        periods: [
            { id: 'offpeak', label: 'Off-peak', rate: 0.08, days: 'all', from: '22:00', to: '07:00' },
            { id: 'midpeak', label: 'Mid-peak', rate: 0.12, days: 'weekday', from: '07:00', to: '16:00' },
            { id: 'peak', label: 'On-peak', rate: 0.2, days: 'weekday', from: '16:00', to: '22:00' },
        ],
    },
    tiered: {
        householdBaselineKwh: 0,
        tiers: [
            { upToKwh: 600, rate: 0.1 },
            { upToKwh: null, rate: 0.15 },
        ],
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

/**
 * Merge a stored/partial tariff over the defaults and clamp every number,
 * so a corrupted localStorage entry can never crash a calculation.
 */
export const normalizeTariff = (raw) => {
    const r = raw && typeof raw === 'object' ? raw : {};
    const d = DEFAULT_TARIFF;
    const periods = Array.isArray(r.tou?.periods) && r.tou.periods.length ? r.tou.periods : d.tou.periods;
    const tiers = Array.isArray(r.tiered?.tiers) && r.tiered.tiers.length ? r.tiered.tiers : d.tiered.tiers;
    return {
        version: TARIFF_VERSION,
        currency: typeof r.currency === 'string' && r.currency ? r.currency : d.currency,
        mode: ['flat', 'tou', 'tiered'].includes(r.mode) ? r.mode : d.mode,
        flat: { rate: num(r.flat?.rate, d.flat.rate, { min: 0, max: 100 }) },
        tou: {
            defaultRate: num(r.tou?.defaultRate, d.tou.defaultRate, { min: 0, max: 100 }),
            periods: periods.slice(0, 8).map((p, i) => ({
                id: typeof p.id === 'string' && p.id ? p.id : `period-${i}`,
                label: typeof p.label === 'string' && p.label ? p.label : `Period ${i + 1}`,
                rate: num(p.rate, d.tou.defaultRate, { min: 0, max: 100 }),
                days: ['all', 'weekday', 'weekend'].includes(p.days) ? p.days : 'all',
                from: time(p.from, '00:00'),
                to: time(p.to, '00:00'),
            })),
        },
        tiered: {
            householdBaselineKwh: num(r.tiered?.householdBaselineKwh, d.tiered.householdBaselineKwh, { min: 0, max: 100000 }),
            tiers: tiers.slice(0, 6).map((t, i, arr) => ({
                upToKwh: i === arr.length - 1 ? null : num(t.upToKwh, 0, { min: 0, max: 1e6 }) || null,
                rate: num(t.rate, d.tiered.tiers[0].rate, { min: 0, max: 100 }),
            })),
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
 * Starting points people can pick and then edit. Rates are rough public
 * figures (2025–2026) and exist to save typing, not to be authoritative.
 */
export const TARIFF_PRESETS = [
    { id: 'flat-usd', label: 'Flat · US average', tariff: { currency: 'USD', mode: 'flat', flat: { rate: 0.16 }, publicCharging: { enabled: true, sharePct: 20, rate: 0.45 } } },
    { id: 'flat-eur', label: 'Flat · EU average', tariff: { currency: 'EUR', mode: 'flat', flat: { rate: 0.28 }, publicCharging: { enabled: true, sharePct: 20, rate: 0.6 } } },
    {
        id: 'tou-ontario',
        label: 'Time of use · Ontario (CAD)',
        tariff: {
            currency: 'CAD',
            mode: 'tou',
            tou: {
                defaultRate: 0.098,
                periods: [
                    { id: 'offpeak', label: 'Off-peak', rate: 0.076, days: 'all', from: '19:00', to: '07:00' },
                    { id: 'midpeak', label: 'Mid-peak', rate: 0.122, days: 'weekday', from: '07:00', to: '11:00' },
                    { id: 'peak', label: 'On-peak', rate: 0.158, days: 'weekday', from: '11:00', to: '17:00' },
                    { id: 'midpeak2', label: 'Mid-peak', rate: 0.122, days: 'weekday', from: '17:00', to: '19:00' },
                ],
            },
            publicCharging: { enabled: true, sharePct: 15, rate: 0.55 },
        },
    },
    {
        id: 'tou-ev-night',
        label: 'Time of use · EV night tariff (GBP)',
        tariff: {
            currency: 'GBP',
            mode: 'tou',
            tou: { defaultRate: 0.27, periods: [{ id: 'night', label: 'EV night rate', rate: 0.085, days: 'all', from: '00:30', to: '05:30' }] },
            publicCharging: { enabled: true, sharePct: 15, rate: 0.75 },
        },
    },
    {
        id: 'tou-sweden',
        label: 'Time of use · Nordic day/night (SEK)',
        tariff: {
            currency: 'SEK',
            mode: 'tou',
            tou: { defaultRate: 2.4, periods: [{ id: 'night', label: 'Night', rate: 1.4, days: 'all', from: '22:00', to: '06:00' }, { id: 'weekend', label: 'Weekend', rate: 1.6, days: 'weekend', from: '00:00', to: '00:00' }] },
            publicCharging: { enabled: true, sharePct: 20, rate: 5.5 },
        },
    },
    {
        id: 'tiered-california',
        label: 'Tiered · baseline + over-baseline (USD)',
        tariff: {
            currency: 'USD',
            mode: 'tiered',
            tiered: { householdBaselineKwh: 350, tiers: [{ upToKwh: 400, rate: 0.31 }, { upToKwh: null, rate: 0.39 }] },
            publicCharging: { enabled: true, sharePct: 20, rate: 0.5 },
        },
    },
];
