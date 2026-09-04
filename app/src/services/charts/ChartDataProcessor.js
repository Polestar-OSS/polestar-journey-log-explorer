import {
    dayKey,
    weekKey,
    monthKey,
    startOfWeek,
    addDays,
    formatMonthLabel,
    formatDayLabel,
    formatDateTimeLabel,
} from '../../utils/journeyDate';

const UNIT_MULTIPLIER = { km: 1, mi: 1.60934 };
const multiplierFor = (unit) => UNIT_MULTIPLIER[unit] ?? 1;

const median = (values) => {
    if (values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = sorted.length >> 1;
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const round1 = (n) => Math.round(n * 10) / 10;

/**
 * ChartDataProcessor - Service for processing trip data into chart-ready formats
 * Follows Single Responsibility Principle: Only handles data transformation for charts
 *
 * Trips are expected in chronological order with the derived fields produced by
 * dataParser (startTs, dayKey, weekKey, monthKey, hour, weekday, durationMin).
 */
export class ChartDataProcessor {
    /**
     * Upper bound for "plausible" efficiency; anything above is a 1-km cold-start
     * artefact that would flatten every axis.
     */
    efficiencyCap(distanceUnit = 'km') {
        return 60 * multiplierFor(distanceUnit);
    }

    // ------------------------------------------------------------------
    // Time series
    // ------------------------------------------------------------------

    /**
     * Aggregate trips by calendar period, filling empty periods with zeros so
     * the x-axis is a true time axis.
     * @param {Array} data - trips (chronological)
     * @param {'day'|'week'|'month'} granularity
     * @param {number} maxPoints - trims from the start when exceeded
     */
    aggregateByPeriod(data, granularity = 'month', maxPoints = 400) {
        const dated = data.filter((t) => t.startTs !== null);
        if (dated.length === 0) return [];

        const keyOf = { day: (t) => t.dayKey, week: (t) => t.weekKey, month: (t) => t.monthKey }[granularity];
        const buckets = new Map();
        dated.forEach((t) => {
            const key = keyOf(t);
            if (!buckets.has(key)) {
                buckets.set(key, { key, distance: 0, consumption: 0, trips: 0, socUsed: 0, durationMin: 0 });
            }
            const b = buckets.get(key);
            b.distance += t.distanceKm;
            b.consumption += t.consumptionKwh;
            b.trips += 1;
            b.socUsed += Math.max(0, t.socDrop);
            b.durationMin += t.durationMin || 0;
        });

        // Walk the calendar from first to last trip so gaps become zero rows
        const first = new Date(dated[0].startTs);
        const last = new Date(dated[dated.length - 1].startTs);
        const series = [];
        if (granularity === 'month') {
            const cursor = new Date(first.getFullYear(), first.getMonth(), 1);
            const stop = new Date(last.getFullYear(), last.getMonth(), 1);
            while (cursor <= stop) {
                const key = monthKey(cursor);
                series.push({ ts: cursor.getTime(), label: formatMonthLabel(key), ...this._emptyBucket(key), ...(buckets.get(key) || {}) });
                cursor.setMonth(cursor.getMonth() + 1);
            }
        } else if (granularity === 'week') {
            let cursor = startOfWeek(first);
            const stop = startOfWeek(last);
            while (cursor <= stop) {
                const key = weekKey(cursor);
                series.push({ ts: cursor.getTime(), label: formatDayLabel(cursor), ...this._emptyBucket(key), ...(buckets.get(key) || {}) });
                cursor = addDays(cursor, 7);
            }
        } else {
            let cursor = new Date(first.getFullYear(), first.getMonth(), first.getDate());
            const stop = new Date(last.getFullYear(), last.getMonth(), last.getDate());
            while (cursor <= stop) {
                const key = dayKey(cursor);
                series.push({ ts: cursor.getTime(), label: formatDayLabel(cursor), ...this._emptyBucket(key), ...(buckets.get(key) || {}) });
                cursor = addDays(cursor, 1);
            }
        }

        const trimmed = series.length > maxPoints ? series.slice(-maxPoints) : series;
        return trimmed.map((row) => ({
            ...row,
            distance: round1(row.distance),
            consumption: round1(row.consumption),
            efficiency: row.distance > 0 ? round1((row.consumption / row.distance) * 100) : null,
        }));
    }

    _emptyBucket(key) {
        return { key, distance: 0, consumption: 0, trips: 0, socUsed: 0, durationMin: 0 };
    }

    /**
     * Back-compat: daily distance & consumption for the last N days
     */
    processTimeSeriesData(data, days = 30) {
        return this.aggregateByPeriod(data, 'day').slice(-days).map((d) => ({ date: d.label, ...d }));
    }

    /**
     * Per-trip efficiency with a rolling median, which is robust to the
     * 1-km cold-start outliers that dominate a rolling mean.
     */
    efficiencyTrend(data, distanceUnit = 'km', window = 10) {
        const cap = this.efficiencyCap(distanceUnit);
        const points = data.filter((t) => t.startTs !== null && t.efficiency > 0 && t.efficiency < cap);
        const buffer = [];
        return points.map((t, i) => {
            buffer.push(t.efficiency);
            if (buffer.length > window) buffer.shift();
            return {
                i,
                ts: t.startTs,
                label: formatDateTimeLabel(new Date(t.startTs)),
                efficiency: t.efficiency,
                rolling: buffer.length >= Math.min(window, 3) ? round1(median(buffer)) : null,
                distance: t.distanceKm,
                id: t.id,
            };
        });
    }

    // ------------------------------------------------------------------
    // Distributions
    // ------------------------------------------------------------------

    histogram(values, edges, labelFn) {
        const bins = edges.slice(0, -1).map((x0, i) => ({
            x0,
            x1: edges[i + 1],
            label: labelFn ? labelFn(x0, edges[i + 1], i === edges.length - 2) : `${x0}–${edges[i + 1]}`,
            count: 0,
        }));
        values.forEach((v) => {
            const bin = bins.find((b, i) => v >= b.x0 && (v < b.x1 || (i === bins.length - 1 && v <= b.x1)));
            if (bin) bin.count += 1;
        });
        return bins;
    }

    efficiencyHistogram(data, distanceUnit = 'km') {
        const m = multiplierFor(distanceUnit);
        const step = 2.5 * m;
        const cap = this.efficiencyCap(distanceUnit);
        const edges = [];
        for (let e = 0; e <= cap + 1e-9; e += step) edges.push(round1(e));
        const values = data.map((t) => t.efficiency).filter((e) => e > 0 && e <= cap);
        const bins = this.histogram(values, edges, (x0, x1, last) => (last ? `${x0}+` : `${x0}`));
        return { bins, median: median(values), outliers: data.filter((t) => t.efficiency > cap).length };
    }

    distanceHistogram(data, distanceUnit = 'km') {
        const m = multiplierFor(distanceUnit);
        const u = distanceUnit === 'mi' ? 'mi' : 'km';
        const base = [0, 2, 5, 10, 20, 50, 100, 250, Infinity];
        const edges = base.map((e) => (e === Infinity ? Infinity : Math.round((e / m) * 10) / 10));
        const values = data.map((t) => t.distanceKm);
        const bins = this.histogram(values, edges, (x0, x1) => (x1 === Infinity ? `${x0}+ ${u}` : `${x0}–${x1} ${u}`));
        const total = values.length || 1;
        return bins.map((b) => ({ ...b, share: Math.round((b.count / total) * 1000) / 10 }));
    }

    /**
     * Back-compat pie ranges
     */
    processDistanceRanges(data, distanceUnit = 'km') {
        return this.distanceHistogram(data, distanceUnit).map((b) => ({ range: b.label, count: b.count }));
    }

    processEfficiencyData(data, minEfficiency = 0, maxEfficiency = 50) {
        return data
            .filter((trip) => trip.efficiency > minEfficiency && trip.efficiency < maxEfficiency)
            .map((trip) => ({ efficiency: trip.efficiency, distance: trip.distanceKm }))
            .sort((a, b) => a.efficiency - b.efficiency);
    }

    /**
     * Efficiency vs distance scatter (log-x friendly), capped for readability
     */
    efficiencyVsDistance(data, distanceUnit = 'km') {
        const cap = this.efficiencyCap(distanceUnit);
        return data
            .filter((t) => t.efficiency > 0 && t.efficiency <= cap && t.distanceKm > 0)
            .map((t) => ({ id: t.id, distance: t.distanceKm, efficiency: t.efficiency, ts: t.startTs, soc: t.socDrop }));
    }

    // ------------------------------------------------------------------
    // Rhythm
    // ------------------------------------------------------------------

    /**
     * 7×24 grid of trips (or distance) by weekday × hour
     */
    weekdayHourHeatmap(data, metric = 'trips') {
        const cells = [];
        for (let w = 0; w < 7; w++) for (let h = 0; h < 24; h++) cells.push({ weekday: w, hour: h, value: 0, trips: 0 });
        data.forEach((t) => {
            if (t.weekday === null || t.hour === null) return;
            const cell = cells[t.weekday * 24 + t.hour];
            cell.trips += 1;
            cell.value += metric === 'distance' ? t.distanceKm : 1;
        });
        const max = cells.reduce((m, c) => Math.max(m, c.value), 0);
        return { cells: cells.map((c) => ({ ...c, value: round1(c.value) })), max };
    }

    hourlyProfile(data) {
        const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, trips: 0, distance: 0, consumption: 0 }));
        data.forEach((t) => {
            if (t.hour === null) return;
            hours[t.hour].trips += 1;
            hours[t.hour].distance += t.distanceKm;
            hours[t.hour].consumption += t.consumptionKwh;
        });
        return hours.map((h) => ({
            ...h,
            distance: round1(h.distance),
            efficiency: h.distance > 0 ? round1((h.consumption / h.distance) * 100) : null,
        }));
    }

    /**
     * Back-compat consumption by hour
     */
    processConsumptionByTimeOfDay(data) {
        return this.hourlyProfile(data)
            .filter((h) => h.trips > 0)
            .map((h) => ({ hour: h.hour, totalConsumption: h.consumption, trips: h.trips, avgConsumption: h.consumption / h.trips }));
    }

    // ------------------------------------------------------------------
    // Battery
    // ------------------------------------------------------------------

    /**
     * SOC per trip (chronological, last N) with the charge gained before it
     */
    socTimeline(data, count = 40) {
        const trips = data.filter((t) => t.socSource > 0 || t.socDestination > 0);
        const slice = trips.slice(-count);
        const offset = trips.length - slice.length;
        return slice.map((t, i) => {
            const prev = trips[offset + i - 1];
            const charged = prev ? Math.max(0, t.socSource - prev.socDestination) : 0;
            return {
                i,
                id: t.id,
                label: t.startTs ? formatDateTimeLabel(new Date(t.startTs)) : t.startDate,
                start: t.socSource,
                end: t.socDestination,
                drop: t.socDrop,
                charged,
                distance: t.distanceKm,
            };
        });
    }

    /**
     * Back-compat SOC data
     */
    processSOCData(data, count = 20) {
        return this.socTimeline(data, count).map((p, idx) => ({ trip: `Trip ${idx + 1}`, startSOC: p.start, endSOC: p.end, drop: p.drop }));
    }

    /**
     * Sparkline helper: last N period values of one metric
     */
    sparkline(data, metric = 'distance', granularity = 'week', points = 12) {
        return this.aggregateByPeriod(data, granularity).slice(-points).map((p) => ({ label: p.label, value: p[metric] ?? 0 }));
    }
}

