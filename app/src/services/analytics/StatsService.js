import { seasonOf } from '../../utils/journeyDate';

const UNIT_MULTIPLIER = { km: 1, mi: 1.60934 };
const round = (n, d = 1) => (n === null || n === undefined || !isFinite(n) ? null : Math.round(n * 10 ** d) / 10 ** d);

/** Linear interpolation percentile on a sorted array (p in 0..1). */
export const percentile = (sorted, p) => {
    if (!sorted.length) return null;
    const idx = (sorted.length - 1) * p;
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
};

export const quantiles = (values) => {
    const clean = values.filter((v) => typeof v === 'number' && isFinite(v)).sort((a, b) => a - b);
    if (!clean.length) return { n: 0, min: null, p5: null, p25: null, p50: null, p75: null, p95: null, max: null, mean: null };
    const mean = clean.reduce((s, v) => s + v, 0) / clean.length;
    return {
        n: clean.length,
        min: clean[0],
        p5: percentile(clean, 0.05),
        p25: percentile(clean, 0.25),
        p50: percentile(clean, 0.5),
        p75: percentile(clean, 0.75),
        p95: percentile(clean, 0.95),
        max: clean[clean.length - 1],
        mean,
    };
};

/** Ordinary least squares y = intercept + slope·x with r². */
export const linearRegression = (points) => {
    const n = points.length;
    if (n < 3) return { slope: null, intercept: null, r2: null, n };
    const mx = points.reduce((s, p) => s + p.x, 0) / n;
    const my = points.reduce((s, p) => s + p.y, 0) / n;
    let sxx = 0;
    let sxy = 0;
    let syy = 0;
    points.forEach((p) => {
        sxx += (p.x - mx) ** 2;
        sxy += (p.x - mx) * (p.y - my);
        syy += (p.y - my) ** 2;
    });
    if (sxx === 0) return { slope: null, intercept: null, r2: null, n };
    const slope = sxy / sxx;
    const intercept = my - slope * mx;
    const r2 = syy === 0 ? 1 : (sxy * sxy) / (sxx * syy);
    return { slope, intercept, r2, n };
};

const median = (values) => quantiles(values).p50;

/**
 * StatsService - the enthusiast layer. Distributions, a fitted consumption
 * model, efficiency drivers, battery fit, charging sessions and a
 * data-quality report. Pure functions over the trip model; unit-aware.
 */
export class StatsService {
    constructor(distanceUnit = 'km') {
        this.distanceUnit = distanceUnit === 'mi' ? 'mi' : 'km';
        this.multiplier = UNIT_MULTIPLIER[this.distanceUnit];
    }

    efficiencyCap() {
        return 60 * this.multiplier;
    }

    /** Percentile table for the headline per-trip measures. */
    distributionTable(data) {
        const u = this.distanceUnit;
        const cap = this.efficiencyCap();
        const rows = [
            { key: 'distance', label: 'Trip distance', unit: u, values: data.map((t) => t.distanceKm), digits: 1 },
            { key: 'efficiency', label: 'Efficiency', unit: `kWh/100${u}`, values: data.filter((t) => t.efficiency > 0 && t.efficiency <= cap).map((t) => t.efficiency), digits: 1 },
            { key: 'consumption', label: 'Energy per trip', unit: 'kWh', values: data.map((t) => t.consumptionKwh), digits: 2 },
            { key: 'duration', label: 'Duration', unit: 'min', values: data.filter((t) => t.durationMin > 0).map((t) => t.durationMin), digits: 0 },
            { key: 'avgSpeed', label: 'Average speed', unit: `${u}/h`, values: data.filter((t) => t.avgSpeed > 0).map((t) => t.avgSpeed), digits: 1 },
            { key: 'socDrop', label: 'Battery used', unit: '%', values: data.map((t) => t.socDrop).filter((v) => v >= 0), digits: 0 },
        ];
        return rows.map(({ values, ...row }) => ({ ...row, ...quantiles(values) }));
    }

    /**
     * Fit energy = overhead + marginal × distance per trip. The intercept is
     * the fixed cost of a trip (cabin, battery conditioning, computers
     * waking up); the slope is the true rolling consumption. Reported
     * overall and per season.
     */
    consumptionModel(data) {
        const cap = this.efficiencyCap();
        const usable = data.filter((t) => t.distanceKm > 0 && t.consumptionKwh >= 0 && t.efficiency <= cap * 2);
        const fit = (trips) => {
            const reg = linearRegression(trips.map((t) => ({ x: t.distanceKm, y: t.consumptionKwh })));
            if (reg.slope === null) return { n: trips.length, overheadKwh: null, marginalPer100: null, r2: null };
            return {
                n: reg.n,
                overheadKwh: round(Math.max(0, reg.intercept), 2),
                marginalPer100: round(reg.slope * 100, 1),
                r2: round(reg.r2, 2),
            };
        };
        const bySeason = {};
        ['winter', 'spring', 'summer', 'autumn'].forEach((s) => {
            const trips = usable.filter((t) => t.startTs !== null && seasonOf(new Date(t.startTs)) === s);
            bySeason[s] = trips.length >= 8 ? fit(trips) : { n: trips.length, overheadKwh: null, marginalPer100: null, r2: null };
        });
        const overall = fit(usable);
        // Break-even: the distance at which overhead equals rolling consumption
        const breakEven = overall.overheadKwh && overall.marginalPer100 ? round(overall.overheadKwh / (overall.marginalPer100 / 100), 1) : null;
        return { overall, bySeason, breakEvenDistance: breakEven, points: usable.map((t) => ({ x: t.distanceKm, y: t.consumptionKwh, id: t.id })) };
    }

    /** Median efficiency by average-speed band. */
    efficiencyBySpeed(data) {
        const cap = this.efficiencyCap();
        const m = this.multiplier;
        const edges = [0, 20, 30, 40, 50, 60, 80, 100, Infinity].map((e) => (e === Infinity ? e : Math.round(e / m)));
        const u = this.distanceUnit;
        return edges.slice(0, -1).map((lo, i) => {
            const hi = edges[i + 1];
            const trips = data.filter((t) => t.avgSpeed > 0 && t.avgSpeed >= lo && t.avgSpeed < hi && t.efficiency > 0 && t.efficiency <= cap);
            const q = quantiles(trips.map((t) => t.efficiency));
            return { key: `${lo}`, label: hi === Infinity ? `${lo}+ ${u}/h` : `${lo}–${hi}`, lo, hi, n: q.n, median: round(q.p50), p25: round(q.p25), p75: round(q.p75), distance: round(trips.reduce((s, t) => s + t.distanceKm, 0), 0) };
        });
    }

    /** Median efficiency by hour of day (n ≥ 3 to show a value). */
    efficiencyByHour(data) {
        const cap = this.efficiencyCap();
        return Array.from({ length: 24 }, (_, hour) => {
            const trips = data.filter((t) => t.hour === hour && t.efficiency > 0 && t.efficiency <= cap);
            const q = quantiles(trips.map((t) => t.efficiency));
            return { hour, n: q.n, median: q.n >= 3 ? round(q.p50) : null, p25: q.n >= 3 ? round(q.p25) : null, p75: q.n >= 3 ? round(q.p75) : null };
        });
    }

    /** Median efficiency by starting battery level band. */
    efficiencyByStartSoc(data) {
        const cap = this.efficiencyCap();
        const bands = [[0, 20], [20, 40], [40, 60], [60, 80], [80, 101]];
        return bands.map(([lo, hi]) => {
            const trips = data.filter((t) => t.socSource >= lo && t.socSource < hi && t.efficiency > 0 && t.efficiency <= cap);
            const q = quantiles(trips.map((t) => t.efficiency));
            return { key: `${lo}`, label: `${lo}–${Math.min(hi, 100)}%`, n: q.n, median: round(q.p50), p25: round(q.p25), p75: round(q.p75) };
        });
    }

    /**
     * kWh per SOC percent from the per-trip relationship between energy used
     * and battery percentage used; ×100 gives the usable capacity.
     */
    batteryFit(data) {
        const points = data.filter((t) => t.socDrop >= 3 && t.consumptionKwh > 0).map((t) => ({ x: t.socDrop, y: t.consumptionKwh, id: t.id }));
        const reg = linearRegression(points);
        // Force through origin for the capacity estimate (0 % used = 0 kWh)
        const sxy = points.reduce((s, p) => s + p.x * p.y, 0);
        const sxx = points.reduce((s, p) => s + p.x * p.x, 0);
        const kwhPerPct = sxx > 0 ? sxy / sxx : null;
        return {
            points,
            n: points.length,
            kwhPerPct: round(kwhPerPct, 3),
            usableKwh: kwhPerPct ? round(kwhPerPct * 100, 1) : null,
            r2: round(reg.r2, 2),
        };
    }

    /** Charging sessions inferred between consecutive trips. */
    chargeSessions(data) {
        const withSoc = data.filter((t) => t.socSource > 0 || t.socDestination > 0);
        const sessions = [];
        for (let i = 1; i < withSoc.length; i++) {
            const prev = withSoc[i - 1];
            const next = withSoc[i];
            const gain = next.socSource - prev.socDestination;
            if (gain > 0) {
                sessions.push({
                    from: prev.socDestination,
                    to: next.socSource,
                    gain,
                    ts: prev.endTs ?? next.startTs,
                    gapMin: next.startTs && prev.endTs ? Math.round((next.startTs - prev.endTs) / 60000) : null,
                    monthKey: next.monthKey,
                    atPlace: prev.endAddress,
                });
            }
        }
        const toHist = Array.from({ length: 10 }, (_, i) => ({ band: `${i * 10}–${i * 10 + 10}`, lo: i * 10, from: 0, to: 0 }));
        sessions.forEach((s) => {
            const fromBand = Math.min(9, Math.floor(s.from / 10));
            const toBand = Math.min(9, Math.floor(Math.min(s.to, 99.9) / 10));
            toHist[fromBand].from += 1;
            toHist[toBand].to += 1;
        });
        // Longest gaps are the overnight / destination charges; short gaps are top-ups
        const gaps = quantiles(sessions.map((s) => s.gapMin).filter((g) => g !== null));
        return { sessions, histogram: toHist, medianGapMin: gaps.p50 !== null ? Math.round(gaps.p50) : null, sessionsPerWeek: this._perWeek(sessions.filter((s) => s.gain >= 10), data) };
    }

    _perWeek(items, data) {
        if (!data.length || !data[0].startTs || !data[data.length - 1].startTs) return null;
        const weeks = Math.max(1, (data[data.length - 1].startTs - data[0].startTs) / (7 * 86400000));
        return round(items.length / weeks, 1);
    }

    /**
     * What the log does not tell you: unlogged distance per month, trips
     * without coordinates or duration, implausible readings, merge conflicts.
     */
    dataQuality(data, sources = []) {
        const cap = this.efficiencyCap();
        const byMonth = new Map();
        const ensure = (key, label, ts) => {
            if (!byMonth.has(key)) byMonth.set(key, { key, label, ts, logged: 0, unlogged: 0, trips: 0 });
            return byMonth.get(key);
        };
        const labelOf = (t) => (t.startTs ? new Date(t.startTs).toLocaleString(undefined, { month: 'short', year: '2-digit' }) : t.monthKey);
        data.forEach((t, i) => {
            if (!t.monthKey) return;
            const m = ensure(t.monthKey, labelOf(t), t.startTs);
            m.logged += t.distanceKm;
            m.trips += 1;
            const prev = data[i - 1];
            if (prev && prev.endOdometer > 0 && t.startOdometer > 0) {
                const gap = t.startOdometer - prev.endOdometer;
                if (gap > 0) m.unlogged += gap;
            }
        });
        const months = [...byMonth.values()].sort((a, b) => (a.ts ?? 0) - (b.ts ?? 0)).map((m) => ({ ...m, logged: round(m.logged, 0), unlogged: Math.round(m.unlogged), coveragePct: m.logged + m.unlogged > 0 ? Math.round((m.logged / (m.logged + m.unlogged)) * 100) : null }));

        const issues = [
            { key: 'noCoords', label: 'Trips without coordinates', count: data.filter((t) => !t.startLat || !t.endLat).length, hint: 'Hidden on the map and excluded from place detection.' },
            { key: 'noDuration', label: 'Trips with no elapsed time', count: data.filter((t) => !(t.durationMin > 0)).length, hint: 'Start and end minute are identical; speed cannot be derived.' },
            { key: 'extremeEff', label: `Efficiency above ${Math.round(cap)} kWh/100${this.distanceUnit}`, count: data.filter((t) => t.efficiency > cap).length, hint: 'Almost always a sub-kilometre hop; excluded from efficiency charts.' },
            { key: 'zeroEnergy', label: 'Trips with zero energy', count: data.filter((t) => t.consumptionKwh === 0).length, hint: 'Regenerative net-zero or a logging gap; counted in distance only.' },
            { key: 'socRise', label: 'Battery level rose during a trip', count: data.filter((t) => t.socDrop < 0).length, hint: 'Long downhill regen or a charge mid-trip.' },
            { key: 'merged', label: 'Trips the app marked as MERGED', count: data.filter((t) => t.tripType === 'MERGED').length, hint: 'Two drives the Journey Log app joined into one record.' },
            { key: 'noDate', label: 'Rows whose dates failed to parse', count: data.filter((t) => t.startTs === null).length, hint: 'Excluded from every time-based view.' },
        ];
        const conflicts = sources.reduce((s, x) => s + (x.conflicts || 0), 0);
        const duplicates = sources.reduce((s, x) => s + (x.duplicates || 0), 0);
        return { months, issues, conflicts, duplicates, sources: sources.length };
    }

    /** Helper for the UI: median for any numeric field. */
    medianOf(data, field) {
        return median(data.map((t) => t[field]).filter((v) => typeof v === 'number' && isFinite(v)));
    }
}
