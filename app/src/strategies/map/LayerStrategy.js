import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import OSM from 'ol/source/OSM';

const OSM_ATTRIBUTION = '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors';
const ESRI_ATTRIBUTION = 'Imagery © <a href="https://www.esri.com/" target="_blank" rel="noreferrer">Esri</a>, Maxar, Earthstar Geographics, and the GIS User Community';

/**
 * Strategy Pattern: Defines interface for tile layer creation
 * Open/Closed Principle: Easy to add new tile layer types without modifying existing code
 */
export class TileLayerStrategy {
    createLayer() {
        throw new Error('createLayer must be implemented by subclass');
    }

    /** Whether the basemap is dark, so overlays can pick legible colours. */
    isDark() {
        return false;
    }
}

export class OSMStandardStrategy extends TileLayerStrategy {
    createLayer() {
        return new TileLayer({ source: new OSM() });
    }
}

export class OSMHumanitarianStrategy extends TileLayerStrategy {
    createLayer() {
        return new TileLayer({
            source: new XYZ({
                url: 'https://tile-{a-c}.openstreetmap.fr/hot/{z}/{x}/{y}.png',
                attributions: `${OSM_ATTRIBUTION}, Tiles style by <a href="https://www.hotosm.org/" target="_blank" rel="noreferrer">Humanitarian OpenStreetMap Team</a> hosted by <a href="https://openstreetmap.fr/" target="_blank" rel="noreferrer">OpenStreetMap France</a>`,
                maxZoom: 19,
            }),
        });
    }
}

/**
 * Esri World Imagery - satellite photography, free for non-commercial use
 * with attribution.
 */
export class SatelliteStrategy extends TileLayerStrategy {
    createLayer() {
        return new TileLayer({
            source: new XYZ({
                url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                attributions: ESRI_ATTRIBUTION,
                maxZoom: 19,
            }),
        });
    }

    isDark() {
        return true;
    }
}

/**
 * Factory: Creates appropriate tile layer strategy
 */
export class TileLayerFactory {
    constructor() {
        // CARTO's basemaps now require an API key and render "API key required"
        // tiles without one, so they are gone; the remaining sources are open.
        this.strategies = {
            satellite: new SatelliteStrategy(),
            osm: new OSMStandardStrategy(),
            'osm-humanitarian': new OSMHumanitarianStrategy(),
        };
    }

    createLayer(layerType) {
        const strategy = this.strategies[layerType];
        if (!strategy) {
            throw new Error(`Unknown layer type: ${layerType}`);
        }
        return strategy.createLayer();
    }

    isDark(layerType) {
        return this.strategies[layerType]?.isDark() ?? false;
    }

    getAvailableLayers() {
        return [
            { value: 'satellite', label: 'Satellite' },
            { value: 'osm', label: 'OpenStreetMap' },
            { value: 'osm-humanitarian', label: 'Humanitarian' },
        ];
    }

    /** Basemap that sits best with the UI colour scheme: imagery under the dark UI, OpenStreetMap under the light one. */
    defaultFor(scheme) {
        return scheme === 'dark' ? 'satellite' : 'osm';
    }
}
