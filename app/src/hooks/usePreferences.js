import { useCallback, useEffect, useState } from 'react';
import { getAllPreferences, setPreference } from '../utils/preferences';

/**
 * Reactive view over the preference store. Any component that calls
 * setPreference (or another tab) updates every subscriber.
 */
export const usePreferences = () => {
    const [prefs, setPrefs] = useState(getAllPreferences);

    useEffect(() => {
        const onChange = (e) => setPrefs(e.detail ?? getAllPreferences());
        const onStorage = () => setPrefs(getAllPreferences());
        window.addEventListener('ps:preferences', onChange);
        window.addEventListener('storage', onStorage);
        return () => {
            window.removeEventListener('ps:preferences', onChange);
            window.removeEventListener('storage', onStorage);
        };
    }, []);

    const update = useCallback((key, value) => setPreference(key, value), []);
    return [prefs, update];
};

export const useExperienceLevel = () => {
    const [prefs, update] = usePreferences();
    return [prefs.experienceLevel, (level) => update('experienceLevel', level)];
};
