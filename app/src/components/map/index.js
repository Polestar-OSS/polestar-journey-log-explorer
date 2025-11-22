/**
 * Map module exports
 * Provides clean imports for map-related components and services
 */

// Components
export { default as MapView } from './MapView';

// Re-export services for convenience
export { MapService } from '../../services/map/MapService';
export { ColorCalculator } from '../../services/map/ColorCalculator';
export { FeatureBuilder } from '../../services/map/FeatureBuilder';

// Re-export strategies
export { TileLayerFactory, MarkerFactory } from '../../strategies/map/MarkerStrategy';
export { TileLayerFactory as LayerFactory } from '../../strategies/map/LayerStrategy';

// Re-export decorators
export * from '../../decorators/map/LayerDecorator';
