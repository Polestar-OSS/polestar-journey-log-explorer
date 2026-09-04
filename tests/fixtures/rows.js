/**
 * Synthetic rows shaped exactly like the Journey Log export (header names
 * included). Nothing here is real. Rows are newest-first, as the app exports
 * them, so tests also cover the chronological re-ordering.
 */
export const HEADERS_KM = [
    'Start Date', 'End Date', 'Start Address', 'End Address', 'Distance in KM', 'Consumption in Kwh', 'Category',
    'Start Latitude', 'Start Longitude', 'End Latitude', 'End Longitude', 'Start Odometer', 'End Odometer',
    'Trip Type', 'SOC Source', 'SOC Destination', 'Comments',
];

export const HEADERS_MI = HEADERS_KM.map((h) => (h === 'Distance in KM' ? 'Distance in Mile' : h));

const HOME = { lat: 57.6985, lng: 11.967, addr: 'Vasagatan 12, Göteborg' };
const WORK = { lat: 57.7065, lng: 11.9385, addr: 'Lindholmspiren 5, Göteborg' };
const SHOP = { lat: 57.725, lng: 11.964, addr: 'Backavägen 2, Göteborg' };

export const row = ({
    start, end, from = HOME, to = WORK, km = 6.4, kwh = 1.2, socStart = 80, socEnd = 78, odo = 1000, category = 'Uncategorized', type = 'SINGLE',
}) => ({
    'Start Date': start,
    'End Date': end,
    'Start Address': from.addr,
    'End Address': to.addr,
    'Distance in KM': km,
    'Consumption in Kwh': kwh,
    Category: category,
    'Start Latitude': from.lat,
    'Start Longitude': from.lng,
    'End Latitude': to.lat,
    'End Longitude': to.lng,
    'Start Odometer': odo,
    'End Odometer': odo + Math.round(km),
    'Trip Type': type,
    'SOC Source': socStart,
    'SOC Destination': socEnd,
    Comments: '',
});

export const PLACES = { HOME, WORK, SHOP };

/** A small, newest-first export covering two winter days and two summer days. */
export const SMALL_EXPORT = [
    row({ start: '2026-07-02, 17:10', end: '2026-07-02, 17:25', from: WORK, to: HOME, km: 6.5, kwh: 1.0, socStart: 70, socEnd: 69, odo: 1040 }),
    row({ start: '2026-07-02, 08:00', end: '2026-07-02, 08:14', km: 6.3, kwh: 1.0, socStart: 80, socEnd: 79, odo: 1033 }),
    row({ start: '2026-07-01, 17:05', end: '2026-07-01, 17:20', from: WORK, to: HOME, km: 6.4, kwh: 1.1, socStart: 78, socEnd: 77, odo: 1026 }),
    row({ start: '2026-07-01, 08:02', end: '2026-07-01, 08:16', km: 6.4, kwh: 1.1, socStart: 80, socEnd: 79, odo: 1020 }),
    row({ start: '2026-01-13, 17:12', end: '2026-01-13, 17:31', from: WORK, to: HOME, km: 6.4, kwh: 1.8, socStart: 72, socEnd: 70, odo: 1013 }),
    row({ start: '2026-01-13, 08:03', end: '2026-01-13, 08:22', km: 6.5, kwh: 1.9, socStart: 90, socEnd: 88, odo: 1006 }),
    row({ start: '2026-01-12, 17:01', end: '2026-01-12, 17:20', from: WORK, to: HOME, km: 6.4, kwh: 1.7, socStart: 74, socEnd: 72, odo: 1000 }),
    row({ start: '2026-01-12, 08:05', end: '2026-01-12, 08:24', km: 6.4, kwh: 1.8, socStart: 80, socEnd: 78, odo: 994 }),
    // zero-distance row: the app filters these out
    row({ start: '2026-01-11, 12:00', end: '2026-01-11, 12:00', km: 0, kwh: 0, socStart: 80, socEnd: 80, odo: 994 }),
];
