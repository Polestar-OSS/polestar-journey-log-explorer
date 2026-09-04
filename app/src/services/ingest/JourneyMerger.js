const KM_PER_MILE = 1.60934;

const round = (n, digits = 2) => Math.round(n * 10 ** digits) / 10 ** digits;

/**
 * JourneyMerger - combines several Journey Log exports into one trip set.
 *
 * Exports overlap constantly (the app exports a date range, and people
 * re-export as the log grows), so the merge is a set union keyed on the
 * trip's identity rather than a concatenation. Distances are normalised to
 * one unit so a km export and a mile export can live in the same dashboard.
 *
 * Single Responsibility: only merging, de-duplication and unit normalisation.
 * Parsing lives in dataParser; statistics live in their own services.
 */
export class JourneyMerger {
    /**
     * Identity of a trip across exports. Start and end timestamps pin the
     * drive; the rounded distance guards against two different drives that
     * happened to share a minute (e.g. a merged trip re-exported as two).
     */
    static tripKey(trip) {
        const start = trip.startTs ?? trip.startDate;
        const end = trip.endTs ?? trip.endDate;
        return `${start}|${end}|${round(trip.distanceKm, 1)}`;
    }

    /**
     * Convert one trip's distance-bearing fields between km and mi.
     */
    static convertTrip(trip, fromUnit, toUnit) {
        if (fromUnit === toUnit) return trip;
        const factor = fromUnit === 'mi' && toUnit === 'km' ? KM_PER_MILE : 1 / KM_PER_MILE;
        const distanceKm = round(trip.distanceKm * factor, 2);
        return {
            ...trip,
            distanceKm,
            startOdometer: Math.round(trip.startOdometer * factor),
            endOdometer: Math.round(trip.endOdometer * factor),
            efficiency: distanceKm > 0 ? round((trip.consumptionKwh / distanceKm) * 100, 2) : 0,
            avgSpeed: trip.avgSpeed !== null && trip.avgSpeed !== undefined ? round(trip.avgSpeed * factor, 1) : trip.avgSpeed,
        };
    }

    /**
     * @param {Array<{fileName: string, data: Array, distanceUnit: 'km'|'mi'}>} sources
     * @param {{ distanceUnit?: 'km'|'mi' }} options - target unit; defaults to the first source's unit
     * @returns {{ data: Array, distanceUnit: string, sources: Array, duplicatesRemoved: number }}
     */
    merge(sources, options = {}) {
        const valid = (sources || []).filter((s) => s && Array.isArray(s.data));
        if (valid.length === 0) return { data: [], distanceUnit: options.distanceUnit || 'km', sources: [], duplicatesRemoved: 0 };

        const targetUnit = options.distanceUnit || valid[0].distanceUnit || 'km';
        const seen = new Map();
        const merged = [];
        const summaries = [];

        valid.forEach((source, index) => {
            const unit = source.distanceUnit || 'km';
            let added = 0;
            let duplicates = 0;
            let conflicts = 0;

            source.data.forEach((raw) => {
                const trip = JourneyMerger.convertTrip(raw, unit, targetUnit);
                const key = JourneyMerger.tripKey(trip);
                const existing = seen.get(key);
                if (existing) {
                    duplicates += 1;
                    if (!JourneyMerger.sameTrip(existing, trip)) conflicts += 1;
                    return;
                }
                const withSource = { ...trip, sourceFile: source.fileName || `File ${index + 1}`, sourceIndex: index };
                seen.set(key, withSource);
                merged.push(withSource);
                added += 1;
            });

            summaries.push({
                fileName: source.fileName || `File ${index + 1}`,
                distanceUnit: unit,
                trips: source.data.length,
                added,
                duplicates,
                conflicts,
                firstTs: source.data.reduce((m, t) => (t.startTs !== null && (m === null || t.startTs < m) ? t.startTs : m), null),
                lastTs: source.data.reduce((m, t) => (t.startTs !== null && (m === null || t.startTs > m) ? t.startTs : m), null),
            });
        });

        merged.sort((a, b) => (a.startTs ?? 0) - (b.startTs ?? 0) || a.sourceIndex - b.sourceIndex);
        const data = merged.map((trip, id) => ({ ...trip, id }));

        return {
            data,
            distanceUnit: targetUnit,
            sources: summaries,
            duplicatesRemoved: summaries.reduce((s, x) => s + x.duplicates, 0),
        };
    }

    /**
     * Two records with the same key that disagree on energy or SOC are
     * "conflicts": the first one wins, but the count is surfaced so the user
     * knows the exports disagreed.
     */
    static sameTrip(a, b) {
        return (
            Math.abs(a.consumptionKwh - b.consumptionKwh) < 0.01 &&
            a.socSource === b.socSource &&
            a.socDestination === b.socDestination
        );
    }
}
