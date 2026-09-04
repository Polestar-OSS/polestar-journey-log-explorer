import { formatDayLabel } from '../../utils/journeyDate';

const EARTH_M = 6371000;
const toRad = (d) => (d * Math.PI) / 180;
/** Great-circle distance in metres between two [lng, lat] points. */
export const haversineM = ([lng1, lat1], [lng2, lat2]) => {
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * EARTH_M * Math.asin(Math.sqrt(a));
};
/** Bearing in radians, clockwise from north, from a to b. */
export const bearingRad = ([lng1, lat1], [lng2, lat2]) => {
    const y = Math.sin(toRad(lng2 - lng1)) * Math.cos(toRad(lat2));
    const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lng2 - lng1));
    return Math.atan2(y, x);
};

/**
 * ReplayService - the timeline behind "replay your driving". Builds one
 * frame per calendar day that has trips, with the trips of that day and
 * running totals, so the view only has to move a cursor.
 *
 * Pure: no timers, no map. The view owns play/pause.
 */
export class ReplayService {
    /**
     * @param {Array} trips - chronological trip model
     * @returns {{ frames: Array, totalDays: number }}
     */
    build(trips) {
        const dated = trips.filter((t) => t.startTs !== null && t.dayKey);
        const byDay = new Map();
        dated.forEach((t) => {
            if (!byDay.has(t.dayKey)) byDay.set(t.dayKey, []);
            byDay.get(t.dayKey).push(t);
        });
        let tripCount = 0;
        let distance = 0;
        let energy = 0;
        const frames = [...byDay.entries()]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([dayKey, dayTrips], index) => {
                tripCount += dayTrips.length;
                distance += dayTrips.reduce((s, t) => s + t.distanceKm, 0);
                energy += dayTrips.reduce((s, t) => s + t.consumptionKwh, 0);
                const first = new Date(dayTrips[0].startTs);
                return {
                    index,
                    dayKey,
                    ts: dayTrips[0].startTs,
                    label: `${formatDayLabel(first)} ${first.getFullYear()}`,
                    trips: dayTrips,
                    cumulative: { trips: tripCount, distance: Math.round(distance * 10) / 10, energy: Math.round(energy * 10) / 10 },
                };
            });
        return { frames, totalDays: frames.length };
    }

    /**
     * The path a trip is drawn along: the snapped road path when there is one,
     * else the straight line from start to end. Always [lng, lat] pairs.
     */
    static pathOf(trip, path = null) {
        if (Array.isArray(path) && path.length > 1) return path;
        return [[trip.startLng, trip.startLat], [trip.endLng, trip.endLat]];
    }

    /**
     * One day's trips as a continuous drive: legs in order, each with its
     * coordinates and cumulative length, so a single 0..1 fraction places the
     * car. Legs with no length (missing coordinates) are kept but take no time.
     * @param {Array} trips - the frame's trips, chronological
     * @param {(trip) => Array|null} pathFor - snapped path lookup
     */
    static timeline(trips, pathFor = () => null) {
        let total = 0;
        const legs = trips.map((trip, index) => {
            const coords = ReplayService.pathOf(trip, pathFor(trip));
            const cumulative = [0];
            for (let i = 1; i < coords.length; i++) cumulative.push(cumulative[i - 1] + haversineM(coords[i - 1], coords[i]));
            const length = cumulative[cumulative.length - 1];
            const leg = { index, trip, coords, cumulative, length, start: total };
            total += length;
            return leg;
        });
        return { legs, total };
    }

    /**
     * Where the car is at `fraction` (0..1) of the day, which legs are done
     * and how much of the current one is drawn.
     * @returns {{ legIndex, position: [lng, lat], heading, completed: Array<coords>, drawing: coords, done: boolean }}
     */
    static positionAt(timeline, fraction) {
        const { legs, total } = timeline;
        if (!legs.length) return { legIndex: -1, position: null, heading: 0, completed: [], drawing: [], done: true };
        const f = Math.max(0, Math.min(1, fraction));
        if (total <= 0 || f >= 1) {
            const last = legs[legs.length - 1];
            return { legIndex: legs.length - 1, position: last.coords[last.coords.length - 1], heading: 0, completed: legs.map((l) => l.coords), drawing: [], done: true };
        }
        const target = f * total;
        let legIndex = legs.findIndex((l) => target < l.start + l.length && l.length > 0);
        if (legIndex === -1) legIndex = legs.length - 1;
        const leg = legs[legIndex];
        const within = target - leg.start;
        let seg = 1;
        while (seg < leg.cumulative.length - 1 && leg.cumulative[seg] < within) seg++;
        const segStart = leg.cumulative[seg - 1];
        const segLen = leg.cumulative[seg] - segStart;
        const t = segLen > 0 ? (within - segStart) / segLen : 0;
        const a = leg.coords[seg - 1];
        const b = leg.coords[seg];
        const position = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
        return {
            legIndex,
            position,
            heading: bearingRad(a, b),
            completed: legs.slice(0, legIndex).map((l) => l.coords),
            drawing: [...leg.coords.slice(0, seg), position],
            done: false,
        };
    }

    /**
     * Trips visible at a cursor: everything up to and including the frame,
     * with a "trail" of the last N days emphasised and older days dimmed.
     */
    visibleAt(frames, cursor, trail = 7) {
        if (!frames.length) return { current: [], recent: [], older: [] };
        const idx = Math.max(0, Math.min(cursor, frames.length - 1));
        const current = frames[idx].trips;
        const recent = [];
        const older = [];
        for (let i = 0; i < idx; i++) {
            (idx - i <= trail ? recent : older).push(...frames[i].trips);
        }
        return { current, recent, older, frame: frames[idx] };
    }
}
