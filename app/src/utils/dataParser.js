import Papa from 'papaparse';
import ExcelJS from 'exceljs';

export const parseCSV = (file) => {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => {
                resolve(processJourneyData(results.data));
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

        return processJourneyData(jsonData);
    } catch (error) {
        throw new Error(`Failed to parse Excel file: ${error.message}`);
    }
};

const processJourneyData = (rawData) => {
    return rawData
        .filter(row => row['Distance in KM'] > 0) // Filter out zero-distance entries
        .map((row, index) => ({
            id: index,
            startDate: row['Start Date'],
            endDate: row['End Date'],
            startAddress: row['Start Address'],
            endAddress: row['End Address'],
            distanceKm: parseFloat(row['Distance in KM']) || 0,
            consumptionKwh: parseFloat(row['Consumption in Kwh']) || 0,
            category: row['Category'] || 'Uncategorized',
            startLat: parseFloat(row['Start Latitude']) || 0,
            startLng: parseFloat(row['Start Longitude']) || 0,
            endLat: parseFloat(row['End Latitude']) || 0,
            endLng: parseFloat(row['End Longitude']) || 0,
            startOdometer: parseInt(row['Start Odometer']) || 0,
            endOdometer: parseInt(row['End Odometer']) || 0,
            tripType: row['Trip Type'] || 'SINGLE',
            socSource: parseInt(row['SOC Source']) || 0,
            socDestination: parseInt(row['SOC Destination']) || 0,
            comments: row['Comments'] || '',
            // Calculated fields
            efficiency: parseFloat(row['Distance in KM']) > 0
                ? (parseFloat(row['Consumption in Kwh']) / parseFloat(row['Distance in KM']) * 100).toFixed(2)
                : 0,
            socDrop: (parseInt(row['SOC Source']) || 0) - (parseInt(row['SOC Destination']) || 0),
        }));
};

export const calculateStatistics = (data) => {
    if (!data || data.length === 0) return null;

    const totalDistance = data.reduce((sum, trip) => sum + trip.distanceKm, 0);
    const totalConsumption = data.reduce((sum, trip) => sum + trip.consumptionKwh, 0);
    const avgEfficiency = totalDistance > 0 ? (totalConsumption / totalDistance * 100) : 0;

    const efficiencies = data
        .filter(trip => trip.efficiency > 0)
        .map(trip => parseFloat(trip.efficiency));

    // Carbon savings calculation
    // Average ICE car: 8.9 L/100km (US EPA average)
    // Gas produces ~2.31 kg CO2 per liter
    const avgIceFuelConsumption = 8.9; // L/100km
    const co2PerLiter = 2.31; // kg
    const gasConsumed = (totalDistance / 100) * avgIceFuelConsumption; // liters
    const co2Saved = gasConsumed * co2PerLiter; // kg
    const treesEquivalent = co2Saved / 21; // One tree absorbs ~21kg CO2/year

    return {
        totalTrips: data.length,
        totalDistance: totalDistance.toFixed(2),
        totalConsumption: totalConsumption.toFixed(2),
        avgEfficiency: avgEfficiency.toFixed(2),
        bestEfficiency: efficiencies.length > 0 ? Math.min(...efficiencies).toFixed(2) : 0,
        worstEfficiency: efficiencies.length > 0 ? Math.max(...efficiencies).toFixed(2) : 0,
        avgTripDistance: (totalDistance / data.length).toFixed(2),
        odometerStart: Math.min(...data.map(t => t.startOdometer)),
        odometerEnd: Math.max(...data.map(t => t.endOdometer)),
        carbonSaved: co2Saved.toFixed(2),
        treesEquivalent: treesEquivalent.toFixed(1),
        gasSaved: gasConsumed.toFixed(2),
    };
};
