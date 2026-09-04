import { describe, it, expect } from 'vitest';
import { normalizeTariff, DEFAULT_TARIFF, TARIFF_PRESETS } from '../../app/src/services/cost/TariffModel.js';
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

    it('ships presets that all normalise cleanly', () => {
        TARIFF_PRESETS.forEach((p) => expect(normalizeTariff(p.tariff).currency).toBe(p.tariff.currency));
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
