import { describe, it, expect } from 'vitest';
import { normalizeTariff, DEFAULT_TARIFF, currencyPrefix } from '../../app/src/services/cost/TariffModel.js';
import { TARIFF_PRESETS, TARIFF_PROVIDERS, validateProvider, findPreset, searchPresets, presetGroups, presetFuelPrice } from '../../app/src/services/cost/TariffPresets.js';
import { TariffEngine } from '../../app/src/services/cost/TariffEngine.js';
import { ChargingSessionAllocator } from '../../app/src/services/cost/ChargingSessionAllocator.js';
import { CostCalculator } from '../../app/src/services/cost/CostCalculator.js';
import { processRawRows } from '../../app/src/utils/dataParser.js';
import { HEADERS_KM, SMALL_EXPORT, row } from '../fixtures/rows.js';

const { data } = processRawRows(SMALL_EXPORT, HEADERS_KM);

describe('normalizeTariff', () => {
    it('fills defaults and clamps garbage', () => {
        const t = normalizeTariff({ mode: 'nope', flat: { rate: '-3' }, publicCharging: { sharePct: 250 }, chargingLossPct: 'x', tou: { periods: [{ from: '25:00', rate: 0.1 }] } });
        expect(t.mode).toBe('flat');
        expect(t.flat.rate).toBe(0);
        expect(t.publicCharging.sharePct).toBe(100);
        expect(t.chargingLossPct).toBe(DEFAULT_TARIFF.chargingLossPct);
        expect(t.tou.periods[0]).toMatchObject({ from: '00:00', to: '00:00', rate: 0.1, days: 'all' });
        expect(normalizeTariff(null)).toEqual(normalizeTariff(DEFAULT_TARIFF));
    });

    it('forces the last tier to be open-ended', () => {
        const t = normalizeTariff({ tiered: { tiers: [{ upToKwh: 100, rate: 0.1 }, { upToKwh: 500, rate: 0.2 }] } });
        expect(t.tiered.tiers.map((x) => x.upToKwh)).toEqual([100, null]);
    });

    it('keeps the currency as a free-form display label', () => {
        expect(normalizeTariff({ currency: 'R$' }).currency).toBe('R$');
        expect(normalizeTariff({ currency: 42 }).currency).toBe('');
        expect(currencyPrefix('')).toBe('');
        expect(currencyPrefix('usd')).toBe('$');
        expect(currencyPrefix('BRL')).toBe('R$');
        expect(currencyPrefix('XYZ')).toBe('XYZ ');
        expect(currencyPrefix('kr')).toBe('kr');
    });

    it('normalises seasons and per-season tiers, dropping references to unknown seasons', () => {
        const t = normalizeTariff({
            seasons: [{ id: 'summer', label: 'Summer', from: '05-01', to: '10-31' }, { id: 'bad id', from: 'nope', to: '13-99' }],
            tou: { periods: [{ rate: 0.1, season: 'summer' }, { rate: 0.2, season: 'ghost' }] },
            tiered: { tiers: [{ upToKwh: 600, rate: 0.1 }, { upToKwh: null, rate: 0.2 }], tiersBySeason: { summer: [{ upToKwh: 300, rate: 0.1 }, { upToKwh: null, rate: 0.2 }], ghost: [] } },
        });
        expect(t.seasons.map((x) => x.id)).toEqual(['summer', 'season-2']);
        expect(t.seasons[1]).toMatchObject({ from: '01-01', to: '12-31' });
        expect(t.tou.periods.map((p) => p.season)).toEqual(['summer', 'all']);
        expect(Object.keys(t.tiered.tiersBySeason)).toEqual(['summer']);
    });
});

describe('tariff presets (src/data/tariffs)', () => {
    it('validates every provider file', () => {
        expect(TARIFF_PROVIDERS.length).toBeGreaterThan(0);
        TARIFF_PROVIDERS.forEach((prov) => expect(validateProvider(prov, prov.fileName)).toEqual([]));
    });

    it('flattens plans with provider-qualified ids and normalised tariffs', () => {
        const ids = TARIFF_PRESETS.map((p) => p.id);
        expect(new Set(ids).size).toBe(ids.length);
        expect(findPreset('hydro-ottawa/tou').tariff.seasons).toHaveLength(2);
        expect(findPreset('hydro-ottawa/tiered').tariff.tiered.tiersBySeason.winter[0].upToKwh).toBe(1000);
        expect(findPreset('nope')).toBeNull();
    });

    it('searches provider, region, plan and mode words locally', () => {
        expect(searchPresets('ottawa').map((p) => p.id)).toEqual(['hydro-ottawa/tou', 'hydro-ottawa/ulo', 'hydro-ottawa/tiered']);
        expect(searchPresets('toronto ulo').map((p) => p.id)).toEqual(['toronto-hydro/ulo']);
        expect(searchPresets('texas')).toHaveLength(1);
        expect(searchPresets('canada').length).toBeGreaterThan(10);
        expect(searchPresets('Malmö').map((p) => p.id)).toEqual(['sweden/se4']);
        expect(searchPresets('nothing-here')).toEqual([]);
        expect(searchPresets('')).toHaveLength(TARIFF_PRESETS.length);
        const groups = presetGroups(searchPresets('ottawa'));
        expect(groups).toHaveLength(1);
        expect(groups[0].items[0].label).toBe('Hydro Ottawa · Time of use');
    });

    it('carries sourced pump prices and converts them to the export unit', () => {
        expect(presetFuelPrice(findPreset('hydro-ottawa/tou'))).toBeCloseTo(1.708, 3);
        expect(presetFuelPrice(findPreset('canada/quebec'))).toBeCloseTo(1.874, 3);
        expect(presetFuelPrice(findPreset('usa/texas'), 'mi')).toBeCloseTo(3.618, 3);
        expect(presetFuelPrice(findPreset('usa/texas'), 'km')).toBeCloseTo(3.618 / 3.785411784, 3);
        expect(presetFuelPrice(findPreset('united-kingdom/price-cap'))).toBeCloseTo(1.616, 3);
        expect(presetFuelPrice(findPreset('sweden/national'))).toBeNull();
        expect(validateProvider({ id: 'x', provider: 'X', region: 'Y', fuel: { pricePerLitre: 1 }, plans: [{ id: 'p', label: 'P', tariff: { mode: 'flat', flat: { rate: 0.1 } } }] }).join(' ')).toMatch(/fuel.source/);
    });

    it('lists named providers before generic countries', () => {
        expect(TARIFF_PROVIDERS.map((p) => p.id)).toEqual(['hydro-ottawa', 'toronto-hydro', 'canada', 'european-union', 'sweden', 'united-kingdom', 'usa']);
        expect(findPreset('toronto-hydro/tou').tariff.tou.periods).toEqual(findPreset('hydro-ottawa/tou').tariff.tou.periods);
    });

    it('rejects the mistakes a contributor is likely to make', () => {
        const errors = validateProvider({ id: 'Bad Id', provider: 'X', region: 'Y', plans: [{ id: 'p', label: 'P', tariff: { mode: 'tou', tou: { periods: [{ rate: 0.1, from: '25:00', to: '07:00', season: 'summer' }] } } }] }, 'bad-id.json');
        expect(errors.join('\n')).toMatch(/id must be lower-case/);
        expect(errors.join('\n')).toMatch(/HH:MM/);
        expect(errors.join('\n')).toMatch(/not declared in seasons/);
        expect(errors.join('\n')).toMatch(/defaultRate is required/);
        expect(validateProvider({ id: 'x', provider: 'X', region: 'Y', plans: [{ id: 'p', label: 'P', tariff: { mode: 'tiered', tiered: { tiers: [{ upToKwh: 100, rate: 0.1 }] } } }] }).join(' ')).toMatch(/last tier/);
    });

    it('prices Ontario time of use with the right season, weekday and hour', () => {
        const engine = new TariffEngine(findPreset('hydro-ottawa/tou').tariff);
        expect(engine.rateAt(new Date(2026, 6, 15, 12, 0))).toBe(0.203); // July weekday noon: summer on-peak
        expect(engine.rateAt(new Date(2026, 6, 15, 8, 0))).toBe(0.157); // July weekday morning: summer mid-peak
        expect(engine.rateAt(new Date(2026, 0, 14, 8, 0))).toBe(0.203); // January weekday morning: winter on-peak
        expect(engine.rateAt(new Date(2026, 0, 14, 12, 0))).toBe(0.157); // January weekday noon: winter mid-peak
        expect(engine.rateAt(new Date(2026, 0, 17, 12, 0))).toBe(0.098); // Saturday: off-peak all day
        expect(engine.rateAt(new Date(2026, 0, 14, 22, 0))).toBe(0.098); // weekday night
        expect(engine.seasonAt(new Date(2026, 3, 30))).toBe('winter');
        expect(engine.seasonAt(new Date(2026, 4, 1))).toBe('summer');
    });

    it('applies the winter threshold to winter months of the tiered plan', () => {
        const engine = new TariffEngine(findPreset('hydro-ottawa/tiered').tariff);
        expect(engine.tiersFor('2026-01')[0].upToKwh).toBe(1000);
        expect(engine.tiersFor('2026-07')[0].upToKwh).toBe(600);
        // 800 kWh in a month: all tier 1 in winter, 600 + 200 in summer
        expect(engine.tieredMonthCost(800, '2026-01').cost).toBeCloseTo(800 * 0.12, 4);
        expect(engine.tieredMonthCost(800, '2026-07').cost).toBeCloseTo(600 * 0.12 + 200 * 0.142, 4);
    });

    it('prices the ultra-low overnight plan cheapest at night and dearest at the evening peak', () => {
        const engine = new TariffEngine(findPreset('hydro-ottawa/ulo').tariff);
        expect(engine.rateAt(new Date(2026, 2, 3, 2, 0))).toBe(0.039);
        expect(engine.rateAt(new Date(2026, 2, 3, 18, 0))).toBe(0.391);
        expect(engine.rateAt(new Date(2026, 2, 7, 18, 0))).toBe(0.098); // Saturday evening
        expect(engine.averageRateInWindow('23:00', '07:00')).toBeCloseTo(0.039, 5);
    });
});

describe('TariffEngine', () => {
    const engine = new TariffEngine({ mode: 'tou' }); // default schedule: off-peak 22–07 all days, mid 07–16 wd, peak 16–22 wd

    it('handles windows that wrap midnight and weekday/weekend rules', () => {
        expect(engine.periodAt(new Date(2026, 0, 5, 23, 0)).id).toBe('offpeak'); // Monday night
        expect(engine.periodAt(new Date(2026, 0, 6, 3, 0)).id).toBe('offpeak'); // Tuesday early
        expect(engine.periodAt(new Date(2026, 0, 6, 8, 0)).id).toBe('midpeak');
        expect(engine.periodAt(new Date(2026, 0, 6, 18, 0)).id).toBe('peak');
        expect(engine.periodAt(new Date(2026, 0, 10, 18, 0)).id).toBe('default'); // Saturday: no weekday period matches
        expect(engine.rateAt(new Date(2026, 0, 10, 18, 0))).toBe(0.16);
    });

    it('returns the flat rate regardless of time', () => {
        const flat = new TariffEngine({ mode: 'flat', flat: { rate: 0.2 } });
        expect(flat.rateAt(new Date(2026, 0, 5, 18, 0))).toBe(0.2);
        expect(flat.periodAt(new Date()).label).toBe('Flat');
    });

    it('prices tiers with the household baseline first', () => {
        const tiered = new TariffEngine({ mode: 'tiered', tiered: { householdBaselineKwh: 350, tiers: [{ upToKwh: 400, rate: 0.1 }, { upToKwh: null, rate: 0.2 }] } });
        const { cost, breakdown } = tiered.tieredMonthCost(100);
        // 50 kWh left in tier 1 at 0.1, 50 kWh in tier 2 at 0.2
        expect(cost).toBeCloseTo(15);
        expect(breakdown.map((b) => b.kwh)).toEqual([50, 50]);
    });

    it('averages a window across the week', () => {
        const avg = engine.averageRateInWindow('22:00', '07:00');
        expect(avg).toBeCloseTo(0.08, 5); // entirely off-peak every day
        expect(engine.averageRateInWindow('07:00', '16:00')).toBeGreaterThan(0.08);
    });
});

describe('ChargingSessionAllocator', () => {
    const engine = new TariffEngine({ mode: 'tou' });
    const session = { startTs: new Date(2026, 0, 5, 18, 0).getTime(), endTs: new Date(2026, 0, 6, 7, 30).getTime(), kwh: 20 }; // Mon 18:00 → Tue 07:30

    it('accounts for wall losses', () => {
        expect(new ChargingSessionAllocator({ lossPct: 10 }).wallEnergy(9)).toBeCloseTo(10);
    });

    it('plug-in strategy charges immediately at peak', () => {
        const slots = new ChargingSessionAllocator({ powerKw: 7.4, strategy: 'plugin', lossPct: 0 }).allocate(session, engine);
        expect(slots[0].periodId).toBe('peak');
        expect(slots.reduce((s, x) => s + x.kwh, 0)).toBeCloseTo(20);
    });

    it('cheapest strategy moves everything to off-peak', () => {
        const slots = new ChargingSessionAllocator({ powerKw: 7.4, strategy: 'cheapest', lossPct: 0 }).allocate(session, engine);
        expect(slots.every((s) => s.periodId === 'offpeak')).toBe(true);
        expect(slots.reduce((s, x) => s + x.kwh, 0)).toBeCloseTo(20);
    });

    it('window strategy prefers the configured window even when not the cheapest', () => {
        const slots = new ChargingSessionAllocator({ powerKw: 7.4, strategy: 'window', window: { from: '18:00', to: '20:00' }, lossPct: 0 }).allocate({ ...session, kwh: 10 }, engine);
        expect(slots.map((s) => new Date(s.ts).getHours())).toEqual([18, 19]);
    });

    it('spreads the remainder when the charger is too slow for the gap', () => {
        const short = { startTs: new Date(2026, 0, 5, 23, 0).getTime(), endTs: new Date(2026, 0, 6, 1, 0).getTime(), kwh: 30 };
        const slots = new ChargingSessionAllocator({ powerKw: 7.4, strategy: 'plugin', lossPct: 0 }).allocate(short, engine);
        expect(slots.reduce((s, x) => s + x.kwh, 0)).toBeCloseTo(30);
        expect(slots).toHaveLength(2);
    });
});

describe('CostCalculator', () => {
    it('prices a flat tariff with public share and losses', () => {
        const calc = new CostCalculator({ mode: 'flat', flat: { rate: 0.2 }, publicCharging: { enabled: true, sharePct: 50, rate: 0.5 }, chargingLossPct: 10 });
        const r = calc.compute(data);
        expect(r.energy.driven).toBeCloseTo(11.4, 1);
        expect(r.energy.public).toBeCloseTo(5.7, 1);
        expect(r.energy.homeWall).toBeCloseTo(5.7 / 0.9, 1);
        expect(r.cost.public).toBeCloseTo(2.85, 2);
        expect(r.cost.home).toBeCloseTo((5.7 / 0.9) * 0.2, 2);
        expect(r.cost.total).toBeCloseTo(r.cost.home + r.cost.public, 2);
        expect(r.method).toBe('proportional');
        expect(r.byMonth.map((m) => m.key)).toEqual(['2026-01', '2026-07']);
        expect(r.costPer100).toBeCloseTo((r.cost.total / 51.3) * 100, 1);
    });

    it('uses inferred sessions for time-of-use and reconciles to consumption', () => {
        const calc = new CostCalculator({ mode: 'tou', publicCharging: { enabled: false }, chargingLossPct: 0, homeCharger: { powerKw: 7.4, strategy: 'cheapest' } });
        const r = calc.compute(data, { usableKwh: 79 });
        expect(r.method).toBe('sessions');
        expect(r.sessionsUsed).toBe(3);
        expect(r.energy.homeWall).toBeCloseTo(11.4, 1);
        expect(r.byPeriod.reduce((s, p) => s + p.kwh, 0)).toBeCloseTo(11.4, 0);
        expect(r.byPeriod.find((p) => p.id === 'offpeak')).toBeTruthy();
        expect(r.cost.total).toBeCloseTo(11.4 * 0.08, 1); // everything moved to off-peak
    });

    it('falls back to the window average when SOC is missing', () => {
        const noSoc = processRawRows(SMALL_EXPORT.map((r) => ({ ...r, 'SOC Source': 0, 'SOC Destination': 0 })), HEADERS_KM).data;
        const r = new CostCalculator({ mode: 'tou', publicCharging: { enabled: false }, chargingLossPct: 0 }).compute(noSoc);
        expect(r.method).toBe('proportional');
        expect(r.cost.total).toBeCloseTo(11.4 * 0.08, 2);
        expect(r.assumptions.join(' ')).toMatch(/average rate/);
    });

    it('prices a tiered tariff month by month', () => {
        const calc = new CostCalculator({ mode: 'tiered', publicCharging: { enabled: false }, chargingLossPct: 0, tiered: { householdBaselineKwh: 0, tiers: [{ upToKwh: 5, rate: 0.1 }, { upToKwh: null, rate: 0.3 }] } });
        const r = calc.compute(data);
        expect(r.method).toBe('tiered');
        // January 7.2 kWh: 5 at 0.1 + 2.2 at 0.3; July 4.2 kWh: 4.2 at 0.1
        expect(r.byMonth[0].cost).toBeCloseTo(0.5 + 0.66, 2);
        expect(r.byMonth[1].cost).toBeCloseTo(0.42, 2);
    });

    it('returns an empty result for no trips', () => {
        expect(new CostCalculator().compute([]).cost.total).toBe(0);
    });

    it('sizes sessions with the configured battery when set', () => {
        const trips = processRawRows([
            row({ start: '2026-03-02, 08:00', end: '2026-03-02, 08:30', km: 20, kwh: 4, socStart: 80, socEnd: 75, odo: 2000 }),
            row({ start: '2026-03-01, 18:00', end: '2026-03-01, 18:30', km: 20, kwh: 4, socStart: 60, socEnd: 55, odo: 1000 }),
        ], HEADERS_KM).data;
        const sessions = CostCalculator.sessionsFrom(trips, 100);
        expect(sessions).toHaveLength(1);
        expect(sessions[0]).toMatchObject({ gainPct: 25, kwh: 25 });
    });
});
