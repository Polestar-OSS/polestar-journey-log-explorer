import { formatDayLabel } from '../../utils/journeyDate';

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
