/**
 * ChartStrategy - Base strategy for chart rendering
 * Follows Strategy Pattern: Different chart types have different rendering strategies
 */
export class ChartStrategy {
    /**
     * Get chart configuration
     * @returns {Object} Chart configuration
     */
    getConfig() {
        throw new Error('getConfig() must be implemented by subclass');
    }

    /**
     * Get chart title
     * @returns {string} Chart title
     */
    getTitle() {
        throw new Error('getTitle() must be implemented by subclass');
    }

    /**
     * Get chart type
     * @returns {string} Chart type (line, bar, pie, etc.)
     */
    getType() {
        throw new Error('getType() must be implemented by subclass');
    }
}

/**
 * TimeSeriesChartStrategy - Strategy for rendering time series charts
 */
export class TimeSeriesChartStrategy extends ChartStrategy {
    constructor(dataKeys = ['distance', 'consumption'], colors = ['#228be6', '#fab005']) {
        super();
        this.dataKeys = dataKeys;
        this.colors = colors;
    }

    getConfig() {
        return {
            cartesianGrid: { strokeDasharray: '3 3' },
            xAxis: {
                dataKey: 'date',
                angle: -45,
                textAnchor: 'end',
                height: 80,
                tick: { fontSize: 12 },
            },
            yAxis: {},
            lines: this.dataKeys.map((key, idx) => ({
                type: 'monotone',
                dataKey: key,
                stroke: this.colors[idx],
                name: this._formatLabel(key),
            })),
        };
    }

    getTitle() {
        return 'Daily Distance & Consumption';
    }

    getType() {
        return 'line';
    }

    _formatLabel(key) {
        const labels = {
            distance: 'Distance (km)',
            consumption: 'Consumption (kWh)',
            trips: 'Number of Trips',
        };
        return labels[key] || key;
    }
}

/**
 * PieChartStrategy - Strategy for rendering pie charts
 */
export class PieChartStrategy extends ChartStrategy {
    constructor(dataKey = 'count', nameKey = 'range') {
        super();
        this.dataKey = dataKey;
        this.nameKey = nameKey;
    }

    getConfig() {
        return {
            pie: {
                dataKey: this.dataKey,
                nameKey: this.nameKey,
                cx: '50%',
                cy: '50%',
                labelLine: false,
                label: this._renderLabel,
                outerRadius: 80,
            },
            colors: ['#228be6', '#12b886', '#fab005', '#fa5252', '#be4bdb'],
        };
    }

    getTitle() {
        return 'Distribution';
    }

    getType() {
        return 'pie';
    }

    _renderLabel(entry) {
        return `${entry.range}: ${entry.count}`;
    }
}

/**
 * BarChartStrategy - Strategy for rendering bar charts
 */
export class BarChartStrategy extends ChartStrategy {
    constructor(dataKeys = ['value'], colors = ['#228be6']) {
        super();
        this.dataKeys = dataKeys;
        this.colors = colors;
    }

    getConfig() {
        return {
            cartesianGrid: { strokeDasharray: '3 3' },
            xAxis: {
                dataKey: 'category',
            },
            yAxis: {},
            bars: this.dataKeys.map((key, idx) => ({
                dataKey: key,
                fill: this.colors[idx],
                name: this._formatLabel(key),
            })),
        };
    }

    getTitle() {
        return 'Bar Chart';
    }

    getType() {
        return 'bar';
    }

    _formatLabel(key) {
        return key.charAt(0).toUpperCase() + key.slice(1);
    }
}

/**
 * ComposedChartStrategy - Strategy for charts with multiple visualization types
 */
export class ComposedChartStrategy extends ChartStrategy {
    constructor(config) {
        super();
        this.config = config;
    }

    getConfig() {
        return {
            cartesianGrid: { strokeDasharray: '3 3' },
            xAxis: this.config.xAxis || { dataKey: 'name' },
            yAxis: this.config.yAxis || {},
            elements: this.config.elements || [],
        };
    }

    getTitle() {
        return this.config.title || 'Composed Chart';
    }

    getType() {
        return 'composed';
    }
}

/**
 * ChartFactory - Factory for creating chart strategies
 * Follows Factory Pattern: Centralized chart strategy creation
 */
export class ChartFactory {
    static createTimeSeriesChart(dataKeys, colors) {
        return new TimeSeriesChartStrategy(dataKeys, colors);
    }

    static createPieChart(dataKey, nameKey) {
        return new PieChartStrategy(dataKey, nameKey);
    }

    static createBarChart(dataKeys, colors) {
        return new BarChartStrategy(dataKeys, colors);
    }

    static createComposedChart(config) {
        return new ComposedChartStrategy(config);
    }

    /**
     * Get all available chart types
     * @returns {Array} Available chart type configurations
     */
    static getAvailableChartTypes() {
        return [
            { value: 'line', label: 'Line Chart', icon: '📈' },
            { value: 'bar', label: 'Bar Chart', icon: '📊' },
            { value: 'pie', label: 'Pie Chart', icon: '🥧' },
            { value: 'composed', label: 'Composed Chart', icon: '📉' },
        ];
    }
}
