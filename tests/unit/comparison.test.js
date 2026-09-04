import { describe, it, expect } from 'vitest';
import { VEHICLES, VEHICLE_MAKES, findVehicle, DEFAULT_VEHICLE_ID, validateMake, vehicleGroups } from '../../app/src/services/comparison/Vehicles.js';
import { VehicleComparison, TREE_CO2_KG_PER_YEAR } from '../../app/src/services/comparison/VehicleComparison.js';
import { processRawRows } from '../../app/src/utils/dataParser.js';
import { HEADERS_KM, HEADERS_MI, SMALL_EXPORT, row } from '../fixtures/rows.js';

const { data } = processRawRows(SMALL_EXPORT, HEADERS_KM); // 51.3 km over 4 days

describe('comparison vehicles (src/data/vehicles)', () => {
    it('validates every make file and carries provenance', () => {
        expect(VEHICLE_MAKES.length).toBeGreaterThan(0);
        VEHICLE_MAKES.forEach((doc) => {
            expect(validateMake(doc, doc.fileName)).toEqual([]);
            expect(doc.source).toMatch(/^https:\/\//);
            expect(doc.retrieved).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });
    });

    it('covers the six Volvo lines in petrol and plug-in hybrid form', () => {
        const models = new Set(VEHICLES.map((v) => v.model.split(' ')[0]));
        ['S60', 'S90', 'V60', 'V90', 'XC60', 'XC90'].forEach((m) => expect(models.has(m)).toBe(true));
        expect(VEHICLES.filter((v) => v.powertrain === 'plug-in-hybrid').length).toBeGreaterThanOrEqual(5);
        expect(VEHICLES.every((v) => Number.isInteger(v.epaVehicleId))).toBe(true);
    });

    it('derives L/100 km and CO2 from the EPA mpg consistently', () => {
        const xc60 = findVehicle('2025-xc60-b5-awd');
        expect(xc60.mpg.combined).toBe(26);
        expect(xc60.lPer100km).toBeCloseTo((100 * 3.785411784) / (26 * 1.609344), 2);
        expect(xc60.co2GPerKm).toBeCloseTo(8887 / 26 / 1.609344, 0);
        expect(findVehicle(DEFAULT_VEHICLE_ID).model).toBe('XC60');
        expect(vehicleGroups().map((g) => g.group)).toContain('Volvo XC90');
    });

    it('rejects a vehicle without a source or with an impossible figure', () => {
        expect(validateMake({ make: 'X', retrieved: '2026-01-01', vehicles: [] }).join(' ')).toMatch(/source/);
        const errors = validateMake({ make: 'X', source: 'https://x', retrieved: '2026-01-01', vehicles: [{ id: 'a', year: 2025, make: 'X', model: 'Y', trim: 'Z', powertrain: 'plug-in-hybrid', mpg: { combined: 0 }, lPer100km: 5, co2GPerKm: 100 }] });
        expect(errors.join(' ')).toMatch(/mpg.combined/);
        expect(errors.join(' ')).toMatch(/electric/);
    });
});

describe('VehicleComparison', () => {
    const cmp = new VehicleComparison({ distanceUnit: 'km' });

    it('prices a petrol car on distance alone and states CO2 in kg', () => {
        const xc60 = findVehicle('2025-xc60-b5-awd');
        const r = cmp.compare(data, xc60, { fuelPrice: 1.5, evCostTotal: 2 });
        expect(r.litres).toBeCloseTo((51.3 / 100) * xc60.lPer100km, 2);
        expect(r.fuelUnit).toBe('L');
        expect(r.co2Kg).toBeCloseTo((51.3 * xc60.co2GPerKm) / 1000, 1);
        expect(r.treeYears).toBeCloseTo(r.co2Kg / TREE_CO2_KG_PER_YEAR, 1);
        expect(r.fuelCost).toBeCloseTo(r.litres * 1.5, 2);
        expect(r.saving).toBeCloseTo(r.fuelCost - 2, 2);
        expect(r.electricSharePct).toBe(0);
    });

    it('leaves costs null without a fuel price', () => {
        const r = cmp.compare(data, findVehicle('2025-xc60-b5-awd'));
        expect(r.fuelCost).toBeNull();
        expect(r.saving).toBeNull();
        expect(r.priced).toBe(false);
        expect(r.co2Kg).toBeGreaterThan(0);
    });

    it('drives a plug-in hybrid electric-first each day up to its range', () => {
        const t8 = findVehicle('2025-xc60-t8-awd'); // 57.9 km electric range
        // Two days: 40 km + 40 km on day 1 (80 km), 20 km on day 2
        const trips = processRawRows([
            row({ start: '2026-03-02, 08:00', end: '2026-03-02, 09:00', km: 40, kwh: 8, odo: 1000 }),
            row({ start: '2026-03-02, 18:00', end: '2026-03-02, 19:00', km: 40, kwh: 8, odo: 1040 }),
            row({ start: '2026-03-03, 08:00', end: '2026-03-03, 08:30', km: 20, kwh: 4, odo: 1080 }),
        ], HEADERS_KM).data;
        const r = cmp.compare(trips, t8, { fuelPrice: 1.5, evCostPerKwh: 0.1, evCostTotal: 2 });
        expect(r.electricKm).toBeCloseTo(57.9 + 20, 1);
        expect(r.petrolKm).toBeCloseTo(80 - 57.9, 1);
        expect(r.electricSharePct).toBeCloseTo(((57.9 + 20) / 100) * 100, 0);
        expect(r.electricKwh).toBeCloseTo(((57.9 + 20) / 100) * t8.electric.kwhPer100km, 1);
        expect(r.totalCost).toBeCloseTo(r.fuelCost + r.electricCost, 1);
    });

    it('reports gallons for mile exports and converts the range', () => {
        const mi = processRawRows(SMALL_EXPORT.map((r) => ({ ...r, 'Distance in Mile': r['Distance in KM'] })), HEADERS_MI).data; // distances read as miles
        const r = new VehicleComparison({ distanceUnit: 'mi' }).compare(mi, findVehicle('2025-xc60-b5-awd'), { fuelPrice: 3.5 });
        expect(r.fuelUnit).toBe('gal');
        expect(r.distanceKm).toBeCloseTo(51.3 * 1.609344, 1);
        expect(r.fuel).toBeCloseTo(r.litres / 3.785411784, 2);
    });

    it('returns null without a vehicle or trips', () => {
        expect(cmp.compare([], findVehicle('2025-xc60-b5-awd'))).toBeNull();
        expect(cmp.compare(data, null)).toBeNull();
    });
});
