import { useCallback, useMemo } from 'react';
import { usePreferences } from './usePreferences';
import { DEFAULT_VEHICLE_ID, findVehicle } from '../services/comparison/Vehicles';

/** The petrol/hybrid car the user compares against, and their fuel price. Both persisted. */
export const useComparison = () => {
    const [prefs, update] = usePreferences();
    const explicit = Boolean(findVehicle(prefs.comparisonVehicleId));
    const vehicle = useMemo(() => findVehicle(prefs.comparisonVehicleId) ?? findVehicle(DEFAULT_VEHICLE_ID), [prefs.comparisonVehicleId]);
    const fuelPrice = typeof prefs.fuelPrice === 'number' && prefs.fuelPrice > 0 ? prefs.fuelPrice : null;
    const setVehicleId = useCallback((id) => update('comparisonVehicleId', id), [update]);
    const setFuelPrice = useCallback((v) => update('fuelPrice', typeof v === 'number' && v > 0 ? v : null), [update]);
    return { vehicle, fuelPrice, explicit, setVehicleId, setFuelPrice };
};
