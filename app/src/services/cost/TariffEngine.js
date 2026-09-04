import { normalizeTariff } from './TariffModel';

const minutesOf = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
};

/** 'MM-DD' → day-of-year-ish ordinal (month * 100 + day) for range checks; leap days need no special case. */
const monthDayOrdinal = (mmdd) => {
    const [mo, d] = mmdd.split('-').map(Number);
    return mo * 100 + d;
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
        this.seasons = this.tariff.seasons.map((x) => ({ ...x, fromOrd: monthDayOrdinal(x.from), toOrd: monthDayOrdinal(x.to) }));
    }

    /** Is the calendar day (ordinal MM*100+DD) inside [from, to], wrapping the year end when to < from? */
    static inSeason(ord, fromOrd, toOrd) {
        if (fromOrd <= toOrd) return ord >= fromOrd && ord <= toOrd;
        return ord >= fromOrd || ord <= toOrd;
    }

    /** The season id in force on `date`, or null when the tariff has no seasons or none matches. */
    seasonAt(date) {
        if (!this.seasons.length) return null;
        const ord = (date.getMonth() + 1) * 100 + date.getDate();
        const hit = this.seasons.find((x) => TariffEngine.inSeason(ord, x.fromOrd, x.toOrd));
        return hit ? hit.id : null;
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
        const season = this.seasonAt(date);
        const hit = this.periods.find((p) => (p.season === 'all' || p.season === season) && TariffEngine.matchesDays(p.days, date) && TariffEngine.inWindow(m, p.fromMin, p.toMin));
        return hit ? { id: hit.id, label: hit.label, rate: hit.rate } : { id: 'default', label: 'Standard', rate: this.tariff.tou.defaultRate };
    }

    /** Price per kWh at `date` for flat and time-of-use tariffs (null for tiered, which is volume-based). */
    rateAt(date) {
        return this.periodAt(date).rate;
    }

    /** The tier table for a month ('YYYY-MM'): the season's own table when it has one, else the default. */
    tiersFor(monthKey) {
        const { tiers, tiersBySeason } = this.tariff.tiered;
        if (!monthKey || !this.seasons.length) return tiers;
        const [y, mo] = monthKey.split('-').map(Number);
        const season = this.seasonAt(new Date(y, mo - 1, 15));
        return (season && tiersBySeason[season]) || tiers;
    }

    /**
     * Cost of `carKwh` in a month under a tiered tariff, with the household's
     * own baseline consumed first so the car lands on the right tier.
     * @param {number} carKwh
     * @param {string} [monthKey] 'YYYY-MM', used to pick seasonal thresholds
     */
    tieredMonthCost(carKwh, monthKey = null) {
        const { householdBaselineKwh } = this.tariff.tiered;
        const tiers = this.tiersFor(monthKey);
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
     * Average home rate over a recurring daily window across a whole year
     * (every weekday, every month, so seasons and weekend rules both count).
     * Used when there is no session data to place charging in time.
     */
    averageRateInWindow(from, to) {
        if (this.tariff.mode === 'flat') return this.tariff.flat.rate;
        if (this.tariff.mode === 'tiered') return null;
        const fromMin = minutesOf(from);
        const toMin = minutesOf(to);
        let sum = 0;
        let count = 0;
        // One full week in each month of a fixed year; only month, weekday and hour matter
        for (let month = 0; month < 12; month++) {
            for (let day = 0; day < 7; day++) {
                for (let h = 0; h < 24; h++) {
                    const m = h * 60 + 30;
                    if (!TariffEngine.inWindow(m, fromMin, toMin)) continue;
                    sum += this.rateAt(new Date(2026, month, 8 + day, h, 30));
                    count++;
                }
            }
        }
        return count ? sum / count : this.tariff.tou.defaultRate;
    }
}
