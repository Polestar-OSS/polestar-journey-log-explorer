import { currencyPrefix } from '../cost/TariffModel';

const KM_PER_MILE = 1.60934;
const round = (n, d = 0) => (n === null || n === undefined || !isFinite(n) ? null : Math.round(n * 10 ** d) / 10 ** d);

/**
 * Distances people can picture, in km. Picked so that most journeys land
 * within 0.7–1.4× of one of them.
 */
const DISTANCE_REFERENCES = [
    { km: 42.195, singular: 'a marathon', plural: 'marathons' },
    { km: 343, singular: 'London to Paris', plural: null },
    { km: 500, singular: 'Gothenburg to Stockholm', plural: null },
    { km: 1_000, singular: 'Berlin to Rome', plural: null },
    { km: 1_500, singular: 'Paris to Madrid', plural: null },
    { km: 2_500, singular: 'Lisbon to Warsaw', plural: null },
    { km: 4_000, singular: 'New York to Los Angeles', plural: null },
    { km: 5_500, singular: 'Halifax to Vancouver', plural: null },
    { km: 8_000, singular: 'Nordkapp to Cape Town, one fifth of the way', plural: null },
    { km: 12_000, singular: 'London to Sydney, as the crow flies', plural: null },
    { km: 20_000, singular: 'half the way around the equator', plural: null },
    { km: 40_075, singular: 'once around the equator', plural: 'times around the equator' },
];

const HOME_KWH_PER_DAY = 12; // typical European household, rough
const PHONE_CHARGE_KWH = 0.015;
const FLIGHT_LONDON_PARIS_KG = 80; // economy, one way, rough

/**
 * A distance in km turned into a comparison sentence fragment.
 * "about 1.5 marathons", "roughly Berlin to Rome", "1.2 times around the equator".
 */
export const describeDistance = (km) => {
    if (!(km > 0)) return null;
    if (km >= 40_075 * 0.9) {
        const laps = km / 40_075;
        return laps < 1.5 ? 'once around the equator' : `${round(laps, 1)} times around the equator`;
    }
    const best = DISTANCE_REFERENCES.reduce((b, ref) => (Math.abs(Math.log(km / ref.km)) < Math.abs(Math.log(km / b.km)) ? ref : b));
    const ratio = km / best.km;
    if (ratio >= 0.9 && ratio <= 1.1) return `about ${best.singular}`;
    if (best.plural && ratio > 1.1) return `about ${round(ratio, ratio < 3 ? 1 : 0)} ${best.plural}`;
    if (ratio < 0.9) return `${Math.round(ratio * 100)}% of ${best.singular}`;
    return `${round(ratio, 1)} × ${best.singular}`;
};

export const describeEnergy = (kwh) => {
    if (!(kwh > 0)) return null;
    const days = kwh / HOME_KWH_PER_DAY;
    if (days >= 30) return `roughly ${round(days / 30, 1)} months of a typical household's electricity`;
    if (days >= 2) return `roughly ${Math.round(days)} days of a typical household's electricity`;
    return `about ${Math.round(kwh / PHONE_CHARGE_KWH).toLocaleString()} phone charges`;
};

/**
 * StoryBuilder - turns statistics and insights into plain-language cards
 * for people who do not want to read a chart. Every card is one idea, one
 * number, one comparison. Pure: no formatting components, no side effects.
 */
export class StoryBuilder {
    constructor({ distanceUnit = 'km', electricityRate = 0.13, currency = '', currencySymbol = null, fuelPrice = null } = {}) {
        this.unit = distanceUnit === 'mi' ? 'mi' : 'km';
        this.toKm = this.unit === 'mi' ? KM_PER_MILE : 1;
        this.rate = electricityRate;
        this.currency = currency;
        this.symbol = currencySymbol ?? currencyPrefix(currency);
        this.fuelPrice = fuelPrice; // per litre (km) or per gallon (mi); optional
    }

    build({ statistics, insights, data, cost = null }) {
        if (!statistics || !insights || !data?.length) return [];
        const cards = [];
        const u = this.unit;
        const distance = parseFloat(statistics.totalDistance);
        const energy = parseFloat(statistics.totalConsumption);
        const days = statistics.firstTs && statistics.lastTs ? Math.max(1, Math.round((statistics.lastTs - statistics.firstTs) / 86400000) + 1) : null;
        const weeks = days ? days / 7 : null;
        const perWeek = weeks ? distance / weeks : null;

        // 1. How far
        cards.push({
            id: 'distance',
            tone: 'accent',
            eyebrow: 'How far',
            figure: round(distance),
            unit: u,
            headline: days ? `in ${this._span(days)}.` : 'in this file.',
            body: [
                describeDistance(distance * this.toKm) ? `That is ${describeDistance(distance * this.toKm)}.` : null,
                perWeek ? `About ${round(perWeek)} ${u} a week, across ${statistics.totalTrips.toLocaleString()} trips.` : null,
            ].filter(Boolean).join(' '),
        });

        // 2. How much energy, in words people use
        const perKwh = energy > 0 ? distance / energy : null;
        cards.push({
            id: 'energy',
            eyebrow: 'How much energy',
            figure: round(energy),
            unit: 'kWh',
            headline: perKwh ? `which moved you about ${round(perKwh, 1)} ${u} per kWh.` : '.',
            body: [
                describeEnergy(energy) ? `${describeEnergy(energy)[0].toUpperCase()}${describeEnergy(energy).slice(1)}.` : null,
                `Enthusiasts write it the other way round: ${statistics.avgEfficiency} kWh per 100 ${u}. Lower is better.`,
            ].filter(Boolean).join(' '),
        });

        // 3. What it cost. Prefer a CostCalculator result (tariff-aware);
        // fall back to a flat rate so the card never disappears.
        cards.push(this._costCard({ energy, distance, weeks, cost }));

        // 4. Range on a full charge
        const b = insights.battery;
        if (b?.estimatedRange) {
            const winter = insights.seasonality?.winter?.efficiency;
            const summer = insights.seasonality?.summer?.efficiency;
            const wRange = winter && b.usableKwh ? Math.round((b.usableKwh / winter) * 100) : null;
            const sRange = summer && b.usableKwh ? Math.round((b.usableKwh / summer) * 100) : null;
            cards.push({
                id: 'range',
                eyebrow: 'How far on a full charge',
                figure: round(b.estimatedRange),
                unit: u,
                headline: 'in your usual conditions.',
                body: [
                    wRange && sRange ? `Closer to ${sRange} ${u} in summer and ${wRange} ${u} in winter.` : null,
                    `Charging to 80% gives roughly ${b.rangeAt80} ${u}. Estimated from your own trips, not from a brochure${b.likelyPack ? ` (it looks like a ${b.likelyPack.replace(/ \(.*\)/, '')})` : ''}.`,
                ].filter(Boolean).join(' '),
            });
        }

        // 5. Winter
        const s = insights.seasonality;
        if (s?.winterPenaltyPct !== null && s?.winterPenaltyPct !== undefined) {
            cards.push({
                id: 'winter',
                tone: s.winterPenaltyPct >= 25 ? 'warm' : undefined,
                eyebrow: 'Winter',
                figure: s.winterPenaltyPct > 0 ? `+${s.winterPenaltyPct}%` : `${s.winterPenaltyPct}%`,
                unit: '',
                headline: s.winterPenaltyPct > 0 ? 'more energy per trip in winter than in summer.' : 'difference between winter and summer.',
                body: s.winterPenaltyPct > 0
                    ? 'Heating the cabin and a cold battery are the main reasons. Pre-heating the car while it is still plugged in moves that cost onto the wall socket instead of the battery.'
                    : 'Your winter and summer driving cost about the same, which is unusual and good.',
            });
        }

        // 6. Charging habits
        const c = insights.charging;
        if (c?.significantSessions) {
            const perWeekSessions = weeks ? round(c.significantSessions / weeks, 1) : null;
            cards.push({
                id: 'charging',
                eyebrow: 'Charging',
                figure: perWeekSessions ?? c.significantSessions,
                unit: perWeekSessions ? 'charges a week' : 'charges',
                headline: `usually from about ${c.typicalPlugInSoc}% up to ${c.typicalTargetSoc}%.`,
                body: `The lowest the battery got was ${c.lowestSoc}%. Most people are comfortable between 20% and 80% day to day; a full charge is for road trips.`,
            });
        }

        // 7. Short trips
        const sh = insights.shortTrips;
        if (sh && sh.sharePct >= 10 && sh.efficiency && sh.restEfficiency) {
            cards.push({
                id: 'short',
                eyebrow: 'Short hops',
                figure: `${round(sh.sharePct)}%`,
                unit: '',
                headline: `of your trips are under ${sh.threshold} ${u}.`,
                body: `They use ${round(((sh.efficiency - sh.restEfficiency) / sh.restEfficiency) * 100)}% more energy per ${u} than your other trips, because the car spends the first minutes warming up. Combining errands into one outing helps.`,
            });
        }

        // 8. Places
        const p = insights.places;
        if (p?.top?.[0]) {
            cards.push({
                id: 'places',
                eyebrow: 'Places',
                figure: `${round(p.homeSharePct)}%`,
                unit: '',
                headline: 'of your trips start or end at one place, probably home.',
                body: `${p.uniquePlaces} different places appear in your log. ${p.top[1] ? `The second most visited accounts for ${round(p.top[1].sharePct)}%.` : ''}`,
                action: 'map',
            });
        }

        // 9. Compared with a petrol car
        cards.push({
            id: 'carbon',
            tone: 'good',
            eyebrow: 'Compared with a petrol car',
            figure: round(parseFloat(statistics.carbonSaved)),
            unit: 'kg CO₂ avoided',
            headline: `and ${statistics.gasSaved} ${statistics.fuelUnit} of fuel never bought.`,
            body: `That is what ${statistics.treesEquivalent} trees absorb in a year, or about ${Math.max(1, Math.round(parseFloat(statistics.carbonSaved) / FLIGHT_LONDON_PARIS_KG))} short-haul flights. Based on an average petrol car over the same distance.`,
        });

        // 10. Rhythm
        const r = insights.rhythm;
        if (r) {
            const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            cards.push({
                id: 'rhythm',
                eyebrow: 'Your rhythm',
                figure: DAYS[r.busiestWeekday] ?? '–',
                unit: '',
                headline: `is your busiest day, and ${String(r.peakHour).padStart(2, '0')}:00 the busiest hour.`,
                body: `You drove on ${r.activeDays} of ${r.spanDays} days. ${r.weekendSharePct}% of trips fall on weekends. Longest run of consecutive driving days: ${r.longestStreakDays}.`,
            });
        }

        // 11. Records
        const rec = insights.records;
        if (rec?.longestTrip) {
            cards.push({
                id: 'records',
                eyebrow: 'Your longest trip',
                figure: round(rec.longestTrip.distanceKm),
                unit: u,
                headline: `on ${rec.longestTrip.startDate.split(',')[0]}.`,
                body: `${rec.longestDay ? `Your biggest single day was ${round(rec.longestDay.distance)} ${u} over ${rec.longestDay.trips} trips.` : ''} ${rec.mostEfficient ? `Your most efficient longer trip used just ${round(rec.mostEfficient.efficiency, 1)} kWh per 100 ${u}.` : ''}`.trim(),
            });
        }

        // 12. Tips, derived from the numbers above
        const tips = this._tips({ insights, statistics });
        if (tips.length) {
            cards.push({ id: 'tips', eyebrow: 'Three things to try', figure: null, unit: '', headline: 'based on your own driving.', body: '', list: tips.slice(0, 3) });
        }

        return cards;
    }

    /**
     * The cost card. `cost` is a CostCalculator result when the caller has a
     * tariff; otherwise the flat rate from the constructor is applied to
     * the driven energy.
     */
    _costCard({ energy, distance, weeks, cost }) {
        const u = this.unit;
        const sym = cost ? currencyPrefix(cost.currency) : this.symbol;
        if (cost && cost.method !== 'none') {
            const total = cost.cost.total;
            const modeLabel = { flat: 'a flat rate', tou: 'your time-of-use tariff', tiered: 'your tiered tariff' }[cost.mode] ?? 'your tariff';
            const publicPart = cost.energy.public > 0 ? ` ${sym}${round(cost.cost.public).toLocaleString()} of that was public charging.` : '';
            return {
                id: 'cost',
                eyebrow: 'What it cost',
                figure: `${sym}${round(total).toLocaleString()}`,
                unit: '',
                headline: cost.costPer100 ? `in electricity, or ${sym}${round(cost.costPer100, 2)} per 100 ${u}.` : 'in electricity.',
                body: `Priced with ${modeLabel} at an effective ${sym}${round(cost.effectiveRatePerKwh ?? 0, 3)}/kWh.${publicPart}${weeks ? ` About ${sym}${round(total / weeks, 2)} a week.` : ''}`,
                action: 'cost',
            };
        }
        const total = energy * this.rate;
        const costPer100 = energy > 0 && distance > 0 ? (energy / distance) * 100 * this.rate : null;
        return {
            id: 'cost',
            eyebrow: 'What it cost',
            figure: `${sym}${round(total).toLocaleString()}`,
            unit: '',
            headline: costPer100 ? `in electricity, or ${sym}${round(costPer100, 2)} per 100 ${u}.` : 'in electricity.',
            body: `Assuming ${sym}${this.rate}/kWh at home. ${weeks ? `That is about ${sym}${round(total / weeks, 2)} a week.` : ''} Set your own tariff and this updates.`,
            action: 'cost',
        };
    }

    _tips({ insights, statistics }) {
        const tips = [];
        const u = this.unit;
        if (insights.seasonality?.winterPenaltyPct >= 20) tips.push('Pre-heat the cabin while plugged in on winter mornings. It is the single biggest saver in your data.');
        if (insights.shortTrips?.sharePct >= 25) tips.push(`Chain short errands together: ${Math.round(insights.shortTrips.sharePct)}% of your trips are under ${insights.shortTrips.threshold} ${u} and they are your least efficient.`);
        if (insights.charging?.typicalTargetSoc >= 95) tips.push('You often charge to 100%. Setting the daily limit to 80–90% is gentler on the battery; save full charges for long days.');
        if (insights.charging?.lowestSoc !== null && insights.charging?.lowestSoc < 10) tips.push(`The battery once dropped to ${insights.charging.lowestSoc}%. Keeping above 10–15% leaves headroom for a detour or a closed charger.`);
        if (insights.coverage?.coveragePct !== null && insights.coverage?.coveragePct < 85) tips.push(`The app only recorded ${insights.coverage.coveragePct}% of the distance on your odometer. Check it is allowed to run in the background so the picture stays complete.`);
        if (parseFloat(statistics.avgEfficiency) > 22 * this.toKm) tips.push('Eco mode, gentler acceleration and a lighter right foot on the motorway each shave a few percent off consumption.');
        if (tips.length < 3) tips.push('Export the log every month or two and drop all the files here together; overlapping exports are merged automatically.');
        return tips;
    }

    _span(days) {
        if (days < 14) return `${days} days`;
        if (days < 60) return `${Math.round(days / 7)} weeks`;
        if (days < 365) return `${Math.round(days / 30.4)} months`;
        const years = days / 365;
        return years < 1.5 ? 'about a year' : `${round(years, 1)} years`;
    }
}
