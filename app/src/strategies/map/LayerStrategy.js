import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import OSM from 'ol/source/OSM';
import StadiaMaps from 'ol/source/StadiaMaps';

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
            source: new OSM()
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
                attributions: '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/" target="_blank">Humanitarian OpenStreetMap Team</a> hosted by <a href="https://openstreetmap.fr/" target="_blank">OpenStreetMap France</a>',
                maxZoom: 19
            })
        });
    }
}

/**
 * Concrete Strategy: Stadia Maps Smooth
 */
export class StadiaSmoothStrategy extends TileLayerStrategy {
    createLayer() {
        return new TileLayer({
            source: new StadiaMaps({
                layer: 'alidade_smooth',
                retina: true
            })
        });
    }
}

/**
 * Concrete Strategy: Stadia Maps Smooth Dark
 */
export class StadiaSmoothDarkStrategy extends TileLayerStrategy {
    createLayer() {
        return new TileLayer({
            source: new StadiaMaps({
                layer: 'alidade_smooth_dark',
                retina: true
            })
        });
    }
}

/**
 * Concrete Strategy: Stadia Maps Outdoors
 */
export class StadiaOutdoorsStrategy extends TileLayerStrategy {
    createLayer() {
        return new TileLayer({
            source: new StadiaMaps({
                layer: 'outdoors',
                retina: true
            })
        });
    }
}

/**
 * Factory: Creates appropriate tile layer strategy
 * Single Responsibility: Only responsible for creating tile layers
 */
export class TileLayerFactory {
    constructor() {
        this.strategies = {
            'osm': new OSMStandardStrategy(),
            'osm-humanitarian': new OSMHumanitarianStrategy(),
            'stadia-smooth': new StadiaSmoothStrategy(),
            'stadia-smooth-dark': new StadiaSmoothDarkStrategy(),
            'stadia-outdoors': new StadiaOutdoorsStrategy()
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
            { value: 'osm', label: 'OpenStreetMap Standard' },
            { value: 'osm-humanitarian', label: 'OpenStreetMap Humanitarian (HOT)' },
            { value: 'stadia-smooth', label: 'Stadia Maps - Alidade Smooth' },
            { value: 'stadia-smooth-dark', label: 'Stadia Maps - Alidade Smooth Dark' },
            { value: 'stadia-outdoors', label: 'Stadia Maps - Outdoors' }
        ];
    }
}
