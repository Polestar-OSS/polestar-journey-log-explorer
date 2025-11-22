/**
 * StatisticsCalculator - Service for calculating trip statistics
 * Follows Single Responsibility Principle: Only handles statistical calculations
 */
export class StatisticsCalculator {
    /**
     * Calculate comprehensive statistics from trip data
     * @param {Array} data - Trip data
     * @returns {Object} Statistics object
     */
    calculateStatistics(data) {
        if (!data || data.length === 0) {
            return this._getEmptyStatistics();
        }

        return {
            totalTrips: this._calculateTotalTrips(data),
            totalDistance: this._calculateTotalDistance(data),
            totalConsumption: this._calculateTotalConsumption(data),
            avgEfficiency: this._calculateAverageEfficiency(data),
            bestEfficiency: this._calculateBestEfficiency(data),
            worstEfficiency: this._calculateWorstEfficiency(data),
            avgTripDistance: this._calculateAverageTripDistance(data),
            avgSOCDrop: this._calculateAverageSOCDrop(data),
            totalSOCUsed: this._calculateTotalSOCUsed(data),
            carbonSavings: this._calculateCarbonSavings(data),
        };
    }

    /**
     * Calculate carbon savings compared to ICE vehicles
     * @param {Array} data - Trip data
     * @param {number} iceEmissions - ICE vehicle emissions in kg CO2/km (default: 0.171)
     * @returns {number} Carbon savings in kg
     */
    calculateCarbonSavings(data, iceEmissions = 0.171) {
        const totalDistance = this._calculateTotalDistance(data);
        // Assuming grid emissions of ~0.4 kg CO2/kWh
        const totalConsumption = this._calculateTotalConsumption(data);
        const evEmissions = totalConsumption * 0.4;
        const iceEquivalent = totalDistance * iceEmissions;

        return Math.max(0, iceEquivalent - evEmissions);
    }

    /**
     * Calculate cost comparison between electric and gasoline
     * @param {Array} data - Trip data
     * @param {number} electricityCost - Cost per kWh
     * @param {number} gasolinePrice - Price per liter
     * @param {number} fuelEfficiency - L/100km for comparable ICE vehicle
     * @returns {Object} Cost comparison
     */
    calculateCostComparison(data, electricityCost, gasolinePrice, fuelEfficiency = 7.5) {
        const totalDistance = this._calculateTotalDistance(data);
        const totalConsumption = this._calculateTotalConsumption(data);

        const electricCost = totalConsumption * electricityCost;
        const gasolineLiters = (totalDistance / 100) * fuelEfficiency;
        const gasolineCost = gasolineLiters * gasolinePrice;

        return {
            electricCost: electricCost.toFixed(2),
            gasolineCost: gasolineCost.toFixed(2),
            savings: (gasolineCost - electricCost).toFixed(2),
            savingsPercent: ((gasolineCost - electricCost) / gasolineCost * 100).toFixed(1),
        };
    }

    /**
     * Calculate efficiency trends over time
     * @param {Array} data - Trip data
     * @param {number} windowSize - Moving average window size
     * @returns {Array} Efficiency trend data
     */
    calculateEfficiencyTrend(data, windowSize = 10) {
        const efficiencies = data
            .filter(trip => trip.efficiency > 0)
            .map(trip => parseFloat(trip.efficiency));

        if (efficiencies.length < windowSize) {
            return [];
        }

        const trend = [];
        for (let i = windowSize - 1; i < efficiencies.length; i++) {
            const window = efficiencies.slice(i - windowSize + 1, i + 1);
            const avg = window.reduce((sum, val) => sum + val, 0) / windowSize;
            trend.push({
                index: i,
                movingAverage: avg,
                actual: efficiencies[i],
            });
        }

        return trend;
    }

    // Private calculation methods
    _calculateTotalTrips(data) {
        return data.length;
    }

    _calculateTotalDistance(data) {
        const total = data.reduce((sum, trip) => sum + trip.distanceKm, 0);
        return total.toFixed(1);
    }

    _calculateTotalConsumption(data) {
        const total = data.reduce((sum, trip) => sum + trip.consumptionKwh, 0);
        return total.toFixed(1);
    }

    _calculateAverageEfficiency(data) {
        const validTrips = data.filter(trip => trip.efficiency > 0);
        if (validTrips.length === 0) return '0.0';

        const avg = validTrips.reduce((sum, trip) => sum + parseFloat(trip.efficiency), 0) / validTrips.length;
        return avg.toFixed(1);
    }

    _calculateBestEfficiency(data) {
        const validTrips = data.filter(trip => trip.efficiency > 0);
        if (validTrips.length === 0) return '0.0';

        const best = Math.min(...validTrips.map(trip => parseFloat(trip.efficiency)));
        return best.toFixed(1);
    }

    _calculateWorstEfficiency(data) {
        const validTrips = data.filter(trip => trip.efficiency > 0);
        if (validTrips.length === 0) return '0.0';

        const worst = Math.max(...validTrips.map(trip => parseFloat(trip.efficiency)));
        return worst.toFixed(1);
    }

    _calculateAverageTripDistance(data) {
        if (data.length === 0) return '0.0';

        const avg = data.reduce((sum, trip) => sum + trip.distanceKm, 0) / data.length;
        return avg.toFixed(1);
    }

    _calculateAverageSOCDrop(data) {
        if (data.length === 0) return '0.0';

        const avg = data.reduce((sum, trip) => sum + trip.socDrop, 0) / data.length;
        return avg.toFixed(1);
    }

    _calculateTotalSOCUsed(data) {
        const total = data.reduce((sum, trip) => sum + trip.socDrop, 0);
        return total.toFixed(0);
    }

    _calculateCarbonSavings(data) {
        return this.calculateCarbonSavings(data).toFixed(1);
    }

    _getEmptyStatistics() {
        return {
            totalTrips: 0,
            totalDistance: '0.0',
            totalConsumption: '0.0',
            avgEfficiency: '0.0',
            bestEfficiency: '0.0',
            worstEfficiency: '0.0',
            avgTripDistance: '0.0',
            avgSOCDrop: '0.0',
            totalSOCUsed: '0',
            carbonSavings: '0.0',
        };
    }
}
