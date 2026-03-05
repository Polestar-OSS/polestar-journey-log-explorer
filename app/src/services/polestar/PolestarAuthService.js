/**
 * Polestar OAuth 2.0 PKCE Authentication Service
 *
 * JavaScript port of the pypolestar Python authentication library:
 * https://github.com/pypolestar/pypolestar
 *
 * Uses the Authorization Code + PKCE flow designed for browser-based apps.
 * All authentication happens client-side – credentials and tokens never leave
 * the user's browser.
 */

export const OIDC_PROVIDER_BASE_URL = 'https://polestarid.eu.polestar.com';
export const OIDC_CLIENT_ID = 'l3oopkc_10';
export const OIDC_REDIRECT_URI = 'https://www.polestar.com/sign-in-callback';
export const OIDC_SCOPE = 'openid profile email customer:attributes';

const SESSION_KEY_CODE_VERIFIER = 'polestar_pkce_code_verifier';
const SESSION_KEY_STATE = 'polestar_oauth_state';

// ---------------------------------------------------------------------------
// PKCE helpers (Web Crypto API – available in all modern browsers)
// ---------------------------------------------------------------------------

function b64urlencode(buffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

function generateCodeVerifier() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return b64urlencode(array);
}

async function generateCodeChallenge(verifier) {
    const data = new TextEncoder().encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return b64urlencode(hash);
}

function generateState() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return b64urlencode(array);
}

// ---------------------------------------------------------------------------
// OIDC configuration
// ---------------------------------------------------------------------------

let _oidcConfigCache = null;

export async function fetchOidcConfiguration() {
    if (_oidcConfigCache) return _oidcConfigCache;

    const response = await fetch(
        `${OIDC_PROVIDER_BASE_URL}/.well-known/openid-configuration`
    );

    if (!response.ok) {
        throw new Error(
            `Failed to fetch OIDC configuration (HTTP ${response.status})`
        );
    }

    _oidcConfigCache = await response.json();
    return _oidcConfigCache;
}

// ---------------------------------------------------------------------------
// OAuth PKCE flow
// ---------------------------------------------------------------------------

/**
 * Start the OAuth PKCE authorization flow.
 *
 * Generates a code verifier + challenge, persists them in sessionStorage,
 * and returns the URL the user should be directed to for authentication.
 *
 * @returns {{ url: string, state: string, codeVerifier: string }}
 */
export async function startOAuthFlow() {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = generateState();

    sessionStorage.setItem(SESSION_KEY_CODE_VERIFIER, codeVerifier);
    sessionStorage.setItem(SESSION_KEY_STATE, state);

    const oidcConfig = await fetchOidcConfiguration();

    const params = new URLSearchParams({
        client_id: OIDC_CLIENT_ID,
        redirect_uri: OIDC_REDIRECT_URI,
        response_type: 'code',
        scope: OIDC_SCOPE,
        state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        response_mode: 'query',
    });

    return {
        url: `${oidcConfig.authorization_endpoint}?${params.toString()}`,
        state,
        codeVerifier,
    };
}

/**
 * Parse the authorization code from the Polestar callback URL.
 *
 * After the user logs in, Polestar redirects to:
 * https://www.polestar.com/sign-in-callback?code=XXX&state=YYY
 *
 * @param {string} callbackUrl - The full callback URL (or just the query string)
 * @returns {{ code: string, state: string | null }}
 */
export function parseCallbackUrl(callbackUrl) {
    let urlToParse = callbackUrl.trim();

    // Accept bare query strings like ?code=XXX or code=XXX
    if (!urlToParse.startsWith('http')) {
        if (!urlToParse.startsWith('?')) urlToParse = '?' + urlToParse;
        urlToParse = 'https://placeholder.invalid/' + urlToParse;
    }

    let url;
    try {
        url = new URL(urlToParse);
    } catch {
        throw new Error('Invalid URL. Please paste the full callback URL from your browser.');
    }

    const code = url.searchParams.get('code');
    if (!code) {
        throw new Error(
            'No authorization code found in the URL. ' +
            'Make sure you copied the full URL after signing in.'
        );
    }

    return { code, state: url.searchParams.get('state') };
}

/**
 * Exchange an authorization code for access/refresh tokens.
 *
 * @param {string} code - The authorization code from the callback URL
 * @param {string} [codeVerifier] - The PKCE code verifier (falls back to sessionStorage)
 * @returns {Promise<{ access_token: string, refresh_token: string, expires_in: number }>}
 */
export async function exchangeCodeForToken(code, codeVerifier) {
    const verifier =
        codeVerifier || sessionStorage.getItem(SESSION_KEY_CODE_VERIFIER);

    if (!verifier) {
        throw new Error(
            'PKCE code verifier not found. ' +
            'Please restart the authentication flow.'
        );
    }

    const oidcConfig = await fetchOidcConfiguration();

    const body = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: OIDC_CLIENT_ID,
        code,
        redirect_uri: OIDC_REDIRECT_URI,
        code_verifier: verifier,
    });

    const response = await fetch(oidcConfig.token_endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
    });

    if (!response.ok) {
        let message = `Token exchange failed (HTTP ${response.status})`;
        try {
            const payload = await response.json();
            if (payload.error_description) message = payload.error_description;
            else if (payload.error) message = payload.error;
        } catch { /* ignore */ }
        throw new Error(message);
    }

    const tokens = await response.json();

    // Clean up session storage after successful exchange
    sessionStorage.removeItem(SESSION_KEY_CODE_VERIFIER);
    sessionStorage.removeItem(SESSION_KEY_STATE);

    return tokens;
}

/**
 * Refresh an expired access token using a refresh token.
 *
 * @param {string} refreshToken
 * @returns {Promise<{ access_token: string, refresh_token: string, expires_in: number }>}
 */
export async function refreshAccessToken(refreshToken) {
    const oidcConfig = await fetchOidcConfiguration();

    const body = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: OIDC_CLIENT_ID,
        refresh_token: refreshToken,
    });

    const response = await fetch(oidcConfig.token_endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
    });

    if (!response.ok) {
        throw new Error(`Token refresh failed (HTTP ${response.status})`);
    }

    return response.json();
}
