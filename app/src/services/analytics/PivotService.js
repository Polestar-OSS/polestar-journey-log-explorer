import { seasonOf, WEEKDAYS_SHORT, formatMonthLabel } from '../../utils/journeyDate';
import { quantiles } from './StatsService';

const UNIT_MULTIPLIER = { km: 1, mi: 1.60934 };
const round = (n, d = 1) => (n === null || n === undefined || !isFinite(n) ? null : Math.round(n * 10 ** d) / 10 ** d);

const SEASON_ORDER = ['winter', 'spring', 'summer', 'autumn'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Dimensions a trip can be grouped by. Each dimension answers three
 * questions: which bucket does a trip fall in, what is that bucket called,
 * and how are buckets ordered. Adding a dimension is adding an entry here
 * (Open/Closed: the pivot itself never changes).
 */
export const buildDimensions = (distanceUnit = 'km') => {
    const m = UNIT_MULTIPLIER[distanceUnit] ?? 1;
    const u = distanceUnit;
    const distanceEdges = [0, 2, 5, 10, 20, 50, 100, Infinity].map((e) => (e === Infinity ? e : Math.round((e / m) * 10) / 10));
    const socEdges = [0, 5, 10, 20, 40, 101];
    return {
        month: { label: 'Month', keyOf: (t) => t.monthKey, labelOf: (k) => formatMonthLabel(k), sort: (a, b) => a.localeCompare(b), timeline: true },
        week: { label: 'Week', keyOf: (t) => t.weekKey, labelOf: (k) => k.replace('-W', ' W'), sort: (a, b) => a.localeCompare(b), timeline: true },
        weekday: { label: 'Weekday', keyOf: (t) => (t.weekday === null ? null : String(t.weekday)), labelOf: (k) => WEEKDAYS_SHORT[+k], sort: (a, b) => +a - +b },
        hour: { label: 'Hour of day', keyOf: (t) => (t.hour === null ? null : String(t.hour)), labelOf: (k) => `${String(k).padStart(2, '0')}:00`, sort: (a, b) => +a - +b },
        season: { label: 'Season', keyOf: (t) => (t.startTs === null ? null : seasonOf(new Date(t.startTs))), labelOf: (k) => k[0].toUpperCase() + k.slice(1), sort: (a, b) => SEASON_ORDER.indexOf(a) - SEASON_ORDER.indexOf(b) },
        calendarMonth: { label: 'Month of year', keyOf: (t) => (t.startTs === null ? null : String(new Date(t.startTs).getMonth())), labelOf: (k) => MONTH_NAMES[+k], sort: (a, b) => +a - +b },
        year: { label: 'Year', keyOf: (t) => (t.monthKey ? t.monthKey.slice(0, 4) : null), labelOf: (k) => k, sort: (a, b) => a.localeCompare(b) },
        category: { label: 'Category', keyOf: (t) => t.category || 'Uncategorized', labelOf: (k) => k, sort: (a, b) => a.localeCompare(b) },
        source: { label: 'Source file', keyOf: (t) => t.sourceFile || 'File', labelOf: (k) => k, sort: (a, b) => a.localeCompare(b) },
        tripType: { label: 'Trip type', keyOf: (t) => t.tripType || 'SINGLE', labelOf: (k) => k, sort: (a, b) => a.localeCompare(b) },
        distanceBand: {
            label: `Distance band (${u})`,
            keyOf: (t) => { const i = distanceEdges.findIndex((e, idx) => t.distanceKm >= e && t.distanceKm < distanceEdges[idx + 1]); return i < 0 ? null : String(i); },
            labelOf: (k) => { const lo = distanceEdges[+k]; const hi = distanceEdges[+k + 1]; return hi === Infinity ? `${lo}+ ${u}` : `${lo}–${hi} ${u}`; },
            sort: (a, b) => +a - +b,
        },
        socBand: {
            label: 'Battery used band',
            keyOf: (t) => { const i = socEdges.findIndex((e, idx) => t.socDrop >= e && t.socDrop < socEdges[idx + 1]); return i < 0 ? null : String(i); },
            labelOf: (k) => { const lo = socEdges[+k]; const hi = socEdges[+k + 1]; return hi > 100 ? `${lo}%+` : `${lo}–${hi}%`; },
            sort: (a, b) => +a - +b,
        },
        startPlace: { label: 'Start place', keyOf: (t) => t.startAddress || null, labelOf: (k) => k, sort: null, limit: 12 },
        endPlace: { label: 'End place', keyOf: (t) => t.endAddress || null, labelOf: (k) => k, sort: null, limit: 12 },
    };
};

/**
 * Metrics that can be computed per bucket. `agg` receives the trips of one
 * bucket and returns a number or null.
 */
export const buildMetrics = (distanceUnit = 'km') => {
    const u = distanceUnit;
    const sum = (trips, f) => trips.reduce((s, t) => s + (t[f] || 0), 0);
    const cap = 60 * (UNIT_MULTIPLIER[u] ?? 1);
    const effOf = (trips) => trips.filter((t) => t.efficiency > 0 && t.efficiency <= cap).map((t) => t.efficiency);
    return {
        trips: { label: 'Trips', unit: '', digits: 0, agg: (trips) => trips.length },
        distance: { label: 'Distance', unit: u, digits: 0, agg: (trips) => round(sum(trips, 'distanceKm'), 1) },
        energy: { label: 'Energy', unit: 'kWh', digits: 1, agg: (trips) => round(sum(trips, 'consumptionKwh'), 1) },
        efficiency: { label: 'Efficiency (energy ÷ distance)', unit: `kWh/100${u}`, digits: 1, lowerIsBetter: true, agg: (trips) => { const d = sum(trips, 'distanceKm'); return d > 0 ? round((sum(trips, 'consumptionKwh') / d) * 100) : null; } },
        efficiencyMedian: { label: 'Efficiency (median trip)', unit: `kWh/100${u}`, digits: 1, lowerIsBetter: true, agg: (trips) => round(quantiles(effOf(trips)).p50) },
        efficiencyP90: { label: 'Efficiency (90th percentile)', unit: `kWh/100${u}`, digits: 1, lowerIsBetter: true, agg: (trips) => round(quantiles(effOf(trips)).p90 ?? quantiles(effOf(trips)).p95) },
        avgDistance: { label: 'Average trip length', unit: u, digits: 1, agg: (trips) => (trips.length ? round(sum(trips, 'distanceKm') / trips.length) : null) },
        medianDistance: { label: 'Median trip length', unit: u, digits: 1, agg: (trips) => round(quantiles(trips.map((t) => t.distanceKm)).p50) },
        socUsed: { label: 'Battery used', unit: '%', digits: 0, agg: (trips) => trips.reduce((s, t) => s + Math.max(0, t.socDrop), 0) },
        duration: { label: 'Time driving', unit: 'h', digits: 1, agg: (trips) => round(sum(trips, 'durationMin') / 60) },
        avgSpeed: { label: 'Average speed', unit: `${u}/h`, digits: 1, agg: (trips) => { const min = sum(trips, 'durationMin'); return min > 0 ? round(sum(trips, 'distanceKm') / (min / 60)) : null; } },
        activeDays: { label: 'Driving days', unit: '', digits: 0, agg: (trips) => new Set(trips.map((t) => t.dayKey).filter(Boolean)).size },
        energyPerDay: { label: 'Energy per driving day', unit: 'kWh', digits: 1, agg: (trips) => { const days = new Set(trips.map((t) => t.dayKey).filter(Boolean)).size; return days ? round(sum(trips, 'consumptionKwh') / days) : null; } },
    };
};

/**
 * PivotService - group trips by one dimension and aggregate one metric.
 * Returns rows in the dimension's natural order plus a "share" of the
 * total so bars can be read as part-to-whole where that makes sense.
 */
export class PivotService {
    constructor(distanceUnit = 'km') {
        this.distanceUnit = distanceUnit === 'mi' ? 'mi' : 'km';
        this.dimensions = buildDimensions(this.distanceUnit);
        this.metrics = buildMetrics(this.distanceUnit);
    }

    dimensionOptions() {
        return Object.entries(this.dimensions).map(([value, d]) => ({ value, label: d.label }));
    }

    metricOptions() {
        return Object.entries(this.metrics).map(([value, m]) => ({ value, label: m.unit ? `${m.label} (${m.unit})` : m.label }));
    }

    pivot(data, dimensionKey, metricKey) {
        const dim = this.dimensions[dimensionKey];
        const metric = this.metrics[metricKey];
        if (!dim || !metric) throw new Error(`Unknown dimension "${dimensionKey}" or metric "${metricKey}"`);

        const buckets = new Map();
        data.forEach((t) => {
            const key = dim.keyOf(t);
            if (key === null || key === undefined) return;
            if (!buckets.has(key)) buckets.set(key, []);
            buckets.get(key).push(t);
        });

        let rows = [...buckets.entries()].map(([key, trips]) => ({
            key,
            label: dim.labelOf(key),
            value: metric.agg(trips),
            trips: trips.length,
            distance: round(trips.reduce((s, t) => s + t.distanceKm, 0), 1),
            energy: round(trips.reduce((s, t) => s + t.consumptionKwh, 0), 1),
        }));

        if (dim.sort) rows.sort((a, b) => dim.sort(a.key, b.key));
        else rows.sort((a, b) => (b.value ?? -Infinity) - (a.value ?? -Infinity) || b.trips - a.trips);
        if (dim.limit && rows.length > dim.limit) {
            const head = rows.slice(0, dim.limit);
            const tail = rows.slice(dim.limit);
            const tailTrips = tail.flatMap((r) => buckets.get(r.key));
            head.push({ key: '__other', label: `Other (${tail.length})`, value: metric.agg(tailTrips), trips: tailTrips.length, distance: round(tailTrips.reduce((s, t) => s + t.distanceKm, 0), 1), energy: round(tailTrips.reduce((s, t) => s + t.consumptionKwh, 0), 1) });
            rows = head;
        }

        const additive = ['trips', 'distance', 'energy', 'socUsed', 'duration', 'activeDays'].includes(metricKey);
        const total = additive ? rows.reduce((s, r) => s + (r.value || 0), 0) : null;
        return {
            rows: rows.map((r) => ({ ...r, share: total ? round(((r.value || 0) / total) * 100) : null })),
            metric: { key: metricKey, ...metric },
            dimension: { key: dimensionKey, label: dim.label, timeline: Boolean(dim.timeline) },
            total,
        };
    }

    /** CSV of a pivot result for export. */
    toCSV(result) {
        const header = [result.dimension.label, `${result.metric.label}${result.metric.unit ? ` (${result.metric.unit})` : ''}`, 'Trips', `Distance (${this.distanceUnit})`, 'Energy (kWh)', 'Share (%)'];
        const esc = (v) => (typeof v === 'string' && /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v ?? '');
        return [header.join(','), ...result.rows.map((r) => [r.label, r.value, r.trips, r.distance, r.energy, r.share].map(esc).join(','))].join('\n');
    }
}
