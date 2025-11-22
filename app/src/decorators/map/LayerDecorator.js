/**
 * Decorator Pattern: Adds functionality to layers without modifying their core implementation
 * Open/Closed Principle: Layers are open for extension but closed for modification
 */
export class LayerDecorator {
    constructor(layer) {
        this.layer = layer;
    }

    getLayer() {
        return this.layer;
    }

    setVisible(visible) {
        this.layer.setVisible(visible);
    }

    getVisible() {
        return this.layer.getVisible();
    }
}

/**
 * Concrete Decorator: Adds visibility toggle functionality
 */
export class VisibilityDecorator extends LayerDecorator {
    constructor(layer, initialVisibility = true) {
        super(layer);
        this.layer.setVisible(initialVisibility);
    }

    toggle() {
        this.setVisible(!this.getVisible());
    }
}

/**
 * Concrete Decorator: Adds opacity control
 */
export class OpacityDecorator extends LayerDecorator {
    constructor(layer, initialOpacity = 1.0) {
        super(layer);
        this.setOpacity(initialOpacity);
    }

    setOpacity(opacity) {
        if (opacity < 0 || opacity > 1) {
            throw new Error('Opacity must be between 0 and 1');
        }
        this.layer.setOpacity(opacity);
    }

    getOpacity() {
        return this.layer.getOpacity();
    }
}

/**
 * Concrete Decorator: Adds z-index control
 */
export class ZIndexDecorator extends LayerDecorator {
    constructor(layer, zIndex = 0) {
        super(layer);
        this.setZIndex(zIndex);
    }

    setZIndex(zIndex) {
        this.layer.setZIndex(zIndex);
    }

    getZIndex() {
        return this.layer.getZIndex();
    }
}
