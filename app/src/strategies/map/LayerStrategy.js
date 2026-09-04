import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import OSM from 'ol/source/OSM';

const OSM_ATTRIBUTION = '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors';
const CARTO_ATTRIBUTION = `${OSM_ATTRIBUTION}, © <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>`;

/**
 * Strategy Pattern: Defines interface for tile layer creation
 * Open/Closed Principle: Easy to add new tile layer types without modifying existing code
 */
export class TileLayerStrategy {
    createLayer() {
        throw new Error('createLayer must be implemented by subclass');
    }
}

/**
 * Concrete Strategy: OpenStreetMap Standard
 */
export class OSMStandardStrategy extends TileLayerStrategy {
    createLayer() {
        return new TileLayer({
            source: new OSM(),
        });
    }
}

/**
 * Concrete Strategy: OpenStreetMap Humanitarian
 */
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
 * Concrete Strategy: CARTO basemaps - quiet, monochrome tiles that let the
 * efficiency-coloured routes carry the picture.
 */
class CartoStrategy extends TileLayerStrategy {
    constructor(style) {
        super();
        this.style = style;
    }

    createLayer() {
        return new TileLayer({
            source: new XYZ({
                url: `https://{a-d}.basemaps.cartocdn.com/${this.style}/{z}/{x}/{y}.png`,
                attributions: CARTO_ATTRIBUTION,
                maxZoom: 19,
            }),
        });
    }
}

export class CartoDarkStrategy extends CartoStrategy {
    constructor() {
        super('dark_all');
    }
}

export class CartoLightStrategy extends CartoStrategy {
    constructor() {
        super('light_all');
    }
}

/**
 * Factory: Creates appropriate tile layer strategy
 * Single Responsibility: Only responsible for creating tile layers
 */
export class TileLayerFactory {
    constructor() {
        this.strategies = {
            'carto-dark': new CartoDarkStrategy(),
            'carto-light': new CartoLightStrategy(),
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

    getAvailableLayers() {
        return [
            { value: 'carto-dark', label: 'Dark (CARTO)' },
            { value: 'carto-light', label: 'Light (CARTO)' },
            { value: 'osm', label: 'OpenStreetMap' },
            { value: 'osm-humanitarian', label: 'Humanitarian (HOT)' },
        ];
    }

    /** Basemap that matches the UI colour scheme */
    defaultFor(scheme) {
        return scheme === 'dark' ? 'carto-dark' : 'carto-light';
    }
}
