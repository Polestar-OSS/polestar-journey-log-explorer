import { normalizeTariff } from './TariffModel';
import { TariffEngine } from './TariffEngine';
import { ChargingSessionAllocator } from './ChargingSessionAllocator';
import { formatMonthLabel } from '../../utils/journeyDate';

const round = (n, d = 2) => (n === null || n === undefined || !isFinite(n) ? null : Math.round(n * 10 ** d) / 10 ** d);
const DEFAULT_USABLE_KWH = 79;

/**
 * CostCalculator - what the driving in a trip set cost in electricity under
 * a tariff. Orchestrates the tariff engine and the session allocator; owns
 * no pricing logic of its own.
 *
 * Energy accounting:
 *   driven         Σ consumption (what left the battery)
 *   public         driven × public share, priced at the public rate (losses
 *                  are the operator's problem: public prices are per kWh delivered)
 *   home battery   driven × (1 − public share)
 *   home wall      home battery ÷ (1 − loss)   ← what the meter sees
 *
 * Placing home energy in time (needed for time-of-use):
 *   sessions       when SOC data exists, charging sessions are inferred
 *                  between trips; each session's energy is placed by the
 *                  allocator, then all sessions are scaled so they sum to
 *                  the home wall energy (SOC is 1 % coarse, consumption is not)
 *   proportional   otherwise, the average rate of the preferred window
 */
export class CostCalculator {
    constructor(tariff, { distanceUnit = 'km' } = {}) {
        this.tariff = normalizeTariff(tariff);
        this.engine = new TariffEngine(this.tariff);
        this.allocator = new ChargingSessionAllocator({
            powerKw: this.tariff.homeCharger.powerKw,
            strategy: this.tariff.homeCharger.strategy,
            window: this.tariff.homeChargingWindow,
            lossPct: this.tariff.chargingLossPct,
        });
        this.unit = distanceUnit === 'mi' ? 'mi' : 'km';
    }

    /**
     * Charging sessions from SOC rising between consecutive trips.
     * Energy = gain % × usable kWh. Parked window = previous end → next start.
     */
    static sessionsFrom(trips, usableKwh) {
        const dated = trips.filter((t) => t.startTs !== null && t.endTs !== null && (t.socSource > 0 || t.socDestination > 0));
        const sessions = [];
        for (let i = 1; i < dated.length; i++) {
            const prev = dated[i - 1];
            const next = dated[i];
            const gain = next.socSource - prev.socDestination;
            if (gain > 0 && next.startTs > prev.endTs) {
                sessions.push({ startTs: prev.endTs, endTs: next.startTs, gainPct: gain, kwh: (gain / 100) * usableKwh, monthKey: next.monthKey });
            }
        }
        return sessions;
    }

    /**
     * @param {Array} trips
     * @param {{ usableKwh?: number|null }} options - battery size estimate from the data
     */
    compute(trips, { usableKwh = null } = {}) {
        const tariff = this.tariff;
        const driven = trips.reduce((s, t) => s + t.consumptionKwh, 0);
        const distance = trips.reduce((s, t) => s + t.distanceKm, 0);
        if (!trips.length || driven <= 0) return this._empty();

        const publicShare = tariff.publicCharging.enabled ? tariff.publicCharging.sharePct / 100 : 0;
        const publicKwh = driven * publicShare;
        const homeBatteryKwh = driven - publicKwh;
        const homeWallKwh = this.allocator.wallEnergy(homeBatteryKwh);
        const publicCost = publicKwh * tariff.publicCharging.rate;

        const battery = tariff.batteryUsableKwh ?? usableKwh ?? DEFAULT_USABLE_KWH;
        const byMonth = new Map();
        const byPeriod = new Map();
        const addMonth = (key, kwh, cost) => {
            if (!key) return;
            const m = byMonth.get(key) || { key, label: formatMonthLabel(key), kwh: 0, cost: 0 };
            m.kwh += kwh;
            m.cost += cost;
            byMonth.set(key, m);
        };
        const addPeriod = (id, label, rate, kwh, cost) => {
            const p = byPeriod.get(id) || { id, label, rate, kwh: 0, cost: 0 };
            p.kwh += kwh;
            p.cost += cost;
            byPeriod.set(id, p);
        };

        let homeCost = 0;
        let method = 'proportional';
        let sessionsUsed = 0;
        const assumptions = [];
        let tiers = null;

        // Month keys of driving, for spreading energy when sessions are missing
        const drivenByMonth = new Map();
        trips.forEach((t) => { if (t.monthKey) drivenByMonth.set(t.monthKey, (drivenByMonth.get(t.monthKey) || 0) + t.consumptionKwh); });

        if (tariff.mode === 'tiered') {
            // Volume-based: price the car's wall energy month by month
            method = 'tiered';
            drivenByMonth.forEach((kwh, key) => {
                const wall = this.allocator.wallEnergy(kwh * (1 - publicShare));
                const { cost, breakdown } = this.engine.tieredMonthCost(wall, key);
                homeCost += cost;
                addMonth(key, wall, cost);
                breakdown.forEach((b, i) => addPeriod(`tier-${i + 1}`, b.upToKwh === null ? `Top tier` : `Tier ${i + 1} (up to ${b.upToKwh} kWh)`, b.rate, b.kwh, b.cost));
            });
            tiers = tariff.tiered.tiers;
            assumptions.push(`Household baseline of ${tariff.tiered.householdBaselineKwh} kWh/month is consumed before the car.`);
            if (tariff.seasons.length) assumptions.push(`Tier thresholds follow the ${tariff.seasons.map((x) => x.label.toLowerCase()).join(' / ')} seasons.`);
        } else {
            const sessions = CostCalculator.sessionsFrom(trips, battery);
            const sessionKwh = sessions.reduce((s, x) => s + x.kwh, 0);
            if (tariff.mode === 'tou' && sessions.length >= 3 && sessionKwh > 0) {
                method = 'sessions';
                sessionsUsed = sessions.length;
                // Scale inferred session energy to the wall energy implied by consumption
                const scale = homeWallKwh / this.allocator.wallEnergy(sessionKwh);
                sessions.forEach((session) => {
                    const slots = this.allocator.allocate(session, this.engine);
                    slots.forEach((slot) => {
                        const kwh = slot.kwh * scale;
                        const cost = kwh * slot.rate;
                        homeCost += cost;
                        addMonth(session.monthKey, kwh, cost);
                        addPeriod(slot.periodId, slot.periodLabel, slot.rate, kwh, cost);
                    });
                });
                assumptions.push(`${sessions.length} charging sessions inferred from battery level rising between trips; energy placed by the "${tariff.homeCharger.strategy}" strategy at ${tariff.homeCharger.powerKw} kW.`);
            } else {
                const rate = tariff.mode === 'flat' ? tariff.flat.rate : this.engine.averageRateInWindow(tariff.homeChargingWindow.from, tariff.homeChargingWindow.to);
                homeCost = homeWallKwh * rate;
                drivenByMonth.forEach((kwh, key) => {
                    const wall = this.allocator.wallEnergy(kwh * (1 - publicShare));
                    addMonth(key, wall, wall * rate);
                });
                addPeriod(tariff.mode === 'flat' ? 'flat' : 'window', tariff.mode === 'flat' ? 'Flat rate' : `Average in ${tariff.homeChargingWindow.from}–${tariff.homeChargingWindow.to}`, rate, homeWallKwh, homeCost);
                if (tariff.mode === 'tou') assumptions.push('No usable charging sessions in the data, so home charging is priced at the average rate of the preferred window.');
            }
        }

        if (publicKwh > 0) {
            addPeriod('public', 'Public charging', tariff.publicCharging.rate, publicKwh, publicCost);
            // Spread public energy over months in proportion to driving
            drivenByMonth.forEach((kwh, key) => addMonth(key, kwh * publicShare, kwh * publicShare * tariff.publicCharging.rate));
        }
        if (tariff.chargingLossPct > 0) assumptions.push(`${tariff.chargingLossPct}% wall-to-battery loss on home charging.`);
        if (tariff.batteryUsableKwh === null && tariff.mode === 'tou') assumptions.push(`Battery size ${round(battery, 0)} kWh${usableKwh ? ' (estimated from your trips)' : ' (default)'} used to size sessions.`);

        const total = homeCost + publicCost;
        const months = [...byMonth.values()].sort((a, b) => a.key.localeCompare(b.key)).map((m) => ({ ...m, kwh: round(m.kwh, 1), cost: round(m.cost, 2) }));
        const periods = [...byPeriod.values()].map((p) => ({ ...p, kwh: round(p.kwh, 1), cost: round(p.cost, 2), sharePct: total > 0 ? round((p.cost / total) * 100, 1) : 0 }));
        const monthsSpan = months.length;

        return {
            currency: tariff.currency,
            mode: tariff.mode,
            method,
            sessionsUsed,
            energy: { driven: round(driven, 1), homeBattery: round(homeBatteryKwh, 1), homeWall: round(homeWallKwh, 1), public: round(publicKwh, 1) },
            cost: { home: round(homeCost), public: round(publicCost), total: round(total), fixedFees: round(tariff.fixedMonthlyFee * monthsSpan) },
            effectiveRatePerKwh: round(total / driven, 3),
            costPer100: distance > 0 ? round((total / distance) * 100) : null,
            costPerTrip: round(total / trips.length),
            costPerMonth: monthsSpan ? round(total / monthsSpan) : null,
            byMonth: months,
            byPeriod: periods,
            tiers,
            assumptions,
            unit: this.unit,
        };
    }

    _empty() {
        return { currency: this.tariff.currency, mode: this.tariff.mode, method: 'none', sessionsUsed: 0, energy: { driven: 0, homeBattery: 0, homeWall: 0, public: 0 }, cost: { home: 0, public: 0, total: 0, fixedFees: 0 }, effectiveRatePerKwh: null, costPer100: null, costPerTrip: null, costPerMonth: null, byMonth: [], byPeriod: [], tiers: null, assumptions: [], unit: this.unit };
    }
}
