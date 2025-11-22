import { Feature } from 'ol';
import { Point } from 'ol/geom';
import { Style, Icon } from 'ol/style';
import { fromLonLat } from 'ol/proj';

/**
 * Strategy Pattern: Defines the interface for creating different marker types
 * Single Responsibility: Each strategy handles one type of marker creation
 */
export class MarkerStrategy {
    createMarker(trip, type, index) {
        throw new Error('createMarker must be implemented by subclass');
    }
}

/**
 * Concrete Strategy: Creates start markers (blue pins)
 */
export class StartMarkerStrategy extends MarkerStrategy {
    createMarker(trip, type, index) {
        const marker = new Feature({
            geometry: new Point(fromLonLat([trip.startLng, trip.startLat])),
            tripData: trip,
            type: 'start'
        });

        marker.setStyle(new Style({
            image: new Icon({
                anchor: [0.5, 1],
                anchorXUnits: 'fraction',
                anchorYUnits: 'fraction',
                src: 'data:image/svg+xml;base64,' + btoa(`
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
            <path fill="#2196F3" stroke="white" stroke-width="2" d="M16,2 C8.82,2 3,7.82 3,15 C3,24 16,40 16,40 C16,40 29,24 29,15 C29,7.82 23.18,2 16,2 Z"/>
            <circle cx="16" cy="15" r="5" fill="white"/>
          </svg>
        `),
                scale: 0.8
            }),
            zIndex: 1000 + index
        }));

        return marker;
    }
}

/**
 * Concrete Strategy: Creates end markers (efficiency-colored pins)
 */
export class EndMarkerStrategy extends MarkerStrategy {
    constructor(colorCalculator) {
        super();
        this.colorCalculator = colorCalculator;
    }

    createMarker(trip, type, index) {
        const color = this.colorCalculator.getEfficiencyColor(trip.efficiency);
        const markerColor = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;

        const marker = new Feature({
            geometry: new Point(fromLonLat([trip.endLng, trip.endLat])),
            tripData: trip,
            type: 'end'
        });

        marker.setStyle(new Style({
            image: new Icon({
                anchor: [0.5, 1],
                anchorXUnits: 'fraction',
                anchorYUnits: 'fraction',
                src: 'data:image/svg+xml;base64,' + btoa(`
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
            <path fill="${markerColor}" stroke="white" stroke-width="2" d="M16,2 C8.82,2 3,7.82 3,15 C3,24 16,40 16,40 C16,40 29,24 29,15 C29,7.82 23.18,2 16,2 Z"/>
            <circle cx="16" cy="15" r="5" fill="white"/>
          </svg>
        `),
                scale: 0.8
            }),
            zIndex: 1000 + index
        }));

        return marker;
    }
}

/**
 * Context: Uses marker strategies to create appropriate markers
 */
export class MarkerFactory {
    constructor(colorCalculator) {
        this.strategies = {
            start: new StartMarkerStrategy(),
            end: new EndMarkerStrategy(colorCalculator)
        };
    }

    createMarker(trip, type, index) {
        const strategy = this.strategies[type];
        if (!strategy) {
            throw new Error(`Unknown marker type: ${type}`);
        }
        return strategy.createMarker(trip, type, index);
    }
}
