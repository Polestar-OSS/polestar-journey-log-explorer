export const CONSENT_STORAGE_KEY = 'polestar-journey-explorer:consent';
export const CONSENT_VERSION = 1;

export const PRIVACY_POLICY_URL = 'https://www.iubenda.com/privacy-policy/98712896';
export const COOKIE_POLICY_URL = 'https://www.iubenda.com/privacy-policy/98712896/cookie-policy';

/**
 * ConsentService - the visitor's decision about Google Analytics, the only
 * optional third party this site uses. Stored in localStorage, applied to
 * Google Consent Mode. Storage and gtag are injected so tests need no DOM.
 * There is nothing to consent to for the journey data itself: it never
 * leaves the browser.
 */
export class ConsentService {
    constructor({ storage = typeof localStorage !== 'undefined' ? localStorage : null, gtag = typeof window !== 'undefined' ? window.gtag : null } = {}) {
        this.storage = storage;
        this.gtag = gtag;
    }

    /** @returns {{ analytics: boolean, at: string } | null} null when the visitor has not decided */
    read() {
        try {
            const doc = JSON.parse(this.storage?.getItem(CONSENT_STORAGE_KEY) ?? 'null');
            if (!doc || doc.version !== CONSENT_VERSION || typeof doc.analytics !== 'boolean') return null;
            return { analytics: doc.analytics, at: doc.at };
        } catch {
            return null;
        }
    }

    save(analytics) {
        const doc = { version: CONSENT_VERSION, analytics: Boolean(analytics), at: new Date().toISOString() };
        try { this.storage?.setItem(CONSENT_STORAGE_KEY, JSON.stringify(doc)); } catch { /* storage unavailable; the choice holds for this visit */ }
        this.apply(doc.analytics);
        return doc;
    }

    clear() {
        try { this.storage?.removeItem(CONSENT_STORAGE_KEY); } catch { /* nothing to do */ }
        this.apply(false);
    }

    /** Push the decision to Google Consent Mode, if the tag is present. */
    apply(analytics) {
        if (typeof this.gtag !== 'function') return;
        this.gtag('consent', 'update', { analytics_storage: analytics ? 'granted' : 'denied' });
    }
}
