import { seasonOf } from '../../utils/journeyDate';

const UNIT_MULTIPLIER = { km: 1, mi: 1.60934 };
const round1 = (n) => Math.round(n * 10) / 10;
const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);
const median = (values) => {
    if (values.length === 0) return null;
    const s = [...values].sort((a, b) => a - b);
    const mid = s.length >> 1;
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

/**
 * Known usable pack sizes (kWh) used to label the battery estimate.
 */
const KNOWN_PACKS = [
    { label: 'Polestar 2 Standard Range (≈69 kWh)', usable: 67 },
    { label: 'Polestar 2 Long Range (≈82 kWh)', usable: 79 },
    { label: 'Polestar 4 (≈100 kWh)', usable: 94 },
    { label: 'Polestar 3 (≈111 kWh)', usable: 107 },
];

/**
 * InsightsCalculator - derives narrative-ready findings from a trip set.
 * Pure and unit-aware; every result carries the numbers a UI needs to render
 * a finding without recomputing anything.
 */
export class InsightsCalculator {
    constructor(distanceUnit = 'km') {
        this.distanceUnit = distanceUnit === 'mi' ? 'mi' : 'km';
        this.multiplier = UNIT_MULTIPLIER[this.distanceUnit];
    }

    compute(data) {
        if (!data || data.length === 0) return null;
        const chronological = [...data].sort((a, b) => (a.startTs ?? 0) - (b.startTs ?? 0));
        return {
            seasonality: this.seasonality(chronological),
            places: this.places(chronological),
            charging: this.charging(chronological),
            battery: this.battery(chronological),
            coverage: this.coverage(chronological),
            shortTrips: this.shortTrips(chronological),
            rhythm: this.rhythm(chronological),
            records: this.records(chronological),
        };
    }

    // ------------------------------------------------------------------

    seasonality(data) {
        const seasons = { winter: [], spring: [], summer: [], autumn: [] };
        data.forEach((t) => {
            if (t.startTs === null) return;
            seasons[seasonOf(new Date(t.startTs))].push(t);
        });
        const summarise = (trips) => {
            const distance = trips.reduce((s, t) => s + t.distanceKm, 0);
            const consumption = trips.reduce((s, t) => s + t.consumptionKwh, 0);
            return { trips: trips.length, distance: round1(distance), efficiency: distance > 0 ? round1((consumption / distance) * 100) : null };
        };
        const result = Object.fromEntries(Object.entries(seasons).map(([k, v]) => [k, summarise(v)]));
        const { winter, summer } = result;
        const comparable = winter.trips >= 5 && summer.trips >= 5 && winter.efficiency && summer.efficiency;
        return {
            ...result,
            winterPenaltyPct: comparable ? Math.round(((winter.efficiency - summer.efficiency) / summer.efficiency) * 100) : null,
            months: this._byMonth(data),
        };
    }

    _byMonth(data) {
        const months = Array.from({ length: 12 }, (_, m) => ({ month: m, distance: 0, consumption: 0, trips: 0 }));
        data.forEach((t) => {
            if (t.startTs === null) return;
            const m = new Date(t.startTs).getMonth();
            months[m].distance += t.distanceKm;
            months[m].consumption += t.consumptionKwh;
            months[m].trips += 1;
        });
        return months.map((m) => ({ ...m, efficiency: m.distance > 0 ? round1((m.consumption / m.distance) * 100) : null }));
    }

    // ------------------------------------------------------------------

    /**
     * Cluster trip endpoints on a ~100 m grid and rank them. The top cluster is
     * almost always "home"; the second is usually work.
     */
    places(data) {
        const clusters = new Map();
        const add = (lat, lng, address) => {
            if (!lat || !lng) return;
            const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
            if (!clusters.has(key)) clusters.set(key, { key, lat, lng, visits: 0, addresses: new Map() });
            const c = clusters.get(key);
            c.visits += 1;
            c.addresses.set(address, (c.addresses.get(address) || 0) + 1);
        };
        data.forEach((t) => {
            add(t.startLat, t.startLng, t.startAddress);
            add(t.endLat, t.endLng, t.endAddress);
        });
        // Grid cells split a single car park in two when it straddles a rounding
        // boundary; merge each cell into the busiest neighbour within ~250 m.
        const cells = [...clusters.values()].sort((a, b) => b.visits - a.visits);
        const merged = [];
        cells.forEach((cell) => {
            const host = merged.find((m) => Math.abs(m.lat - cell.lat) < 0.0025 && Math.abs(m.lng - cell.lng) < 0.0025);
            if (host) {
                host.visits += cell.visits;
                cell.addresses.forEach((n, addr) => host.addresses.set(addr, (host.addresses.get(addr) || 0) + n));
            } else {
                merged.push({ lat: cell.lat, lng: cell.lng, visits: cell.visits, addresses: new Map(cell.addresses) });
            }
        });
        const ranked = merged
            .map((c) => ({
                lat: c.lat,
                lng: c.lng,
                visits: c.visits,
                address: [...c.addresses.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '',
            }))
            .sort((a, b) => b.visits - a.visits);
        const endpoints = data.length * 2;
        return {
            uniquePlaces: ranked.length,
            top: ranked.slice(0, 5).map((p) => ({ ...p, sharePct: pct(p.visits, endpoints) })),
            homeSharePct: ranked[0] ? pct(ranked[0].visits, endpoints) : 0,
            tripsTouchingHome: ranked[0]
                ? data.filter((t) => this._near(t, ranked[0])).length
                : 0,
        };
    }

    _near(trip, place) {
        const close = (la, lo) => Math.abs(la - place.lat) < 0.0015 && Math.abs(lo - place.lng) < 0.0015;
        return close(trip.startLat, trip.startLng) || close(trip.endLat, trip.endLng);
    }

    // ------------------------------------------------------------------

    /**
     * Charging is not logged directly; a rise in SOC between consecutive trips
     * implies a session in between.
     */
    charging(data) {
        const withSoc = data.filter((t) => t.socSource > 0 || t.socDestination > 0);
        const sessions = [];
        for (let i = 1; i < withSoc.length; i++) {
            const gain = withSoc[i].socSource - withSoc[i - 1].socDestination;
            if (gain > 0) {
                sessions.push({ gain, from: withSoc[i - 1].socDestination, to: withSoc[i].socSource, beforeTs: withSoc[i].startTs, gapMin: withSoc[i].startTs && withSoc[i - 1].endTs ? Math.round((withSoc[i].startTs - withSoc[i - 1].endTs) / 60000) : null });
            }
        }
        const significant = sessions.filter((s) => s.gain >= 10);
        const totalDrop = withSoc.reduce((s, t) => s + Math.max(0, t.socDrop), 0);
        return {
            sessions: sessions.length,
            significantSessions: significant.length,
            totalGainPct: sessions.reduce((s, x) => s + x.gain, 0),
            avgGainPct: significant.length ? round1(significant.reduce((s, x) => s + x.gain, 0) / significant.length) : null,
            typicalTargetSoc: significant.length ? Math.round(median(significant.map((s) => s.to))) : null,
            typicalPlugInSoc: significant.length ? Math.round(median(significant.map((s) => s.from))) : null,
            lowestSoc: withSoc.length ? Math.min(...withSoc.map((t) => t.socDestination)) : null,
            medianStartSoc: withSoc.length ? Math.round(median(withSoc.map((t) => t.socSource))) : null,
            totalSocUsedPct: totalDrop,
            fullCyclesEquivalent: round1(totalDrop / 100),
        };
    }

    // ------------------------------------------------------------------

    /**
     * Usable capacity ≈ Σ consumption / Σ SOC drop. Needs trips that moved the
     * gauge a few percent; 1 % rounding noise on short hops is otherwise fatal.
     */
    battery(data) {
        const samples = data.filter((t) => t.socDrop >= 5 && t.consumptionKwh > 0);
        const drop = samples.reduce((s, t) => s + t.socDrop, 0);
        const kwh = samples.reduce((s, t) => s + t.consumptionKwh, 0);
        const estimate = drop > 0 ? (kwh / drop) * 100 : null;
        const plausible = estimate !== null && estimate >= 30 && estimate <= 160 && samples.length >= 5;
        const usable = plausible ? round1(estimate) : null;

        const distance = data.reduce((s, t) => s + t.distanceKm, 0);
        const consumption = data.reduce((s, t) => s + t.consumptionKwh, 0);
        const avgEff = distance > 0 ? (consumption / distance) * 100 : null;
        const closest = usable
            ? KNOWN_PACKS.reduce((best, p) => (Math.abs(p.usable - usable) < Math.abs(best.usable - usable) ? p : best))
            : null;
        return {
            usableKwh: usable,
            samples: samples.length,
            likelyPack: closest && Math.abs(closest.usable - usable) <= 12 ? closest.label : null,
            estimatedRange: usable && avgEff ? Math.round((usable / avgEff) * 100) : null,
            rangeAt80: usable && avgEff ? Math.round((usable * 0.8 / avgEff) * 100) : null,
        };
    }

    // ------------------------------------------------------------------

    /**
     * Odometer says how far the car went; the log says how far was recorded.
     */
    coverage(data) {
        const withOdo = data.filter((t) => t.startOdometer > 0 && t.endOdometer > 0);
        if (withOdo.length < 2) return { loggedDistance: round1(data.reduce((s, t) => s + t.distanceKm, 0)), odometerSpan: null, unloggedDistance: null, coveragePct: null };
        const minStart = Math.min(...withOdo.map((t) => t.startOdometer));
        const maxEnd = Math.max(...withOdo.map((t) => t.endOdometer));
        const logged = data.reduce((s, t) => s + t.distanceKm, 0);
        const span = maxEnd - minStart;
        return {
            loggedDistance: round1(logged),
            odometerSpan: span,
            unloggedDistance: Math.max(0, Math.round(span - logged)),
            coveragePct: span > 0 ? Math.min(100, Math.round((logged / span) * 100)) : null,
        };
    }

    // ------------------------------------------------------------------

    shortTrips(data) {
        const threshold = Math.round((3 / this.multiplier) * 10) / 10;
        const short = data.filter((t) => t.distanceKm <= threshold);
        const rest = data.filter((t) => t.distanceKm > threshold);
        const eff = (trips) => {
            const d = trips.reduce((s, t) => s + t.distanceKm, 0);
            const c = trips.reduce((s, t) => s + t.consumptionKwh, 0);
            return d > 0 ? round1((c / d) * 100) : null;
        };
        return {
            threshold,
            count: short.length,
            sharePct: pct(short.length, data.length),
            distanceSharePct: pct(short.reduce((s, t) => s + t.distanceKm, 0), data.reduce((s, t) => s + t.distanceKm, 0)),
            efficiency: eff(short),
            restEfficiency: eff(rest),
        };
    }

    // ------------------------------------------------------------------

    rhythm(data) {
        const weekdays = Array(7).fill(0);
        const hours = Array(24).fill(0);
        const days = new Map();
        data.forEach((t) => {
            if (t.weekday !== null) weekdays[t.weekday] += 1;
            if (t.hour !== null) hours[t.hour] += 1;
            if (t.dayKey) days.set(t.dayKey, (days.get(t.dayKey) || 0) + 1);
        });
        const busiestWeekday = weekdays.indexOf(Math.max(...weekdays));
        const peakHour = hours.indexOf(Math.max(...hours));
        const weekendTrips = weekdays[5] + weekdays[6];

        // Longest run of consecutive days with at least one trip
        const sortedDays = [...days.keys()].sort();
        let streak = 0;
        let longestStreak = 0;
        let prev = null;
        sortedDays.forEach((k) => {
            const d = new Date(k + 'T00:00:00');
            if (prev && d - prev === 86400000) streak += 1;
            else streak = 1;
            longestStreak = Math.max(longestStreak, streak);
            prev = d;
        });

        const span = data.length && data[0].startTs && data[data.length - 1].startTs
            ? Math.max(1, Math.round((data[data.length - 1].startTs - data[0].startTs) / 86400000) + 1)
            : null;

        return {
            busiestWeekday,
            peakHour,
            weekendSharePct: pct(weekendTrips, data.length),
            activeDays: days.size,
            spanDays: span,
            activeDaySharePct: span ? Math.round((days.size / span) * 100) : null,
            tripsPerActiveDay: days.size ? round1(data.length / days.size) : null,
            longestStreakDays: longestStreak,
        };
    }

    // ------------------------------------------------------------------

    records(data) {
        const longestTrip = data.reduce((b, t) => (t.distanceKm > (b?.distanceKm ?? -1) ? t : b), null);
        const byDay = new Map();
        data.forEach((t) => {
            if (!t.dayKey) return;
            const d = byDay.get(t.dayKey) || { dayKey: t.dayKey, distance: 0, trips: 0, ts: t.startTs };
            d.distance += t.distanceKm;
            d.trips += 1;
            byDay.set(t.dayKey, d);
        });
        const longestDay = [...byDay.values()].reduce((b, d) => (d.distance > (b?.distance ?? -1) ? d : b), null);
        const meaningful = data.filter((t) => t.distanceKm >= 10 / this.multiplier && t.efficiency > 0);
        const mostEfficient = meaningful.reduce((b, t) => (t.efficiency < (b?.efficiency ?? Infinity) ? t : b), null);
        const leastEfficient = meaningful.reduce((b, t) => (t.efficiency > (b?.efficiency ?? -1) ? t : b), null);
        const longestDuration = data.reduce((b, t) => ((t.durationMin ?? -1) > (b?.durationMin ?? -1) ? t : b), null);
        return {
            longestTrip,
            longestDay: longestDay ? { ...longestDay, distance: round1(longestDay.distance) } : null,
            mostEfficient,
            leastEfficient,
            longestDuration,
        };
    }

    // ------------------------------------------------------------------

    /**
     * Compare a period with the one immediately before it (same length).
     */
    static comparePeriods(current, previous) {
        const sum = (trips, key) => trips.reduce((s, t) => s + t[key], 0);
        const eff = (trips) => {
            const d = sum(trips, 'distanceKm');
            return d > 0 ? (sum(trips, 'consumptionKwh') / d) * 100 : null;
        };
        const delta = (a, b) => (b > 0 && a !== null && b !== null ? Math.round(((a - b) / b) * 100) : null);
        const cur = { trips: current.length, distance: sum(current, 'distanceKm'), consumption: sum(current, 'consumptionKwh'), efficiency: eff(current) };
        const prev = { trips: previous.length, distance: sum(previous, 'distanceKm'), consumption: sum(previous, 'consumptionKwh'), efficiency: eff(previous) };
        return {
            hasPrevious: previous.length > 0,
            trips: delta(cur.trips, prev.trips),
            distance: delta(cur.distance, prev.distance),
            consumption: delta(cur.consumption, prev.consumption),
            efficiency: delta(cur.efficiency, prev.efficiency),
        };
    }

    /**
     * Slice of `allData` covering the same length of time immediately before
     * [fromTs, toTs].
     */
    static previousPeriod(allData, fromTs, toTs) {
        if (!fromTs || !toTs || toTs <= fromTs) return [];
        const length = toTs - fromTs;
        const prevFrom = fromTs - length;
        return allData.filter((t) => t.startTs !== null && t.startTs >= prevFrom && t.startTs < fromTs);
    }
}
