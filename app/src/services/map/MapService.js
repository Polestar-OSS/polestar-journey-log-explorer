import Map from 'ol/Map';
import View from 'ol/View';
import VectorLayer from 'ol/layer/Vector';
import Heatmap from 'ol/layer/Heatmap';
import VectorSource from 'ol/source/Vector';
import { fromLonLat } from 'ol/proj';
import { defaults as defaultControls, ScaleLine, FullScreen, MousePosition } from 'ol/control';
import { createStringXY } from 'ol/coordinate';
import Overlay from 'ol/Overlay';

const escapeHtml = (value) =>
    String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * Service Class: Manages all map-related operations
 * Single Responsibility: Only handles map initialization and management
 * Dependency Inversion: Depends on abstractions (strategies) not concrete implementations
 */
export class MapService {
    constructor(tileLayerFactory, featureBuilder, markerFactory) {
        this.tileLayerFactory = tileLayerFactory;
        this.featureBuilder = featureBuilder;
        this.markerFactory = markerFactory;
        this.map = null;
        this.overlay = null;
        this.heatmapLayer = null;
        this.tileLayer = null;
        this.distanceUnit = 'km';
    }

    /**
     * Initialize the map
     * @param {HTMLElement} target - DOM element to render map
     * @param {Array<number>} center - [longitude, latitude]
     * @param {string} layerType - Type of tile layer
     * @returns {Map} OpenLayers Map instance
     */
    initializeMap(target, center, layerType = 'osm') {
        // Create overlay for popups
        const overlayElement = document.createElement('div');
        overlayElement.className = 'ol-popup';

        this.overlay = new Overlay({
            element: overlayElement,
            autoPan: true,
            autoPanAnimation: { duration: 250 }
        });

        // Create tile layer
        this.tileLayer = this.tileLayerFactory.createLayer(layerType);

        // Create map
        this.map = new Map({
            target,
            layers: [this.tileLayer],
            view: new View({
                center: fromLonLat(center),
                zoom: 11,
                maxZoom: 19,
                minZoom: 3
            }),
            controls: defaultControls({ attributionOptions: { collapsible: true, collapsed: true } }).extend([
                new ScaleLine({ units: this.distanceUnit === 'mi' ? 'imperial' : 'metric' }),
                new FullScreen(),
                new MousePosition({
                    coordinateFormat: createStringXY(4),
                    projection: 'EPSG:4326',
                    className: 'custom-mouse-position',
                    undefinedHTML: '&nbsp;'
                })
            ]),
            overlays: [this.overlay]
        });

        // Initialize heatmap layer
        this.heatmapLayer = new Heatmap({
            source: new VectorSource(),
            blur: 18,
            radius: 9,
            gradient: ['#2a1a10', '#944612', '#d95a0f', '#f98f4f', '#ffd7b5'],
            weight: () => 1,
            visible: false
        });
        this.map.addLayer(this.heatmapLayer);

        this.setupEventHandlers();

        return this.map;
    }

    /**
     * Setup map event handlers
     */
    setupEventHandlers() {
        // Click handler for popups
        this.map.on('click', (evt) => {
            const feature = this.map.forEachFeatureAtPixel(evt.pixel, (feature) => feature);

            if (feature) {
                const properties = feature.getProperties();
                if (properties.tripData) {
                    const content = this.createPopupContent(properties.tripData, properties.type);
                    this.overlay.getElement().innerHTML = content;
                    this.overlay.setPosition(evt.coordinate);
                }
            } else {
                this.overlay.setPosition(undefined);
            }
        });

        // Cursor change on hover
        this.map.on('pointermove', (evt) => {
            const hit = this.map.forEachFeatureAtPixel(evt.pixel, () => true);
            this.map.getTargetElement().style.cursor = hit ? 'pointer' : '';
        });
    }

    /**
     * Set the distance unit for popup display
     * @param {string} unit - Distance unit ('km' or 'mi')
     */
    setDistanceUnit(unit) {
        this.distanceUnit = unit || 'km';
    }

    /**
     * Create popup content HTML
     * @param {Object} trip - Trip data
     * @param {string} type - Marker type ('start' or 'end')
     * @returns {string} HTML string
     */
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
        ${isEnd ? `<span class="ol-popup-chip"><i style="background: ${bandColor}"></i>${escapeHtml(String(trip.efficiency))} kWh/100${distLabel}</span>` : ''}
      </div>
      ${isEnd ? `
        <div class="ol-popup-meta">
          ${escapeHtml(String(trip.distanceKm))} ${distLabel} · ${escapeHtml(String(trip.consumptionKwh))} kWh${duration ? ` · ${duration}` : ''}${trip.avgSpeed ? ` · ${trip.avgSpeed} ${distLabel}/h` : ''}
        </div>
      ` : ''}
    `;
    }

    /**
     * Zoom the view to the extent of the current features
     * @param {Array} features - OpenLayers features
     */
    fitToFeatures(features, padding = 48) {
        if (!this.map || !features || features.length === 0) return;
        const source = new VectorSource({ features });
        const extent = source.getExtent();
        if (!extent || !isFinite(extent[0])) return;
        this.map.getView().fit(extent, {
            padding: [padding, padding, padding, padding],
            duration: 400,
            maxZoom: 15,
        });
    }

    /**
     * Change tile layer
     * @param {string} layerType - New layer type
     */
    changeTileLayer(layerType) {
        if (!this.map || !this.tileLayer) return;

        this.map.removeLayer(this.tileLayer);
        this.tileLayer = this.tileLayerFactory.createLayer(layerType);
        this.map.getLayers().insertAt(0, this.tileLayer);
    }

    /**
     * Update map features
     * @param {Array} features - Array of OpenLayers features
     * @param {Array} heatmapFeatures - Array of heatmap features
     */
    updateFeatures(features, heatmapFeatures) {
        if (!this.map) return;

        // Remove existing vector layers
        this.map.getLayers().getArray()
            .filter(layer => layer instanceof VectorLayer)
            .forEach(layer => this.map.removeLayer(layer));

        // Add new vector layer
        const vectorLayer = new VectorLayer({
            source: new VectorSource({ features }),
            updateWhileAnimating: true,
            updateWhileInteracting: true
        });
        this.map.addLayer(vectorLayer);

        // Update heatmap
        if (this.heatmapLayer) {
            const heatmapSource = this.heatmapLayer.getSource();
            heatmapSource.clear();
            heatmapSource.addFeatures(heatmapFeatures);
        }
    }

    /**
     * Set heatmap visibility
     * @param {boolean} visible - Visibility state
     */
    setHeatmapVisibility(visible) {
        if (this.heatmapLayer) {
            this.heatmapLayer.setVisible(visible);
        }
    }

    /**
     * Update map view
     * @param {Array<number>} center - [longitude, latitude]
     * @param {number} zoom - Zoom level
     */
    updateView(center, zoom) {
        if (!this.map) return;

        this.map.getView().animate({ center: fromLonLat(center), zoom, duration: 400 });
    }

    /**
     * Cleanup map resources
     */
    destroy() {
        if (this.map) {
            this.map.setTarget(null);
            this.map = null;
        }
    }
}
