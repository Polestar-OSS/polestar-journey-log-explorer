import { normalizeTariff } from './TariffModel';

const minutesOf = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
};

/**
 * TariffEngine - answers "what does a kWh cost at this moment?" for a
 * tariff. Pure; no dates are created here except from the timestamps it is
 * handed, and weekday/hour are read in local time, which is what a utility
 * bill uses.
 */
export class TariffEngine {
    constructor(tariff) {
        this.tariff = normalizeTariff(tariff);
        this.periods = this.tariff.tou.periods.map((p) => ({ ...p, fromMin: minutesOf(p.from), toMin: minutesOf(p.to) }));
    }

    static minutesOf = minutesOf;

    /** Does [from, to) contain minute-of-day m? A window wraps midnight when to <= from; from === to means all day. */
    static inWindow(m, fromMin, toMin) {
        if (fromMin === toMin) return true;
        if (fromMin < toMin) return m >= fromMin && m < toMin;
        return m >= fromMin || m < toMin;
    }

    static matchesDays(days, date) {
        const dow = date.getDay(); // 0 Sunday
        if (days === 'weekday') return dow >= 1 && dow <= 5;
        if (days === 'weekend') return dow === 0 || dow === 6;
        return true;
    }

    /** The time-of-use period in force at `date`, or the default period. */
    periodAt(date) {
        if (this.tariff.mode !== 'tou') {
            return { id: 'flat', label: this.tariff.mode === 'tiered' ? 'Tiered' : 'Flat', rate: this.tariff.mode === 'flat' ? this.tariff.flat.rate : null };
        }
        const m = date.getHours() * 60 + date.getMinutes();
        const hit = this.periods.find((p) => TariffEngine.matchesDays(p.days, date) && TariffEngine.inWindow(m, p.fromMin, p.toMin));
        return hit ? { id: hit.id, label: hit.label, rate: hit.rate } : { id: 'default', label: 'Standard', rate: this.tariff.tou.defaultRate };
    }

    /** Price per kWh at `date` for flat and time-of-use tariffs (null for tiered, which is volume-based). */
    rateAt(date) {
        return this.periodAt(date).rate;
    }

    /**
     * Cost of `carKwh` in a month under a tiered tariff, with the household's
     * own baseline consumed first so the car lands on the right tier.
     */
    tieredMonthCost(carKwh) {
        const { tiers, householdBaselineKwh } = this.tariff.tiered;
        let remainingBaseline = householdBaselineKwh;
        let remainingCar = carKwh;
        let lower = 0;
        let cost = 0;
        const breakdown = [];
        for (const tier of tiers) {
            const cap = tier.upToKwh === null ? Infinity : tier.upToKwh;
            let room = cap - lower;
            const baselineHere = Math.min(room, remainingBaseline);
            remainingBaseline -= baselineHere;
            room -= baselineHere;
            const carHere = Math.min(room, remainingCar);
            remainingCar -= carHere;
            if (carHere > 0) {
                cost += carHere * tier.rate;
                breakdown.push({ upToKwh: tier.upToKwh, rate: tier.rate, kwh: carHere, cost: carHere * tier.rate });
            }
            lower = cap;
            if (remainingCar <= 0) break;
        }
        return { cost, breakdown };
    }

    /**
     * Average home rate over a recurring daily window, weekday/weekend
     * weighted (5/7, 2/7). Used when there is no session data to place
     * charging in time.
     */
    averageRateInWindow(from, to) {
        if (this.tariff.mode === 'flat') return this.tariff.flat.rate;
        if (this.tariff.mode === 'tiered') return null;
        const fromMin = minutesOf(from);
        const toMin = minutesOf(to);
        let sum = 0;
        let weight = 0;
        // Any week works; only weekday and time-of-day matter
        for (let day = 0; day < 7; day++) {
            const w = day === 0 || day === 6 ? 1 : 1;
            for (let h = 0; h < 24; h++) {
                const m = h * 60 + 30;
                if (!TariffEngine.inWindow(m, fromMin, toMin)) continue;
                const date = new Date(2026, 0, 4 + day, h, 30); // 2026-01-04 is a Sunday
                sum += this.rateAt(date) * w;
                weight += w;
            }
        }
        return weight ? sum / weight : this.tariff.tou.defaultRate;
    }
}
