import { hasCoordinates } from '../../utils/geo';

/** Gothenburg, where the sample lives; used when nothing has coordinates. */
export const FALLBACK_CENTER = [11.9746, 57.7089]; // [lng, lat]

/**
 * MapDataProcessor - the trip set as the map needs it: only trips with
 * coordinates, newest first, grouped by day for chains and replay, and a
 * centre to open on. Pure; no OpenLayers.
 */
export class MapDataProcessor {
    prepare(data) {
        const valid = (data || []).filter(hasCoordinates);
        if (valid.length === 0) return { center: FALLBACK_CENTER, allTrips: [], tripsByDay: {} };
        const tripsByDay = valid.reduce((acc, trip) => {
            const day = trip.dayKey || trip.startDate.split(',')[0].trim();
            (acc[day] ||= []).push(trip);
            return acc;
        }, {});
        Object.values(tripsByDay).forEach((list) => list.sort((a, b) => (a.startTs ?? 0) - (b.startTs ?? 0)));
        const allTrips = [...valid].sort((a, b) => (b.startTs ?? 0) - (a.startTs ?? 0));
        return { center: this.centerOf(valid), allTrips, tripsByDay };
    }

    /** Mean of the start points, [lng, lat]. */
    centerOf(trips) {
        const valid = (trips || []).filter(hasCoordinates);
        if (!valid.length) return FALLBACK_CENTER;
        const lat = valid.reduce((s, t) => s + t.startLat, 0) / valid.length;
        const lng = valid.reduce((s, t) => s + t.startLng, 0) / valid.length;
        return [Number.isFinite(lng) ? lng : FALLBACK_CENTER[0], Number.isFinite(lat) ? lat : FALLBACK_CENTER[1]];
    }
}
