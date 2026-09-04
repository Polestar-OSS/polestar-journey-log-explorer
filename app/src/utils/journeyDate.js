/**
 * Journey Log dates arrive as strings shaped "YYYY-MM-DD, HH:MM".
 * `new Date()` on that string is engine-dependent (V8 accepts it, Firefox and
 * Safari return Invalid Date), so every consumer must go through this parser.
 */
// Exactly the export format: "YYYY-MM-DD, HH:MM" (seconds optional, comma or
// space separator). Anchored so ISO strings and substrings never match; those
// fall through to Date, which honours their timezone designators.
const EXPORT_RE = /^\s*(\d{4})-(\d{1,2})-(\d{1,2})(?:[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?\s*$/;

export const parseJourneyDate = (value) => {
    if (value === null || value === undefined || value === '') return null;
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
    if (typeof value === 'number') {
        const d = new Date(value);
        return isNaN(d.getTime()) ? null : d;
    }
    const m = String(value).match(EXPORT_RE);
    if (m) {
        const d = new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
        // Reject impossible dates such as 2026-13-45 that Date would silently roll over
        if (d.getMonth() !== +m[2] - 1 || d.getDate() !== +m[3]) return null;
        return d;
    }
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
};

const pad = (n) => String(n).padStart(2, '0');

/** "YYYY-MM-DD, HH:MM" - the canonical string form used across the app. */
export const formatJourneyDate = (date) => {
    if (!(date instanceof Date) || isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}, ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const dayKey = (date) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** Date → 'YYYY-MM-DD' for string-valued date inputs; null for anything else. */
export const toDateString = (date) => (date instanceof Date && !isNaN(date) ? dayKey(date) : null);

export const monthKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;

/** ISO week key "YYYY-Www" (Monday-based). */
export const weekKey = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    return `${d.getUTCFullYear()}-W${pad(week)}`;
};

/** Monday of the ISO week containing `date` (local time). */
export const startOfWeek = (date) => {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - (day - 1));
    return d;
};

export const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const addDays = (date, days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
};

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const WEEKDAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const formatMonthLabel = (key) => {
    const [y, m] = key.split('-');
    return `${MONTHS_SHORT[+m - 1]} ${String(y).slice(2)}`;
};

export const formatDayLabel = (date) => `${MONTHS_SHORT[date.getMonth()]} ${date.getDate()}`;

export const formatDateTimeLabel = (date) =>
    `${MONTHS_SHORT[date.getMonth()]} ${date.getDate()}, ${pad(date.getHours())}:${pad(date.getMinutes())}`;

export const formatDuration = (minutes) => {
    if (typeof minutes !== 'number' || !isFinite(minutes) || minutes < 0) return '–';
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    if (h === 0) return `${m} min`;
    return `${h}h ${pad(m)}m`;
};

/** 0 = Monday ... 6 = Sunday */
export const mondayIndex = (date) => (date.getDay() + 6) % 7;

/**
 * Meteorological season for a date. Southern hemisphere shifts by six
 * months (Dec–Feb is summer there), so callers pass the hemisphere the
 * trips were driven in.
 */
export const seasonOf = (date, hemisphere = 'north') => {
    const m = hemisphere === 'south' ? (date.getMonth() + 6) % 12 : date.getMonth();
    if (m === 11 || m <= 1) return 'winter';
    if (m <= 4) return 'spring';
    if (m <= 7) return 'summer';
    return 'autumn';
};

export const SEASON_MONTHS = {
    north: { winter: 'Dec–Feb', spring: 'Mar–May', summer: 'Jun–Aug', autumn: 'Sep–Nov' },
    south: { winter: 'Jun–Aug', spring: 'Sep–Nov', summer: 'Dec–Feb', autumn: 'Mar–May' },
};
