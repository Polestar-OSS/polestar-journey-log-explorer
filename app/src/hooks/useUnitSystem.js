import { useCallback } from 'react';
import { usePreferences } from './usePreferences';
import { normalizeSystem, convertFuelPrice } from '../services/units/UnitSystem';

/** Display units, persisted. Switching converts the saved fuel price so it stays per litre or per gallon correctly. */
export const useUnitSystem = () => {
    const [prefs, update] = usePreferences();
    const system = normalizeSystem(prefs.unitSystem);
    const setSystem = useCallback((next) => {
        const target = normalizeSystem(next);
        if (target === system) return;
        if (typeof prefs.fuelPrice === 'number') update('fuelPrice', Math.round(convertFuelPrice(prefs.fuelPrice, system, target) * 1000) / 1000);
        update('unitSystem', target);
    }, [system, prefs.fuelPrice, update]);
    return [system, setSystem];
};
