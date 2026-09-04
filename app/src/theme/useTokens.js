import { useComputedColorScheme } from '@mantine/core';
import { getTokens } from './tokens';

/** Resolved design tokens for the active colour scheme (charts, map, canvas). */
export const useTokens = () => {
    const scheme = useComputedColorScheme('dark', { getInitialValueInEffect: false });
    return getTokens(scheme);
};
