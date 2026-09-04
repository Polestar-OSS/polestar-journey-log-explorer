const BASE = import.meta.env.BASE_URL;

/** Logo asset for the active colour scheme */
export const logoFor = (scheme) => `${BASE}${scheme === 'dark' ? 'logo-white.png' : 'logo-black.png'}`;
