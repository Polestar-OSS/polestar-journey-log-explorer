import { JourneyMerger } from '../ingest/JourneyMerger';

/**
 * UnitSystem - the one place that knows metric from imperial.
 *
 * Trips are parsed in the unit their export used and merged into one unit.
 * The user picks a display system (metric by default); the journey is
 * converted once at the boundary (App) and every service and component
 * below it works in that unit without knowing a preference exists.
 * Fuel prices are stored per litre (metric) or per US gallon (imperial)
 * and converted when the system changes, so a saved price stays right.
 */
export const KM_PER_MI = 1.609344;
export const L_PER_GAL = 3.785411784;

export const UNIT_SYSTEMS = [
    { value: 'metric', label: 'Metric', description: 'km, kWh/100 km, litres' },
    { value: 'imperial', label: 'Imperial', description: 'miles, kWh/100 mi, US gallons' },
];

export const normalizeSystem = (system) => (system === 'imperial' ? 'imperial' : 'metric');
export const distanceUnitFor = (system) => (normalizeSystem(system) === 'imperial' ? 'mi' : 'km');
export const systemForDistanceUnit = (unit) => (unit === 'mi' ? 'imperial' : 'metric');
export const fuelUnitFor = (system) => (normalizeSystem(system) === 'imperial' ? 'gal' : 'L');
export const fuelUnitLabel = (system) => (normalizeSystem(system) === 'imperial' ? 'US gallon' : 'litre');

export const convertDistance = (value, fromUnit, toUnit) => {
    if (fromUnit === toUnit || value === null || value === undefined) return value;
    return fromUnit === 'mi' ? value * KM_PER_MI : value / KM_PER_MI;
};

/** Price per litre ↔ price per US gallon. */
export const convertFuelPrice = (price, fromSystem, toSystem) => {
    if (typeof price !== 'number' || normalizeSystem(fromSystem) === normalizeSystem(toSystem)) return price;
    return normalizeSystem(toSystem) === 'imperial' ? price * L_PER_GAL : price / L_PER_GAL;
};

/** Pump prices are quoted in cents; the app stores major units. */
export const toCents = (price) => (typeof price === 'number' ? Math.round(price * 100 * 10) / 10 : null);
export const fromCents = (cents) => (typeof cents === 'number' ? Math.round(cents * 10) / 1000 : null);

/**
 * The merged journey in the display unit. Returns the same object when no
 * conversion is needed, so memoised consumers do not re-render.
 */
export const convertJourney = (journey, targetUnit) => {
    if (!journey || !journey.data?.length || journey.distanceUnit === targetUnit) return journey;
    return {
        ...journey,
        distanceUnit: targetUnit,
        data: journey.data.map((trip) => JourneyMerger.convertTrip(trip, journey.distanceUnit, targetUnit)),
    };
};
