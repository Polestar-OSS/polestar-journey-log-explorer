import Map from 'ol/Map';
import View from 'ol/View';
import VectorLayer from 'ol/layer/Vector';
import Heatmap from 'ol/layer/Heatmap';
import VectorSource from 'ol/source/Vector';
import Cluster from 'ol/source/Cluster';
import { Style, Stroke, Fill, Circle as CircleStyle } from 'ol/style';
import { fromLonLat } from 'ol/proj';
import { defaults as defaultControls, ScaleLine, FullScreen } from 'ol/control';
import Overlay from 'ol/Overlay';

const escapeHtml = (value) =>
    String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const MAP_MODES = ['routes', 'heat', 'places', 'replay'];

/**
 * Service Class: Manages all map-related operations
 * Single Responsibility: map initialisation, layers, animation and overlays
 * Dependency Inversion: depends on the tile factory, feature builder and
 * marker factory abstractions, never on React.
 *
 * Layers (bottom → top): basemap · heat · chains · routes · flow · places ·
 * markers (clustered) · pulse. Modes toggle visibility; the view only feeds
 * features.
 */
export class MapService {
    constructor(tileLayerFactory, featureBuilder, markerFactory) {
        this.tileLayerFactory = tileLayerFactory;
        this.featureBuilder = featureBuilder;
        this.markerFactory = markerFactory;
        this.map = null;
        this.popup = null;
        this.hoverOverlay = null;
        this.tileLayer = null;
        this.layers = {};
        this.distanceUnit = 'km';
        this.mode = 'routes';
        this.flowEnabled = false;
        this.pulseEnabled = false;
        this.reducedMotion = false;
        this.dashOffset = 0;
        this.hovered = null;
        this.hoveredStyle = null;
        this.theme = { accent: '#ff7500', surface: '#151515', ink: '#f5f5f3', ink2: '#c3c2b7', flow: 'rgba(255,255,255,0.75)' };
        this.onHover = null;
    }

    setDistanceUnit(unit) {
        this.distanceUnit = unit || 'km';
    }

    setTheme(theme) {
        this.theme = { ...this.theme, ...theme };
        Object.values(this.layers).forEach((l) => l.changed());
    }

    setReducedMotion(reduced) {
        this.reducedMotion = Boolean(reduced);
        if (reduced) {
            this.flowEnabled = false;
            this.pulseEnabled = false;
        }
    }

    /**
     * Initialize the map
     */
    initializeMap(target, center, layerType = 'osm') {
        const popupEl = document.createElement('div');
        popupEl.className = 'ol-popup';
        this.popup = new Overlay({ element: popupEl, autoPan: { animation: { duration: 250 } }, positioning: 'bottom-center', offset: [0, -14] });

        const hoverEl = document.createElement('div');
        hoverEl.className = 'ps-map-tooltip';
        this.hoverOverlay = new Overlay({ element: hoverEl, positioning: 'bottom-left', offset: [12, -12], stopEvent: false });

        this.tileLayer = this.tileLayerFactory.createLayer(layerType);

        this.layers.heat = new Heatmap({
            source: new VectorSource(),
            blur: 22,
            radius: 12,
            weight: (f) => f.get('weight') ?? 1,
            gradient: ['#2a1a10', '#944612', '#d95a0f', '#f98f4f', '#ffd7b5'],
            visible: false,
            opacity: 0.85,
        });
        this.layers.chains = new VectorLayer({ source: new VectorSource(), zIndex: 3 });
        this.layers.routes = new VectorLayer({ source: new VectorSource(), zIndex: 4, updateWhileAnimating: true, updateWhileInteracting: true });
        this.layers.flow = new VectorLayer({
            source: new VectorSource(),
            zIndex: 5,
            updateWhileAnimating: true,
            updateWhileInteracting: true,
            style: () => new Style({ stroke: new Stroke({ color: this.theme.flow, width: 2, lineDash: [2, 14], lineDashOffset: this.dashOffset, lineCap: 'round' }), zIndex: 600 }),
        });
        this.layers.places = new VectorLayer({ source: new VectorSource(), zIndex: 6, visible: false });
        this.markerSource = new VectorSource();
        this.layers.markers = new VectorLayer({
            source: new Cluster({ distance: 36, minDistance: 16, source: this.markerSource }),
            zIndex: 7,
            style: (feature) => {
                const members = feature.get('features') || [];
                if (members.length === 1) return members[0].getStyle();
                return this.featureBuilder.clusterStyle(members.length, this.theme);
            },
        });
        this.layers.replay = new VectorLayer({ source: new VectorSource(), zIndex: 7, updateWhileAnimating: true, updateWhileInteracting: true, visible: false });
        this.layers.pulse = new VectorLayer({
            source: new VectorSource(),
            zIndex: 8,
            style: () => {
                const t = (Date.now() % 1600) / 1600;
                const r = 6 + t * 26;
                return [
                    new Style({ image: new CircleStyle({ radius: r, stroke: new Stroke({ color: this._alpha(this.theme.accent, 1 - t), width: 2 }) }) }),
                    new Style({ image: new CircleStyle({ radius: 5, fill: new Fill({ color: this.theme.accent }), stroke: new Stroke({ color: '#ffffff', width: 2 }) }) }),
                ];
            },
        });

        this.map = new Map({
            target,
            layers: [this.tileLayer, this.layers.heat, this.layers.chains, this.layers.routes, this.layers.flow, this.layers.places, this.layers.markers, this.layers.replay, this.layers.pulse],
            view: new View({ center: fromLonLat(center), zoom: 11, maxZoom: 19, minZoom: 3 }),
            controls: defaultControls({ attributionOptions: { collapsible: true, collapsed: true }, zoomOptions: { className: 'ol-zoom' } }).extend([
                new ScaleLine({ units: this.distanceUnit === 'mi' ? 'imperial' : 'metric' }),
                new FullScreen(),
            ]),
            overlays: [this.popup, this.hoverOverlay],
        });

        this._setupAnimation();
        this._setupEventHandlers();
        this.setMode(this.mode);
        return this.map;
    }

    _setupAnimation() {
        // Drive dash offset and pulse from the render loop; only while enabled
        this.layers.flow.on('postrender', () => {
            if (!this.flowEnabled || this.reducedMotion) return;
            this.dashOffset = -((Date.now() / 45) % 16);
            this.layers.flow.changed();
        });
        this.layers.pulse.on('postrender', () => {
            if (!this.pulseEnabled || this.reducedMotion) return;
            this.layers.pulse.changed();
        });
    }

    _setupEventHandlers() {
        this.map.on('click', (evt) => {
            const hit = this.map.forEachFeatureAtPixel(evt.pixel, (feature) => feature, { hitTolerance: 6, layerFilter: (l) => l === this.layers.markers || l === this.layers.routes || l === this.layers.places });
            if (!hit) {
                this.popup.setPosition(undefined);
                return;
            }
            const members = hit.get('features');
            const feature = members?.length === 1 ? members[0] : members?.length > 1 ? null : hit;
            if (!feature) {
                // A cluster: zoom in on it
                const view = this.map.getView();
                view.animate({ center: evt.coordinate, zoom: Math.min(19, (view.getZoom() || 11) + 2), duration: 350 });
                return;
            }
            const props = feature.getProperties();
            if (props.placeData) {
                this.popup.getElement().innerHTML = this.createPlacePopup(props.placeData, props.rank);
                this.popup.setPosition(evt.coordinate);
            } else if (props.tripData) {
                this.popup.getElement().innerHTML = this.createPopupContent(props.tripData, props.type === 'start' ? 'start' : 'end');
                this.popup.setPosition(evt.coordinate);
            }
        });

        this.map.on('pointermove', (evt) => {
            if (evt.dragging) return;
            const feature = this.map.forEachFeatureAtPixel(evt.pixel, (f) => f, { hitTolerance: 5, layerFilter: (l) => l === this.layers.routes || l === this.layers.markers || l === this.layers.places });
            this.map.getTargetElement().style.cursor = feature ? 'pointer' : '';
            const route = feature && feature.get('type') === 'route' ? feature : null;
            if (route !== this.hovered) {
                this._restoreHover();
                if (route) {
                    this.hovered = route;
                    this.hoveredStyle = route.getStyle();
                    const trip = route.get('tripData');
                    const color = this.featureBuilder.colorCalculator.getEfficiencyColor(trip.efficiency);
                    route.setStyle(this.featureBuilder.routeStyle(color, 0, 'hover'));
                    this.hoverOverlay.getElement().innerHTML = this.createHoverContent(trip);
                    this.onHover?.(trip);
                } else {
                    this.onHover?.(null);
                }
            }
            if (route) this.hoverOverlay.setPosition(evt.coordinate);
            else this.hoverOverlay.setPosition(undefined);
        });

        this.map.getTargetElement().addEventListener('mouseleave', () => {
            this._restoreHover();
            this.hoverOverlay.setPosition(undefined);
        });
    }

    _restoreHover() {
        if (this.hovered) {
            this.hovered.setStyle(this.hoveredStyle);
            this.hovered = null;
            this.hoveredStyle = null;
        }
    }

    // ------------------------------------------------------------------
    // Modes and animation
    // ------------------------------------------------------------------

    setMode(mode) {
        this.mode = MAP_MODES.includes(mode) ? mode : 'routes';
        const l = this.layers;
        if (!this.map) return;
        l.heat.setVisible(this.mode === 'heat');
        l.places.setVisible(this.mode === 'places');
        l.routes.setOpacity(this.mode === 'heat' || this.mode === 'places' ? 0.35 : 1);
        l.flow.setVisible(this.mode === 'routes');
        l.markers.setVisible(this.mode === 'routes' || this.mode === 'replay');
        l.pulse.setVisible(this.mode === 'replay');
        l.replay.setVisible(this.mode === 'replay');
        if (this.mode !== 'replay') this._replace(l.replay, []);
        this.pulseEnabled = this.mode === 'replay' && !this.reducedMotion;
        this.popup.setPosition(undefined);
        l.flow.changed();
        l.pulse.changed();
    }

    setFlowAnimation(enabled) {
        this.flowEnabled = Boolean(enabled) && !this.reducedMotion;
        this.layers.flow?.changed();
    }

    setHeatmapVisibility(visible) {
        this.layers.heat?.setVisible(visible);
    }

    // ------------------------------------------------------------------
    // Feature updates
    // ------------------------------------------------------------------

    updateRoutes(features) {
        this._replace(this.layers.routes, features);
    }

    updateFlow(features) {
        this._replace(this.layers.flow, features);
    }

    updateChains(features) {
        this._replace(this.layers.chains, features);
    }

    updateHeat(features) {
        this._replace(this.layers.heat, features);
    }

    updatePlaces(features) {
        this._replace(this.layers.places, features);
    }

    updateMarkers(features) {
        this.markerSource.clear();
        if (features?.length) this.markerSource.addFeatures(features);
    }

    /** Replay animation layer: completed legs, the leg being drawn and the car. */
    setReplayFrame(features) {
        this._replace(this.layers.replay, features);
    }

    /** Pan the view so a [lng, lat] point stays inside the middle of the viewport. */
    keepInView(lngLat, margin = 0.2) {
        if (!this.map || !lngLat) return;
        const view = this.map.getView();
        const size = this.map.getSize();
        if (!size) return;
        const pixel = this.map.getPixelFromCoordinate(fromLonLat(lngLat));
        if (!pixel) return;
        const [w, h] = size;
        if (pixel[0] < w * margin || pixel[0] > w * (1 - margin) || pixel[1] < h * margin || pixel[1] > h * (1 - margin)) {
            view.animate({ center: fromLonLat(lngLat), duration: 350 });
        }
    }

    setPulse(feature) {
        this._replace(this.layers.pulse, feature ? [feature] : []);
    }

    /** Back-compat shim for the previous API */
    updateFeatures(features, heatmapFeatures) {
        const routes = features.filter((f) => f.get('type') === 'route' || (!f.get('type') && f.getGeometry().getType() === 'LineString'));
        const markers = features.filter((f) => f.get('type') === 'start' || f.get('type') === 'end');
        const chains = features.filter((f) => f.get('type') === 'chain');
        this.updateRoutes(routes);
        this.updateMarkers(markers);
        this.updateChains(chains);
        this.updateHeat(heatmapFeatures || []);
    }

    _replace(layer, features) {
        if (!layer) return;
        const source = layer.getSource();
        source.clear();
        if (features?.length) source.addFeatures(features);
    }

    // ------------------------------------------------------------------
    // View
    // ------------------------------------------------------------------

    changeTileLayer(layerType) {
        if (!this.map || !this.tileLayer) return;
        this.map.removeLayer(this.tileLayer);
        this.tileLayer = this.tileLayerFactory.createLayer(layerType);
        this.map.getLayers().insertAt(0, this.tileLayer);
    }

    fitToFeatures(features, padding = [56, 56, 56, 56]) {
        if (!this.map || !features || features.length === 0) return;
        const extent = new VectorSource({ features }).getExtent();
        if (!extent || !isFinite(extent[0])) return;
        this.map.getView().fit(extent, { padding, duration: this.reducedMotion ? 0 : 500, maxZoom: 15 });
    }

    updateView(center, zoom) {
        if (!this.map) return;
        this.map.getView().animate({ center: fromLonLat(center), zoom, duration: this.reducedMotion ? 0 : 450 });
    }

    /** Trips whose route intersects the current viewport. */
    tripsInView() {
        if (!this.map) return [];
        const extent = this.map.getView().calculateExtent(this.map.getSize());
        const trips = [];
        this.layers.routes.getSource().forEachFeatureInExtent(extent, (f) => {
            const t = f.get('tripData');
            if (t) trips.push(t);
        });
        return trips;
    }

    onMoveEnd(handler) {
        this.map?.on('moveend', handler);
    }

    // ------------------------------------------------------------------
    // Popups
    // ------------------------------------------------------------------

    createHoverContent(trip) {
        const u = this.distanceUnit === 'mi' ? 'mi' : 'km';
        const when = escapeHtml(trip.startDate);
        return `<span class="ps-map-tooltip-date">${when}</span><span class="ps-map-tooltip-row">${escapeHtml(String(trip.distanceKm))} ${u} · ${escapeHtml(String(trip.efficiency))} kWh/100${u}${trip.durationMin ? ` · ${trip.durationMin} min` : ''}</span>`;
    }

    createPopupContent(trip, type) {
        const isEnd = type === 'end';
        const distLabel = this.distanceUnit === 'mi' ? 'mi' : 'km';
        const multiplier = this.distanceUnit === 'mi' ? 1.60934 : 1;
        const eff = parseFloat(trip.efficiency);
        const band = eff < 15 * multiplier ? 'good' : eff < 20 * multiplier ? 'ok' : eff < 25 * multiplier ? 'poor' : 'bad';
        const bandColor = { good: 'var(--ps-good)', ok: 'var(--ps-warning)', poor: 'var(--ps-serious)', bad: 'var(--ps-critical)' }[band];
        const duration = trip.durationMin > 0 ? `${Math.floor(trip.durationMin / 60) ? `${Math.floor(trip.durationMin / 60)}h ` : ''}${trip.durationMin % 60}m` : null;

        return `
      <div class="ol-popup-title">${isEnd ? 'Trip end' : 'Trip start'}</div>
      <div class="ol-popup-date">${escapeHtml(isEnd ? trip.endDate : trip.startDate)}</div>
      <div class="ol-popup-address">${escapeHtml(isEnd ? trip.endAddress : trip.startAddress)}</div>
      <div class="ol-popup-chips">
        <span class="ol-popup-chip"><i style="background: var(--ps-accent)"></i>SOC ${isEnd ? trip.socDestination : trip.socSource}%</span>
        <span class="ol-popup-chip"><i style="background: ${bandColor}"></i>${escapeHtml(String(trip.efficiency))} kWh/100${distLabel}</span>
      </div>
      <div class="ol-popup-meta">
        ${escapeHtml(String(trip.distanceKm))} ${distLabel} · ${escapeHtml(String(trip.consumptionKwh))} kWh${duration ? ` · ${duration}` : ''}${trip.avgSpeed ? ` · ${trip.avgSpeed} ${distLabel}/h` : ''}
      </div>
    `;
    }

    createPlacePopup(place, rank) {
        return `
      <div class="ol-popup-title">${rank === 0 ? 'Most visited · probably home' : `Place #${rank + 1}`}</div>
      <div class="ol-popup-date">${escapeHtml(place.address)}</div>
      <div class="ol-popup-meta">${place.visits} visits · ${place.sharePct}% of all trip ends</div>
    `;
    }

    _alpha(hex, a) {
        const h = hex.replace('#', '');
        const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
        return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
    }

    destroy() {
        if (this.map) {
            this.map.setTarget(null);
            this.map = null;
        }
    }
}
