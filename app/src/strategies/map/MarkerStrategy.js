import { Feature } from 'ol';
import { Point } from 'ol/geom';
import { Style, Icon } from 'ol/style';
import { fromLonLat } from 'ol/proj';

/**
 * Strategy Pattern: Defines the interface for creating different marker types
 * Single Responsibility: Each strategy handles one type of marker creation
 */
export class MarkerStrategy {
    /**
     * Abstract method for creating a marker.
     * The parameters are intentionally unused in this base class, but their inclusion enforces
     * a consistent interface for subclasses implementing Strategy Pattern.
     * @param {*} _trip - Trip data object for marker generation.
     * @param {*} _type - Type of marker to create.
     * @param {*} _index - Index of the marker in the sequence.
     */
    createMarker(_trip, _type, _index) {
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
                src: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSI0MiIgdmlld0JveD0iMCAwIDMyIDQyIj4KICA8cGF0aCBmaWxsPSIjMjE5NkYzIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIGQ9Ik0xNiwyIEM4LjgyLDIgMyw3LjgyIDMsMTUgQzMsMjQgMTYsNDAgMTYsNDAgQzE2LDQwIDI5LDI0IDI5LDE1IEMyOSw3LjgyIDIzLjE4LDIgMTYsMiBaIi8+CiAgPGNpcmNsZSBjeD0iMTYiIGN5PSIxNSIgcj0iNSIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cg==',
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
    // Sanitizer for individual RGB channel values
    static sanitizeRgbComponent(value) {
        const num = Number(value);
        if (isNaN(num)) return 0;
        return Math.max(0, Math.min(255, Math.floor(num)));
    }

    constructor(colorCalculator) {
        super();
        this.colorCalculator = colorCalculator;
    }

    createMarker(trip, type, index) {
        // Use a default efficiency if not provided or invalid
        let efficiency = trip.efficiency;
        if (typeof efficiency !== 'number' || isNaN(efficiency)) {
            efficiency = 0; // Default to 0 efficiency for trips without valid data
        }

        let color = this.colorCalculator.getEfficiencyColor(efficiency);
        color = [
            EndMarkerStrategy.sanitizeRgbComponent(color[0]),
            EndMarkerStrategy.sanitizeRgbComponent(color[1]),
            EndMarkerStrategy.sanitizeRgbComponent(color[2])
        ];
        // Validate that color is a safe RGB array
        let safeColor = [0, 0, 255]; // default to blue if invalid
        if (
            Array.isArray(color) &&
            color.length === 3 &&
            color.every(
                (c) =>
                    typeof c === 'number' &&
                    Number.isInteger(c) &&
                    c >= 0 &&
                    c <= 255
            )
        ) {
            safeColor = color;
        }
        const markerColor = `rgb(${safeColor[0]}, ${safeColor[1]}, ${safeColor[2]})`;

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
