/**
 * ChartDataProcessor - Service for processing trip data into chart-ready formats
 * Follows Single Responsibility Principle: Only handles data transformation for charts
 */
export class ChartDataProcessor {
    /**
     * Process distance and consumption data over time
     * @param {Array} data - Raw trip data
     * @param {number} days - Number of days to include (default: 30)
     * @returns {Array} Time series data
     */
    processTimeSeriesData(data, days = 30) {
        const distanceByDate = data.reduce((acc, trip) => {
            const date = trip.startDate.split(',')[0];
            if (!acc[date]) {
                acc[date] = { date, distance: 0, consumption: 0, trips: 0 };
            }
            acc[date].distance += trip.distanceKm;
            acc[date].consumption += trip.consumptionKwh;
            acc[date].trips += 1;
            return acc;
        }, {});

        return Object.values(distanceByDate)
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(-days);
    }

    /**
     * Process efficiency distribution data
     * @param {Array} data - Raw trip data
     * @param {number} minEfficiency - Minimum efficiency threshold
     * @param {number} maxEfficiency - Maximum efficiency threshold
     * @returns {Array} Efficiency data sorted by efficiency value
     */
    processEfficiencyData(data, minEfficiency = 0, maxEfficiency = 50) {
        return data
            .filter(trip => trip.efficiency > minEfficiency && trip.efficiency < maxEfficiency)
            .map(trip => ({
                efficiency: parseFloat(trip.efficiency),
                distance: trip.distanceKm,
            }))
            .sort((a, b) => a.efficiency - b.efficiency);
    }

    /**
     * Process trip distance distribution into ranges
     * @param {Array} data - Raw trip data
     * @returns {Array} Distance range data with counts
     */
    processDistanceRanges(data) {
        const distanceRanges = [
            { range: '0-5 km', min: 0, max: 5, count: 0 },
            { range: '5-10 km', min: 5, max: 10, count: 0 },
            { range: '10-20 km', min: 10, max: 20, count: 0 },
            { range: '20-50 km', min: 20, max: 50, count: 0 },
            { range: '50+ km', min: 50, max: Infinity, count: 0 },
        ];

        data.forEach(trip => {
            const range = distanceRanges.find(r => trip.distanceKm >= r.min && trip.distanceKm < r.max);
            if (range) range.count++;
        });

        return distanceRanges;
    }

    /**
     * Process SOC (State of Charge) data for recent trips
     * @param {Array} data - Raw trip data
     * @param {number} count - Number of recent trips to include
     * @returns {Array} SOC data with start, end, and drop values
     */
    processSOCData(data, count = 20) {
        return data
            .slice(-count)
            .map((trip, idx) => ({
                trip: `Trip ${idx + 1}`,
                startSOC: trip.socSource,
                endSOC: trip.socDestination,
                drop: trip.socDrop,
            }));
    }

    /**
     * Process consumption by time of day
     * @param {Array} data - Raw trip data
     * @returns {Array} Consumption grouped by hour
     */
    processConsumptionByTimeOfDay(data) {
        const consumptionByHour = {};

        data.forEach(trip => {
            // Extract hour from startDate format: "YYYY-MM-DD, HH:MM"
            const timePart = trip.startDate.split(',')[1]?.trim();
            if (!timePart) return;

            const hour = parseInt(timePart.split(':')[0]);
            if (isNaN(hour)) return;

            if (!consumptionByHour[hour]) {
                consumptionByHour[hour] = {
                    hour,
                    totalConsumption: 0,
                    trips: 0,
                };
            }

            consumptionByHour[hour].totalConsumption += trip.consumptionKwh;
            consumptionByHour[hour].trips += 1;
        });

        return Object.values(consumptionByHour)
            .map(item => ({
                ...item,
                avgConsumption: item.totalConsumption / item.trips,
            }))
            .sort((a, b) => a.hour - b.hour);
    }
}
