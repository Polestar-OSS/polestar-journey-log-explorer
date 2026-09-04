import { describe, it, expect, vi } from 'vitest';
import { ConsentService, CONSENT_STORAGE_KEY } from '../../app/src/services/consent/ConsentService.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };

describe('ConsentService', () => {
    it('starts undecided, stores a decision and pushes it to Consent Mode', () => {
        const gtag = vi.fn();
        const svc = new ConsentService({ storage: memory(), gtag });
        expect(svc.read()).toBeNull();
        svc.save(true);
        expect(svc.read().analytics).toBe(true);
        expect(gtag).toHaveBeenLastCalledWith('consent', 'update', { analytics_storage: 'granted' });
        svc.save(false);
        expect(gtag).toHaveBeenLastCalledWith('consent', 'update', { analytics_storage: 'denied' });
        svc.clear();
        expect(svc.read()).toBeNull();
    });

    it('ignores garbage and works without storage or gtag', () => {
        const bad = memory(); bad.setItem(CONSENT_STORAGE_KEY, '{"version":99}');
        expect(new ConsentService({ storage: bad, gtag: null }).read()).toBeNull();
        expect(() => new ConsentService({ storage: null, gtag: null }).save(true)).not.toThrow();
    });
});
