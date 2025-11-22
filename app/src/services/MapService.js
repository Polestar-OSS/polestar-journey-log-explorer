import Map from 'ol/Map';
import View from 'ol/View';
import VectorLayer from 'ol/layer/Vector';
import Heatmap from 'ol/layer/Heatmap';
import VectorSource from 'ol/source/Vector';
import { fromLonLat } from 'ol/proj';
import { defaults as defaultControls, ScaleLine, ZoomToExtent, FullScreen, MousePosition } from 'ol/control';
import { createStringXY } from 'ol/coordinate';
import Overlay from 'ol/Overlay';

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
        overlayElement.style.cssText = `
      background: white;
      padding: 12px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      min-width: 200px;
      position: absolute;
      bottom: 12px;
      left: -100px;
    `;

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
            controls: defaultControls().extend([
                new ScaleLine({ units: 'metric' }),
                new ZoomToExtent({
                    extent: fromLonLat([center[0] - 1, center[1] - 1]).concat(
                        fromLonLat([center[0] + 1, center[1] + 1])
                    )
                }),
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
            blur: 15,
            radius: 8,
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
     * Create popup content HTML
     * @param {Object} trip - Trip data
     * @param {string} type - Marker type ('start' or 'end')
     * @returns {string} HTML string
     */
    createPopupContent(trip, type) {
        const isEnd = type === 'end';
        return `
      <div style="font-family: system-ui, -apple-system, sans-serif;">
        <div style="font-weight: 700; margin-bottom: 8px;">${type === 'start' ? 'Trip Start' : 'Trip End'}</div>
        <div style="font-size: 12px; margin-bottom: 4px;">${isEnd ? trip.endDate : trip.startDate}</div>
        <div style="font-size: 12px; margin-bottom: 8px;">${isEnd ? trip.endAddress : trip.startAddress}</div>
        <div style="display: flex; gap: 4px; flex-wrap: wrap;">
          <span style="background: #228be6; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px;">
            SOC: ${isEnd ? trip.socDestination : trip.socSource}%
          </span>
          ${isEnd ? `
            <span style="background: ${trip.efficiency < 20 ? '#12b886' : '#fa5252'}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px;">
              ${trip.efficiency} kWh/100km
            </span>
          ` : ''}
        </div>
        ${isEnd ? `
          <div style="font-size: 11px; margin-top: 8px; color: #868e96;">
            Distance: ${trip.distanceKm} km<br/>
            Consumption: ${trip.consumptionKwh} kWh
          </div>
        ` : ''}
      </div>
    `;
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

        this.map.getView().setCenter(fromLonLat(center));
        this.map.getView().setZoom(zoom);
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
