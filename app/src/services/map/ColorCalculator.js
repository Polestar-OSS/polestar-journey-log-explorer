/**
 * Single Responsibility Principle: Handles only color calculations
 * Dependency Inversion: Higher-level modules depend on this abstraction
 */
export class ColorCalculator {
    /**
     * @param {string} distanceUnit - Distance unit ('km' or 'mi')
     */
    constructor(distanceUnit = 'km') {
        this.setDistanceUnit(distanceUnit);
    }

    /**
     * Update the distance unit and recalculate thresholds
     * @param {string} distanceUnit - 'km' or 'mi'
     */
    setDistanceUnit(distanceUnit) {
        this.distanceUnit = distanceUnit;
        const multiplier = distanceUnit === 'mi' ? 1.60934 : 1;
        // km thresholds: 15, 20, 25
        this._t1 = Math.round(15 * multiplier);
        this._t2 = Math.round(20 * multiplier);
        this._t3 = Math.round(25 * multiplier);
    }

    /**
     * Calculate color based on efficiency value
     * @param {number} efficiency - Efficiency in kWh/100 distance units
     * @returns {Array<number>} RGB color array [r, g, b]
     */
    getEfficiencyColor(efficiency) {
        const eff = parseFloat(efficiency);
        if (eff < this._t1) return [18, 184, 134]; // green
        if (eff < this._t2) return [250, 176, 5];  // yellow
        if (eff < this._t3) return [253, 126, 20]; // orange
        return [250, 82, 82]; // red
    }

    /**
     * Get color for day-based grouping
     * @param {number} dayIndex - Index of the day
     * @returns {Array<number>} RGB color array [r, g, b]
     */
    getDayColor(dayIndex) {
        const dayColors = [
            [18, 184, 134],  // green
            [21, 170, 191],  // teal
            [76, 110, 245],  // blue
            [121, 80, 242],  // purple
            [230, 73, 128],  // pink
            [253, 126, 20],  // orange
            [250, 176, 5]    // yellow
        ];

        return dayColors[dayIndex % dayColors.length];
    }

    /**
     * Convert RGB array to CSS rgba string
     * @param {Array<number>} rgb - RGB color array
     * @param {number} alpha - Opacity (0-1)
     * @returns {string} CSS rgba string
     */
    rgbToRgba(rgb, alpha = 1) {
        return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
    }

    /**
     * Convert RGB array to CSS rgb string
     * @param {Array<number>} rgb - RGB color array
     * @returns {string} CSS rgb string
     */
    rgbToString(rgb) {
        return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
    }
}
