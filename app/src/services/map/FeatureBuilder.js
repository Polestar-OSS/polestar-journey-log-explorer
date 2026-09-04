import { Feature } from 'ol';
import { Point, LineString } from 'ol/geom';
import { Style, Stroke, Fill, Circle as CircleStyle, Text } from 'ol/style';
import { fromLonLat } from 'ol/proj';

/**
 * Builder Pattern: Constructs complex Feature objects step by step
 * Single Responsibility: Only responsible for building map features
 *
 * Routes are drawn as a two-pass "glow": a wide, translucent stroke under a
 * thin, opaque core. An optional dashed overlay animated by MapService gives
 * the direction of travel.
 */
export class FeatureBuilder {
    constructor(colorCalculator) {
        this.colorCalculator = colorCalculator;
        this.glow = true;
    }

    setGlow(enabled) {
        this.glow = Boolean(enabled);
    }

    /**
     * Route geometry: the snapped road path when available, else the
     * straight line between start and end.
     */
    routeGeometry(trip, path) {
        const coords = path && path.length > 1 ? path.map(([lng, lat]) => fromLonLat([lng, lat])) : [fromLonLat([trip.startLng, trip.startLat]), fromLonLat([trip.endLng, trip.endLat])];
        return new LineString(coords);
    }

    /**
     * Create a route line feature
     * @param {Object} trip - Trip data
     * @param {number} index - Trip index for z-ordering
     * @param {{ path?: Array, emphasis?: 'normal'|'dim'|'current' }} options
     */
    createRouteLine(trip, index, { path = null, emphasis = 'normal' } = {}) {
        const color = this.colorCalculator.getEfficiencyColor(trip.efficiency);
        const routeLine = new Feature({ geometry: this.routeGeometry(trip, path), tripData: trip, type: 'route', emphasis });
        routeLine.setId(`route-${trip.id}`);
        routeLine.setStyle(this.routeStyle(color, index, emphasis));
        return routeLine;
    }

    routeStyle(color, index, emphasis = 'normal') {
        const rgba = (a) => this.colorCalculator.rgbToRgba(color, a);
        const z = 500 + index;
        if (emphasis === 'dim') {
            return [new Style({ stroke: new Stroke({ color: rgba(0.18), width: 2, lineCap: 'round', lineJoin: 'round' }), zIndex: z - 400 })];
        }
        if (emphasis === 'current') {
            return [
                new Style({ stroke: new Stroke({ color: rgba(0.35), width: 16, lineCap: 'round', lineJoin: 'round' }), zIndex: 900 }),
                new Style({ stroke: new Stroke({ color: rgba(0.6), width: 8, lineCap: 'round', lineJoin: 'round' }), zIndex: 901 }),
                new Style({ stroke: new Stroke({ color: '#ffffff', width: 3, lineCap: 'round', lineJoin: 'round' }), zIndex: 902 }),
            ];
        }
        if (emphasis === 'hover') {
            return [
                new Style({ stroke: new Stroke({ color: rgba(0.45), width: 14, lineCap: 'round', lineJoin: 'round' }), zIndex: 950 }),
                new Style({ stroke: new Stroke({ color: '#ffffff', width: 3.5, lineCap: 'round', lineJoin: 'round' }), zIndex: 951 }),
            ];
        }
        const styles = [];
        if (this.glow) styles.push(new Style({ stroke: new Stroke({ color: rgba(0.22), width: 9, lineCap: 'round', lineJoin: 'round' }), zIndex: z - 100 }));
        styles.push(new Style({ stroke: new Stroke({ color: rgba(0.9), width: 2.5, lineCap: 'round', lineJoin: 'round' }), zIndex: z }));
        return styles;
    }

    /**
     * Directional flow overlay: same geometry, drawn by MapService with an
     * animated dash offset. Kept as a separate feature so the base route
     * style never re-renders.
     */
    createFlowLine(trip, path = null) {
        const f = new Feature({ geometry: this.routeGeometry(trip, path), type: 'flow' });
        f.setId(`flow-${trip.id}`);
        return f;
    }

    /**
     * Create a day connection line feature
     */
    createDayConnectionLine(startTrip, endTrip, dayIndex) {
        const color = this.colorCalculator.getDayColor(dayIndex);
        const connectionLine = new Feature({
            geometry: new LineString([fromLonLat([startTrip.endLng, startTrip.endLat]), fromLonLat([endTrip.startLng, endTrip.startLat])]),
            type: 'chain',
        });
        connectionLine.setStyle(new Style({
            stroke: new Stroke({ color: this.colorCalculator.rgbToRgba(color, 0.55), width: 3, lineDash: [2, 10], lineCap: 'round' }),
            zIndex: 400,
        }));
        return connectionLine;
    }

    /**
     * Create a heatmap point feature
     */
    createHeatmapPoint(lng, lat, weight = 1) {
        const f = new Feature({ geometry: new Point(fromLonLat([lng, lat])) });
        f.set('weight', weight);
        return f;
    }

    /**
     * Place bubble: radius grows with the square root of visits, the busiest
     * place (home) in the accent colour, others in ink.
     */
    createPlaceBubble(place, rank, maxVisits, { accent = '#ff7500', ink = '#f5f5f3', surface = '#151515', labelColor = '#f5f5f3' } = {}) {
        const radius = 10 + Math.sqrt(place.visits / Math.max(1, maxVisits)) * 26;
        const color = rank === 0 ? accent : ink;
        const f = new Feature({ geometry: new Point(fromLonLat([place.lng, place.lat])), placeData: place, type: 'place', rank });
        f.setId(`place-${rank}`);
        const short = (place.address || '').split(',')[0].slice(0, 28);
        f.setStyle([
            new Style({ image: new CircleStyle({ radius: radius + 6, fill: new Fill({ color: this._alpha(color, 0.18) }) }), zIndex: 700 }),
            new Style({
                image: new CircleStyle({ radius, fill: new Fill({ color: this._alpha(color, 0.55) }), stroke: new Stroke({ color: surface, width: 2 }) }),
                text: new Text({
                    text: `${short}\n${place.visits}`,
                    font: '600 11px Inter Variable, Inter, system-ui, sans-serif',
                    fill: new Fill({ color: labelColor }),
                    stroke: new Stroke({ color: surface, width: 3 }),
                    offsetY: radius + 18,
                    textAlign: 'center',
                }),
                zIndex: 701,
            }),
        ]);
        return f;
    }

    /** Cluster bubble style for grouped start/end pins. */
    clusterStyle(size, { accent = '#ff7500', surface = '#151515', ink = '#101010' } = {}) {
        const radius = 12 + Math.min(14, Math.log2(size) * 3);
        return new Style({
            image: new CircleStyle({ radius, fill: new Fill({ color: this._alpha(accent, 0.85) }), stroke: new Stroke({ color: surface, width: 2 }) }),
            text: new Text({ text: String(size), font: '600 11px Inter Variable, Inter, system-ui, sans-serif', fill: new Fill({ color: ink }) }),
            zIndex: 1100,
        });
    }

    /** Pulsing halo used for the current replay trip's end point. */
    createPulse(lng, lat) {
        const f = new Feature({ geometry: new Point(fromLonLat([lng, lat])), type: 'pulse' });
        f.setId('pulse');
        return f;
    }

    _alpha(hex, a) {
        const h = hex.replace('#', '');
        const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
        return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
    }
}
