import { describe, it, expect } from 'vitest';
import {
    parseJourneyDate,
    formatJourneyDate,
    dayKey,
    monthKey,
    weekKey,
    startOfWeek,
    formatDuration,
    mondayIndex,
    seasonOf,
} from '../../app/src/utils/journeyDate.js';

describe('parseJourneyDate', () => {
    it('parses the Journey Log "YYYY-MM-DD, HH:MM" format as local time', () => {
        const d = parseJourneyDate('2026-09-03, 22:03');
        expect(d).toBeInstanceOf(Date);
        expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]).toEqual([2026, 8, 3, 22, 3]);
    });

    it('accepts ISO strings (honouring their timezone), Date objects and epoch numbers', () => {
        expect(parseJourneyDate('2026-01-05T08:30:00').getHours()).toBe(8); // no designator: local, as Date does
        expect(parseJourneyDate('2026-01-05T08:30:00Z').getTime()).toBe(Date.UTC(2026, 0, 5, 8, 30));
        expect(parseJourneyDate('2026-01-05T08:30:00+02:00').getTime()).toBe(Date.UTC(2026, 0, 5, 6, 30));
        const now = new Date(2025, 0, 1, 12);
        expect(parseJourneyDate(now)).toBe(now);
        expect(parseJourneyDate(now.getTime()).getTime()).toBe(now.getTime());
    });

    it('matches the export format only as a whole string', () => {
        expect(parseJourneyDate('2026-09-03 22:03').getHours()).toBe(22); // space separator tolerated
        expect(parseJourneyDate('2026-09-03, 22:03:15').getSeconds()).toBe(15);
        expect(parseJourneyDate('2026-13-45, 10:00')).toBeNull(); // impossible date
        expect(parseJourneyDate('trip on 2026-09-03, 22:03 was long')).toBeNull(); // substring
    });

    it('returns null for blanks and garbage', () => {
        expect(parseJourneyDate('')).toBeNull();
        expect(parseJourneyDate(null)).toBeNull();
        expect(parseJourneyDate(undefined)).toBeNull();
        expect(parseJourneyDate('not a date')).toBeNull();
        expect(parseJourneyDate(new Date('x'))).toBeNull();
    });
});

describe('formatting and keys', () => {
    const d = new Date(2026, 8, 3, 7, 5);

    it('round-trips through the canonical string form', () => {
        expect(formatJourneyDate(d)).toBe('2026-09-03, 07:05');
        expect(parseJourneyDate(formatJourneyDate(d)).getTime()).toBe(d.getTime());
    });

    it('produces stable day, month and ISO week keys', () => {
        expect(dayKey(d)).toBe('2026-09-03');
        expect(monthKey(d)).toBe('2026-09');
        expect(weekKey(d)).toBe('2026-W36');
        // ISO week 1 edge: 2027-01-01 is a Friday in week 53 of 2026
        expect(weekKey(new Date(2027, 0, 1))).toBe('2026-W53');
    });

    it('startOfWeek returns the Monday of the same week', () => {
        const monday = startOfWeek(d);
        expect(monday.getDay()).toBe(1);
        expect(dayKey(monday)).toBe('2026-08-31');
        expect(dayKey(startOfWeek(new Date(2026, 8, 6)))).toBe('2026-08-31'); // Sunday belongs to the preceding Monday
    });

    it('mondayIndex maps Monday..Sunday to 0..6', () => {
        expect(mondayIndex(new Date(2026, 8, 7))).toBe(0); // Monday
        expect(mondayIndex(new Date(2026, 8, 6))).toBe(6); // Sunday
    });

    it('formats durations for humans', () => {
        expect(formatDuration(0)).toBe('0 min');
        expect(formatDuration(59)).toBe('59 min');
        expect(formatDuration(60)).toBe('1h 00m');
        expect(formatDuration(135)).toBe('2h 15m');
        expect(formatDuration(null)).toBe('–');
    });

    it('assigns meteorological seasons', () => {
        expect(seasonOf(new Date(2026, 0, 10))).toBe('winter');
        expect(seasonOf(new Date(2026, 11, 10))).toBe('winter');
        expect(seasonOf(new Date(2026, 3, 10))).toBe('spring');
        expect(seasonOf(new Date(2026, 6, 10))).toBe('summer');
        expect(seasonOf(new Date(2026, 9, 10))).toBe('autumn');
    });
});
