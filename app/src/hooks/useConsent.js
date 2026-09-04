import { useCallback, useMemo, useState } from 'react';
import { ConsentService } from '../services/consent/ConsentService';

/** The analytics consent decision, with the banner's open state. */
export const useConsent = () => {
    const service = useMemo(() => new ConsentService(), []);
    const [decision, setDecision] = useState(() => service.read());
    const [open, setOpen] = useState(() => service.read() === null);
    const decide = useCallback((analytics) => { setDecision(service.save(analytics)); setOpen(false); }, [service]);
    const reopen = useCallback(() => setOpen(true), []);
    return { decision, open, decide, reopen };
};
