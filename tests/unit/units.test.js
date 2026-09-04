import { describe, it, expect } from 'vitest';
import { convertDistance, convertFuelPrice, convertJourney, distanceUnitFor, fromCents, toCents, systemForDistanceUnit, L_PER_GAL, KM_PER_MI } from '../../app/src/services/units/UnitSystem.js';
import { processRawRows } from '../../app/src/utils/dataParser.js';
import { HEADERS_KM, SMALL_EXPORT } from '../fixtures/rows.js';

describe('UnitSystem', () => {
    it('maps systems to units both ways', () => {
        expect(distanceUnitFor('metric')).toBe('km');
        expect(distanceUnitFor('imperial')).toBe('mi');
        expect(distanceUnitFor('nonsense')).toBe('km');
        expect(systemForDistanceUnit('mi')).toBe('imperial');
    });

    it('converts distances and pump prices', () => {
        expect(convertDistance(100, 'km', 'mi')).toBeCloseTo(100 / KM_PER_MI, 6);
        expect(convertDistance(100, 'mi', 'km')).toBeCloseTo(100 * KM_PER_MI, 6);
        expect(convertFuelPrice(1.7, 'metric', 'imperial')).toBeCloseTo(1.7 * L_PER_GAL, 6);
        expect(convertFuelPrice(4.07, 'imperial', 'metric')).toBeCloseTo(4.07 / L_PER_GAL, 6);
        expect(convertFuelPrice(1.7, 'metric', 'metric')).toBe(1.7);
        expect(toCents(1.708)).toBe(170.8);
        expect(fromCents(171)).toBe(1.71);
        expect(fromCents(null)).toBeNull();
    });

    it('converts a journey once and returns the same object when nothing changes', () => {
        const { data } = processRawRows(SMALL_EXPORT, HEADERS_KM);
        const journey = { data, distanceUnit: 'km', sources: [] };
        expect(convertJourney(journey, 'km')).toBe(journey);
        const mi = convertJourney(journey, 'mi');
        expect(mi.distanceUnit).toBe('mi');
        expect(mi.data[0].distanceKm).toBeCloseTo(data[0].distanceKm / KM_PER_MI, 1);
        expect(mi.data[0].efficiency).toBeGreaterThan(data[0].efficiency); // kWh per 100 mi is a bigger number
        expect(convertJourney(null, 'mi')).toBeNull();
    });
});
