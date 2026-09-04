const BASE = import.meta.env.BASE_URL;

/**
 * Polestar OSS logo variants (app/public, sourced from /assets on main):
 *  - logo-white / logo-black: transparent, for dark / light surfaces
 *  - logo-grey: transparent neutral, for footers and muted contexts
 *  - logo-padded: on the brand green, works on any background
 *  - favicon: square, padded, on the brand green
 */
export const logoFor = (scheme) => `${BASE}${scheme === 'dark' ? 'logo-white.png' : 'logo-black.png'}`;
export const LOGO_GREY = `${BASE}logo-grey.png`;
export const LOGO_PADDED = `${BASE}logo-padded.png`;
export const FAVICON = `${BASE}favicon.png`;
