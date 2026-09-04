/**
 * Journey Log dates arrive as strings shaped "YYYY-MM-DD, HH:MM".
 * `new Date()` on that string is engine-dependent (V8 accepts it, Firefox and
 * Safari return Invalid Date), so every consumer must go through this parser.
 */
const DATE_RE = /(\d{4})-(\d{1,2})-(\d{1,2})(?:[,T\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/;

export const parseJourneyDate = (value) => {
    if (value === null || value === undefined || value === '') return null;
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
    if (typeof value === 'number') {
        const d = new Date(value);
        return isNaN(d.getTime()) ? null : d;
    }
    const m = String(value).match(DATE_RE);
    if (m) {
        return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
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

export const seasonOf = (date) => {
    const m = date.getMonth();
    if (m === 11 || m <= 1) return 'winter';
    if (m <= 4) return 'spring';
    if (m <= 7) return 'summer';
    return 'autumn';
};
