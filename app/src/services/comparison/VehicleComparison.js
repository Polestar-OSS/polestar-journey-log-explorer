const KM_PER_MI = 1.609344;
const L_PER_GAL = 3.785411784;
/** Arbor Day Foundation: a mature tree absorbs about 48 lb (22 kg) of CO₂ a year. */
export const TREE_CO2_KG_PER_YEAR = 22;
export const TREE_SOURCE = 'https://www.arborday.org/trees/treefacts/';

const round = (n, d = 2) => (n === null || n === undefined || !isFinite(n) ? null : Math.round(n * 10 ** d) / 10 ** d);

/**
 * VehicleComparison - what the same trips would have cost in fuel and
 * tailpipe CO₂ in a specific petrol or hybrid car.
 *
 * Petrol and mild hybrids: distance × L/100 km, CO₂ = distance × g/km.
 * Plug-in hybrids: electric-first each calendar day, on the assumption the
 * car is charged overnight. The first `rangeKm` of a day's driving is
 * electric at `kwhPer100km`, priced at the EV's own effective electricity
 * rate; the rest is petrol. Trips whose distance is known but whose date is
 * not are treated as petrol.
 *
 * Fuel price is per litre (km) or per US gallon (mi); null means costs are
 * not stated. Nothing here assumes a price.
 */
export class VehicleComparison {
    constructor({ distanceUnit = 'km' } = {}) {
        this.unit = distanceUnit === 'mi' ? 'mi' : 'km';
    }

    /** Litres → the display fuel unit (litres for km, US gallons for mi). */
    fuelVolume(litres) {
        return this.unit === 'mi' ? litres / L_PER_GAL : litres;
    }

    fuelUnit() {
        return this.unit === 'mi' ? 'gal' : 'L';
    }

    /** Split the trips into petrol km and electric km for a plug-in hybrid. */
    static splitPhev(trips, rangeKm) {
        const byDay = new Map();
        let electricKm = 0;
        let petrolKm = 0;
        trips.forEach((t) => {
            if (!t.dayKey) { petrolKm += t.distanceKm; return; }
            const used = byDay.get(t.dayKey) ?? 0;
            const electric = Math.max(0, Math.min(t.distanceKm, rangeKm - used));
            byDay.set(t.dayKey, used + electric);
            electricKm += electric;
            petrolKm += t.distanceKm - electric;
        });
        return { electricKm, petrolKm };
    }

    /**
     * @param {Array} trips - parsed trips (distanceKm is in the export's unit)
     * @param {object} vehicle - an entry from Vehicles.VEHICLES
     * @param {{ fuelPrice?: number|null, evCostPerKwh?: number|null, evCostTotal?: number|null }} options
     */
    compare(trips, vehicle, { fuelPrice = null, evCostPerKwh = null, evCostTotal = null } = {}) {
        if (!vehicle || !trips?.length) return null;
        const distanceKm = trips.reduce((s, t) => s + t.distanceKm, 0) * (this.unit === 'mi' ? KM_PER_MI : 1);
        const phev = vehicle.powertrain === 'plug-in-hybrid' && vehicle.electric;
        let petrolKm = distanceKm;
        let electricKm = 0;
        if (phev) {
            const split = VehicleComparison.splitPhev(trips, vehicle.electric.rangeKm / (this.unit === 'mi' ? KM_PER_MI : 1));
            electricKm = split.electricKm * (this.unit === 'mi' ? KM_PER_MI : 1);
            petrolKm = split.petrolKm * (this.unit === 'mi' ? KM_PER_MI : 1);
        }
        const litres = (petrolKm / 100) * vehicle.lPer100km;
        const co2Kg = (petrolKm * vehicle.co2GPerKm) / 1000;
        const electricKwh = phev ? (electricKm / 100) * vehicle.electric.kwhPer100km : 0;
        const priced = typeof fuelPrice === 'number' && fuelPrice > 0;
        const fuelCost = priced ? this.fuelVolume(litres) * fuelPrice : null;
        const electricCost = phev && typeof evCostPerKwh === 'number' ? electricKwh * evCostPerKwh : phev ? null : 0;
        const totalCost = fuelCost !== null && electricCost !== null ? fuelCost + electricCost : null;
        const saving = totalCost !== null && typeof evCostTotal === 'number' ? totalCost - evCostTotal : null;
        return {
            vehicle,
            distanceKm: round(distanceKm, 1),
            petrolKm: round(petrolKm, 1),
            electricKm: round(electricKm, 1),
            electricSharePct: distanceKm > 0 ? round((electricKm / distanceKm) * 100, 1) : 0,
            fuel: round(this.fuelVolume(litres)),
            fuelUnit: this.fuelUnit(),
            litres: round(litres),
            co2Kg: round(co2Kg, 1),
            treeYears: round(co2Kg / TREE_CO2_KG_PER_YEAR, 1),
            electricKwh: round(electricKwh, 1),
            fuelCost: round(fuelCost),
            electricCost: round(electricCost),
            totalCost: round(totalCost),
            evCost: typeof evCostTotal === 'number' ? round(evCostTotal) : null,
            saving: round(saving),
            perTripSaving: saving !== null ? round(saving / trips.length) : null,
            priced,
        };
    }

    compareAll(trips, vehicles, options) {
        return vehicles.map((v) => this.compare(trips, v, options)).filter(Boolean);
    }
}
