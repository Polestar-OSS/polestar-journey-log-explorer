import { TariffEngine } from './TariffEngine';

const HOUR = 3600000;

/**
 * ChargingSessionAllocator - decides *when* the energy of a charging
 * session was drawn from the wall, so a time-of-use tariff can price it.
 *
 * A session is a parked window [startTs, endTs) with `kwh` to deliver into
 * the battery. Wall energy = kwh / (1 - loss). The strategy places that
 * energy into hourly slots:
 *   plugin    - as soon as plugged in, at charger power, until done
 *   cheapest  - the cheapest hours of the window first (a smart charger)
 *   window    - hours inside the user's preferred window first, cheapest
 *               among them, then the rest
 * If the window is too short for the charger, the remainder is spread over
 * the whole window (the car still left charged; the charger was faster).
 */
export class ChargingSessionAllocator {
    constructor({ powerKw = 7.4, strategy = 'cheapest', window = { from: '22:00', to: '07:00' }, lossPct = 10 } = {}) {
        this.powerKw = Math.max(0.5, powerKw);
        this.strategy = strategy;
        this.window = window;
        this.loss = Math.min(0.5, Math.max(0, lossPct / 100));
    }

    wallEnergy(batteryKwh) {
        return batteryKwh / (1 - this.loss);
    }

    /** Hourly slots covering [startTs, endTs), each with its tariff period. */
    slots(startTs, endTs, engine) {
        const out = [];
        const start = Math.floor(startTs / HOUR) * HOUR;
        for (let ts = start; ts < endTs; ts += HOUR) {
            const from = Math.max(ts, startTs);
            const to = Math.min(ts + HOUR, endTs);
            const hours = (to - from) / HOUR;
            if (hours <= 0) continue;
            const date = new Date(from);
            const period = engine.periodAt(date);
            const inWindow = TariffEngine.inWindow(date.getHours() * 60 + date.getMinutes(), TariffEngine.minutesOf(this.window.from), TariffEngine.minutesOf(this.window.to));
            out.push({ ts: from, hours, rate: period.rate ?? 0, periodId: period.id, periodLabel: period.label, inWindow, kwh: 0 });
        }
        return out;
    }

    /**
     * @returns {Array<{ts, kwh, rate, periodId, periodLabel}>} slots with energy (kWh from the wall)
     */
    allocate(session, engine) {
        const wallKwh = this.wallEnergy(session.kwh);
        const slots = this.slots(session.startTs, session.endTs, engine);
        if (!slots.length || wallKwh <= 0) {
            return wallKwh > 0 ? [{ ts: session.startTs, kwh: wallKwh, rate: engine.rateAt(new Date(session.startTs)) ?? 0, periodId: 'default', periodLabel: 'Standard' }] : [];
        }
        const capacity = (s) => s.hours * this.powerKw;
        let order;
        if (this.strategy === 'plugin') order = slots;
        else if (this.strategy === 'window') order = [...slots].sort((a, b) => Number(b.inWindow) - Number(a.inWindow) || a.rate - b.rate || a.ts - b.ts);
        else order = [...slots].sort((a, b) => a.rate - b.rate || a.ts - b.ts);

        let remaining = wallKwh;
        for (const slot of order) {
            if (remaining <= 0) break;
            const take = Math.min(capacity(slot), remaining);
            slot.kwh += take;
            remaining -= take;
        }
        if (remaining > 0) {
            // Charger too slow for the gap: spread what is left over every slot
            const totalHours = slots.reduce((s, x) => s + x.hours, 0);
            slots.forEach((slot) => { slot.kwh += (remaining * slot.hours) / totalHours; });
        }
        return slots.filter((s) => s.kwh > 0).map(({ ts, kwh, rate, periodId, periodLabel }) => ({ ts, kwh, rate, periodId, periodLabel }));
    }
}
