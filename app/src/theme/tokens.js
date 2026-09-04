/**
 * Design tokens - the single source of truth for colors used outside CSS
 * (charts, map features, canvas). CSS custom properties in global.css mirror
 * these values; keep both in sync.
 *
 * Categorical palettes were validated for colour-vision deficiency (all-pairs
 * OKLab ΔE >= 8, normal-vision ΔE >= 15, >= 3:1 contrast on their surface).
 */
export const LIGHT = {
    scheme: 'light',
    page: '#f4f4f2',
    surface: '#ffffff',
    surface2: '#f7f7f5',
    ink: '#101010',
    ink2: '#52514e',
    muted: '#898781',
    grid: '#e8e7e1',
    axis: '#c8c7c0',
    border: 'rgba(16, 16, 16, 0.10)',
    accent: '#e8590c',
    accentSoft: 'rgba(232, 89, 12, 0.12)',
    series: ['#e8590c', '#2a78d6', '#17996b'],
    context: '#c3c2b7',
    contextStrong: '#898781',
    status: { good: '#0a8f0a', warning: '#d9950a', serious: '#d9633a', critical: '#c93232' },
    // one-hue sequential ramp (orange), light -> dark
    sequential: ['#fdebdd', '#fbd0b0', '#f8b283', '#f39258', '#ec7233', '#e8590c', '#c04a0a', '#973a08', '#6e2a06'],
    tooltipBg: 'rgba(16, 16, 16, 0.92)',
    tooltipInk: '#f5f5f3',
};

export const DARK = {
    scheme: 'dark',
    page: '#0b0b0b',
    surface: '#151515',
    surface2: '#1c1c1c',
    ink: '#f5f5f3',
    ink2: '#c3c2b7',
    muted: '#898781',
    grid: '#262626',
    axis: '#383835',
    border: 'rgba(255, 255, 255, 0.10)',
    accent: '#ff7500',
    accentSoft: 'rgba(255, 117, 0, 0.16)',
    series: ['#ea5f10', '#3987e5', '#1aa374'],
    context: '#4a4a47',
    contextStrong: '#898781',
    status: { good: '#2fb52f', warning: '#fab219', serious: '#ec835a', critical: '#e05252' },
    // same hue, stepped for the dark surface: dim -> bright
    sequential: ['#2a1a10', '#4a2812', '#6e3612', '#944612', '#b85411', '#d95a0f', '#ee6f24', '#f98f4f', '#ffb282'],
    tooltipBg: 'rgba(245, 245, 243, 0.96)',
    tooltipInk: '#101010',
};

export const getTokens = (scheme) => (scheme === 'light' ? LIGHT : DARK);

/**
 * Efficiency thresholds (kWh/100km). Mirrors ColorCalculator / TableRowFormatter.
 * Scaled for miles by the caller.
 */
export const EFFICIENCY_THRESHOLDS_KM = { good: 15, ok: 20, poor: 25 };

export const efficiencyStatus = (efficiency, distanceUnit = 'km') => {
    const m = distanceUnit === 'mi' ? 1.60934 : 1;
    const eff = parseFloat(efficiency);
    if (!(eff > 0)) return 'unknown';
    if (eff < EFFICIENCY_THRESHOLDS_KM.good * m) return 'good';
    if (eff < EFFICIENCY_THRESHOLDS_KM.ok * m) return 'ok';
    if (eff < EFFICIENCY_THRESHOLDS_KM.poor * m) return 'poor';
    return 'bad';
};

export const statusColor = (tokens, status) => ({
    good: tokens.status.good,
    ok: tokens.status.warning,
    poor: tokens.status.serious,
    bad: tokens.status.critical,
    unknown: tokens.muted,
}[status] || tokens.muted);
