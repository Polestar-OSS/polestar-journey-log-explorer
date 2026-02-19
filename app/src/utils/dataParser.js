import Papa from 'papaparse';
import ExcelJS from 'exceljs';

// Constants for carbon calculations
// Average ICE car fuel consumption (L/100km) -- US EPA average
export const AVG_ICE_FUEL_CONSUMPTION = 8.9;
// Average ICE car fuel consumption (gal/100mi) -- US EPA average
export const AVG_ICE_FUEL_CONSUMPTION_GAL = 4.2;
// Gasoline produces ~2.31 kg CO2 per liter 
export const CO2_PER_LITER_GASOLINE = 2.31;
// Gasoline produces ~8.887 kg CO2 per gallon
export const CO2_PER_GALLON_GASOLINE = 8.887;
// One tree absorbs ~21kg CO2/year
export const TREE_CO2_ABSORPTION_PER_YEAR = 21;

/**
 * Detect the distance column name from CSV/XLSX headers
 * @param {Array} headers - Column header names
 * @returns {{ distanceColumn: string, distanceUnit: 'km'|'mi' }}
 */
const detectDistanceColumn = (headers) => {
    if (headers.includes('Distance in Mile')) {
        return { distanceColumn: 'Distance in Mile', distanceUnit: 'mi' };
    }
    if (headers.includes('Distance in KM')) {
        return { distanceColumn: 'Distance in KM', distanceUnit: 'km' };
    }
    // Fallback to KM if neither is found
    return { distanceColumn: 'Distance in KM', distanceUnit: 'km' };
};

/**
 * Build column mapping based on detected headers
 * @param {string} distanceColumn - The detected distance column name
 * @returns {Object} Column mapping
 */
const buildMapping = (distanceColumn) => ({
    distanceKm: distanceColumn,
    startDate: 'Start Date',
    endDate: 'End Date',
    startAddress: 'Start Address',
    endAddress: 'End Address',
    consumptionKwh: 'Consumption in Kwh',
    category: 'Category',
    startLat: 'Start Latitude',
    startLng: 'Start Longitude',
    endLat: 'End Latitude',
    endLng: 'End Longitude',
    startOdometer: 'Start Odometer',
    endOdometer: 'End Odometer',
    tripType: 'Trip Type',
    socSource: 'SOC Source',
    socDestination: 'SOC Destination',
    comments: 'Comments',
});

export const parseCSV = (file) => {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => {
                const headers = results.meta?.fields || [];
                const { distanceColumn, distanceUnit } = detectDistanceColumn(headers);
                const mapping = buildMapping(distanceColumn);
                const trips = processJourneyData(results.data, mapping);
                resolve({ trips, distanceUnit });
            },
            error: (error) => {
                reject(error);
            },
        });
    });
};

export const parseXLSX = async (file) => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);

        // Get the first worksheet
        const worksheet = workbook.worksheets[0];

        if (!worksheet) {
            throw new Error('No worksheet found in the Excel file');
        }

        // Convert worksheet to JSON
        const jsonData = [];
        const headers = [];

        // Get headers from the first row
        worksheet.getRow(1).eachCell((cell, colNumber) => {
            headers[colNumber] = cell.value;
        });

        // Process data rows
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Skip header row

            const rowData = {};
            row.eachCell((cell, colNumber) => {
                const header = headers[colNumber];
                if (header) {
                    rowData[header] = cell.value;
                }
            });

            if (Object.keys(rowData).length > 0) {
                jsonData.push(rowData);
            }
        });

        // Detect distance column and build mapping
        const headerNames = headers.filter(Boolean);
        const { distanceColumn, distanceUnit } = detectDistanceColumn(headerNames);
        const mapping = buildMapping(distanceColumn);
        const trips = processJourneyData(jsonData, mapping);
        return { trips, distanceUnit };
    } catch (error) {
        throw new Error(`Failed to parse Excel file: ${error.message}`);
    }
};

const calculateEfficiency = (consumption, distance) => {
    const d = parseFloat(distance);
    const c = parseFloat(consumption);
    if (d > 0) {
        return ((c / d) * 100).toFixed(2);
    }
    return '0';
};

const processJourneyData = (rawData, mapping) => {
    // Use provided mapping, fallback to defaults if not specified
    const m = mapping || buildMapping('Distance in KM');
    return rawData
        .filter(row => parseFloat(row[m.distanceKm]) > 0) // Filter out zero-distance entries
        .map((row, index) => ({
            id: index,
            startDate: row[m.startDate],
            endDate: row[m.endDate],
            startAddress: row[m.startAddress],
            endAddress: row[m.endAddress],
            distanceKm: parseFloat(row[m.distanceKm]) || 0,
            consumptionKwh: parseFloat(row[m.consumptionKwh]) || 0,
            category: row[m.category] || 'Uncategorized',
            startLat: parseFloat(row[m.startLat]) || 0,
            startLng: parseFloat(row[m.startLng]) || 0,
            endLat: parseFloat(row[m.endLat]) || 0,
            endLng: parseFloat(row[m.endLng]) || 0,
            startOdometer: parseInt(row[m.startOdometer]) || 0,
            endOdometer: parseInt(row[m.endOdometer]) || 0,
            tripType: row[m.tripType] || 'SINGLE',
            socSource: parseInt(row[m.socSource]) || 0,
            socDestination: parseInt(row[m.socDestination]) || 0,
            comments: row[m.comments] || '',
            // Calculated fields
            efficiency: calculateEfficiency(row[m.consumptionKwh], row[m.distanceKm]),
            socDrop: (parseInt(row[m.socSource]) || 0) - (parseInt(row[m.socDestination]) || 0),
        }));
};

export const calculateStatistics = (data, distanceUnit = 'km') => {
    if (!data || data.length === 0) return null;

    const totalDistance = data.reduce((sum, trip) => sum + trip.distanceKm, 0);
    const totalConsumption = data.reduce((sum, trip) => sum + trip.consumptionKwh, 0);
    const avgEfficiency = calculateEfficiency(totalConsumption, totalDistance);

    const efficiencies = data
        .filter(trip => trip.efficiency > 0)
        .map(trip => parseFloat(trip.efficiency));

    // Carbon savings calculation
    let fuelConsumed, co2Saved, fuelUnit;
    if (distanceUnit === 'mi') {
        // Average ICE car: 4.2 gal/100mi (US EPA average ~23.8 mpg combined)
        // Gas produces ~8.887 kg CO2 per gallon
        fuelConsumed = (totalDistance / 100) * AVG_ICE_FUEL_CONSUMPTION_GAL; // gallons
        co2Saved = fuelConsumed * CO2_PER_GALLON_GASOLINE; // kg
        fuelUnit = 'gal';
    } else {
        // Average ICE car: 8.9 L/100km (US EPA average)
        // Gas produces ~2.31 kg CO2 per liter
        fuelConsumed = (totalDistance / 100) * AVG_ICE_FUEL_CONSUMPTION; // liters
        co2Saved = fuelConsumed * CO2_PER_LITER_GASOLINE; // kg
        fuelUnit = 'L';
    }
    const treesEquivalent = co2Saved / TREE_CO2_ABSORPTION_PER_YEAR; // One tree absorbs ~21kg CO2/year

    return {
        totalTrips: data.length,
        totalDistance: totalDistance.toFixed(2),
        totalConsumption: totalConsumption.toFixed(2),
        avgEfficiency: avgEfficiency,
        bestEfficiency: efficiencies.length > 0 ? Math.min(...efficiencies).toFixed(2) : 0,
        worstEfficiency: efficiencies.length > 0 ? Math.max(...efficiencies).toFixed(2) : 0,
        avgTripDistance: (totalDistance / data.length).toFixed(2),
        ...(() => {
            // Find min startOdometer and max endOdometer in a single pass
            const { minStart, maxEnd } = data.reduce(
                (acc, t) => ({
                    minStart: Math.min(acc.minStart, t.startOdometer),
                    maxEnd: Math.max(acc.maxEnd, t.endOdometer),
                }),
                {
                    minStart: data[0]?.startOdometer ?? 0,
                    maxEnd: data[0]?.endOdometer ?? 0,
                }
            );
            return { odometerStart: minStart, odometerEnd: maxEnd };
        })(),
        carbonSaved: co2Saved.toFixed(2),
        treesEquivalent: treesEquivalent.toFixed(1),
        gasSaved: fuelConsumed.toFixed(2),
        distanceUnit,
        fuelUnit,
    };
};
