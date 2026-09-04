import { useCallback, useMemo } from 'react';
import { usePreferences } from './usePreferences';
import { normalizeTariff } from '../services/cost/TariffModel';

/**
 * The persisted tariff, always normalised. Older preference files carried a
 * single `electricityRate` + `currency` from the previous cost calculator;
 * they seed a flat tariff the first time.
 */
export const useTariff = () => {
    const [prefs, update] = usePreferences();
    const tariff = useMemo(() => {
        if (prefs.tariff) return normalizeTariff(prefs.tariff);
        return normalizeTariff({ currency: prefs.currency, flat: { rate: prefs.electricityRate }, publicCharging: { enabled: true, sharePct: 100 - (prefs.homeChargingPercent ?? 80), rate: (prefs.electricityRate ?? 0.13) * 2.5 } });
    }, [prefs.tariff, prefs.currency, prefs.electricityRate, prefs.homeChargingPercent]);

    const setTariff = useCallback((next) => {
        const value = typeof next === 'function' ? next(tariff) : next;
        update('tariff', normalizeTariff(value));
    }, [tariff, update]);

    return [tariff, setTariff];
};
