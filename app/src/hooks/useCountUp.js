import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '@mantine/hooks';

/**
 * Animates a number from its previous value to `target` over `duration` ms.
 * Honours prefers-reduced-motion by returning the target directly.
 */
export const useCountUp = (target, duration = 700) => {
    const reduced = useReducedMotion();
    const numeric = typeof target === 'number' && isFinite(target);
    const [animated, setAnimated] = useState(numeric ? 0 : target);
    const fromRef = useRef(0);
    const frameRef = useRef(null);

    useEffect(() => {
        if (!numeric || reduced) {
            fromRef.current = numeric ? target : 0;
            return undefined;
        }
        const from = fromRef.current ?? 0;
        if (from === target) return undefined;
        const start = performance.now();
        const ease = (x) => 1 - Math.pow(1 - x, 3);
        const tick = (now) => {
            const p = Math.min(1, (now - start) / duration);
            setAnimated(from + (target - from) * ease(p));
            if (p < 1) frameRef.current = requestAnimationFrame(tick);
            else fromRef.current = target;
        };
        frameRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frameRef.current);
    }, [target, duration, reduced, numeric]);

    if (!numeric || reduced) return target;
    return typeof animated === 'number' ? animated : target;
};
