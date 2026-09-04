import Papa from 'papaparse';
import { parseJourneyDate, formatJourneyDate, dayKey, monthKey, weekKey, mondayIndex } from './journeyDate';


/**
 * Accepted header names per field. The first entry is the Journey Log app's
 * own column; the rest are the labels older explorer table exports used, so
 * a file this app produced before it wrote the Journey Log format still
 * imports. Case and surrounding whitespace are ignored.
 */
export const COLUMN_ALIASES = {
    distanceKm: ['Distance in KM', 'Distance (km)'],
    distanceMi: ['Distance in Mile', 'Distance (mi)'],
    startDate: ['Start Date'],
    endDate: ['End Date'],
    startAddress: ['Start Address'],
    endAddress: ['End Address'],
    consumptionKwh: ['Consumption in Kwh', 'Consumption (kWh)'],
    category: ['Category'],
    startLat: ['Start Latitude'],
    startLng: ['Start Longitude'],
    endLat: ['End Latitude'],
    endLng: ['End Longitude'],
    startOdometer: ['Start Odometer'],
    endOdometer: ['End Odometer'],
    tripType: ['Trip Type'],
    socSource: ['SOC Source', 'SOC Start'],
    socDestination: ['SOC Destination', 'SOC End'],
    comments: ['Comments'],
};

const normalise = (h) => String(h ?? '').trim().toLowerCase();

/** The header actually present in the file for a field, or undefined. */
const findHeader = (headers, candidates) => {
    const byNorm = new Map(headers.map((h) => [normalise(h), h]));
    for (const c of candidates) { const hit = byNorm.get(normalise(c)); if (hit !== undefined) return hit; }
    return undefined;
};

/**
 * Detect the distance column and its unit from the file's headers.
 * @returns {{ distanceColumn: string, distanceUnit: 'km'|'mi' } | null} null when no known distance column exists
 */
export const detectDistanceColumn = (headers) => {
    const mi = findHeader(headers, COLUMN_ALIASES.distanceMi);
    if (mi) return { distanceColumn: mi, distanceUnit: 'mi' };
    const km = findHeader(headers, COLUMN_ALIASES.distanceKm);
    if (km) return { distanceColumn: km, distanceUnit: 'km' };
    return null;
};

/** Field -> header name for this file (unknown fields map to their canonical name and read as empty). */
const buildMapping = (headers, distanceColumn) => {
    const mapping = { distanceKm: distanceColumn };
    for (const [field, candidates] of Object.entries(COLUMN_ALIASES)) {
        if (field === 'distanceKm' || field === 'distanceMi') continue;
        mapping[field] = findHeader(headers, candidates) ?? candidates[0];
    }
    return mapping;
};

/**
 * Turn raw header/row objects (as exported by the Journey Log app) into the
 * internal trip model. Shared by CSV, XLSX and the built-in sample dataset.
 */
export const processRawRows = (rows, headers) => {
    const detected = detectDistanceColumn(headers);
    if (!detected) {
        throw new Error('no "Distance in KM" or "Distance in Mile" column, so this is not a Journey Log export. Export from the Journey Log app, or from this explorer.');
    }
    const { distanceColumn, distanceUnit } = detected;
    const mapping = buildMapping(headers, distanceColumn);
    return { data: processJourneyData(rows, mapping), distanceUnit };
};

export const parseCSV = (file) => {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => {
                const headers = results.meta?.fields || [];
                resolve(processRawRows(results.data, headers));
            },
            error: (error) => {
                reject(error);
            },
        });
    });
};

/** Unwrap ExcelJS rich cell values (formulas, rich text, hyperlinks) */
const cellValue = (value) => {
    if (value === null || value === undefined) return value;
    if (typeof value === 'object' && !(value instanceof Date)) {
        if ('result' in value) return value.result;
        if ('richText' in value) return value.richText.map((t) => t.text).join('');
        if ('text' in value) return value.text;
        if ('hyperlink' in value) return value.text ?? value.hyperlink;
    }
    return value;
};

export const parseXLSX = async (file) => {
    try {
        // exceljs is ~1 MB minified; load it only when an .xlsx is actually dropped
        const { default: ExcelJS } = await import('exceljs');
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
            headers[colNumber] = String(cellValue(cell.value) ?? '').trim();
        });

        // Process data rows
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Skip header row

            const rowData = {};
            row.eachCell((cell, colNumber) => {
                const header = headers[colNumber];
                if (header) {
                    rowData[header] = cellValue(cell.value);
                }
            });

            if (Object.keys(rowData).length > 0) {
                jsonData.push(rowData);
            }
        });

        return processRawRows(jsonData, headers.filter(Boolean));
    } catch (error) {
        throw new Error(`Failed to parse Excel file: ${error.message}`);
    }
};

/**
 * Parse a Journey Log export by file extension. Returns the trips, the
 * detected distance unit and the file name so callers can track sources.
 */
export const parseJourneyFile = async (file) => {
    const name = (file.name || '').toLowerCase();
    let result;
    if (name.endsWith('.csv')) result = await parseCSV(file);
    else if (name.endsWith('.xlsx') || name.endsWith('.xls')) result = await parseXLSX(file);
    else throw new Error(`Unsupported file "${file.name}". Drop a CSV or XLSX export from the Journey Log app.`);
    return { ...result, fileName: file.name };
};

const calculateEfficiency = (consumption, distance) => {
    const d = parseFloat(distance);
    const c = parseFloat(consumption);
    if (d > 0 && c >= 0) {
        return Math.round((c / d) * 100 * 100) / 100;
    }
    return 0;
};

const toDateString = (value) => {
    if (value instanceof Date) return formatJourneyDate(value);
    return value === null || value === undefined ? '' : String(value);
};

const processJourneyData = (rawData, mapping) => {
    const m = mapping || buildMapping(COLUMN_ALIASES.distanceKm, COLUMN_ALIASES.distanceKm[0]);
    const trips = rawData
        .filter((row) => parseFloat(row[m.distanceKm]) > 0) // Filter out zero-distance entries
        .map((row) => {
            const start = parseJourneyDate(row[m.startDate]);
            const end = parseJourneyDate(row[m.endDate]);
            const distanceKm = parseFloat(row[m.distanceKm]) || 0;
            const consumptionKwh = parseFloat(row[m.consumptionKwh]) || 0;
            const socSource = parseInt(row[m.socSource]) || 0;
            const socDestination = parseInt(row[m.socDestination]) || 0;
            const durationMin = start && end ? Math.max(0, Math.round((end - start) / 60000)) : null;

            return {
                startDate: toDateString(row[m.startDate]),
                endDate: toDateString(row[m.endDate]),
                startAddress: String(row[m.startAddress] ?? ''),
                endAddress: String(row[m.endAddress] ?? ''),
                distanceKm,
                consumptionKwh,
                category: row[m.category] || 'Uncategorized',
                startLat: parseFloat(row[m.startLat]) || 0,
                startLng: parseFloat(row[m.startLng]) || 0,
                endLat: parseFloat(row[m.endLat]) || 0,
                endLng: parseFloat(row[m.endLng]) || 0,
                startOdometer: parseInt(row[m.startOdometer]) || 0,
                endOdometer: parseInt(row[m.endOdometer]) || 0,
                tripType: row[m.tripType] || 'SINGLE',
                socSource,
                socDestination,
                comments: row[m.comments] || '',
                // Calculated fields
                efficiency: calculateEfficiency(consumptionKwh, distanceKm),
                socDrop: socSource - socDestination,
                // Derived time fields (null-safe when a date failed to parse)
                startTs: start ? start.getTime() : null,
                endTs: end ? end.getTime() : null,
                durationMin,
                avgSpeed: durationMin > 0 ? Math.round((distanceKm / (durationMin / 60)) * 10) / 10 : null,
                hour: start ? start.getHours() : null,
                weekday: start ? mondayIndex(start) : null,
                dayKey: start ? dayKey(start) : null,
                weekKey: start ? weekKey(start) : null,
                monthKey: start ? monthKey(start) : null,
            };
        })
        // Journey Log exports newest-first; every "last N trips" view expects chronological order
        .sort((a, b) => (a.startTs ?? 0) - (b.startTs ?? 0));

    return trips.map((trip, index) => ({ id: index, ...trip }));
};

export const calculateStatistics = (data, distanceUnit = 'km') => {
    if (!data || data.length === 0) return null;

    const totalDistance = data.reduce((sum, trip) => sum + trip.distanceKm, 0);
    const totalConsumption = data.reduce((sum, trip) => sum + trip.consumptionKwh, 0);
    const avgEfficiency = calculateEfficiency(totalConsumption, totalDistance).toFixed(2);

    // Best/worst only mean something on trips long enough to average out the
    // cold-start spike; a 1-km hop can read 2 or 110 kWh/100km.
    const meaningfulDistance = distanceUnit === 'mi' ? 3 : 5;
    const meaningful = data.filter((trip) => trip.efficiency > 0 && trip.distanceKm >= meaningfulDistance);
    const efficiencies = (meaningful.length >= 3 ? meaningful : data.filter((trip) => trip.efficiency > 0))
        .map((trip) => parseFloat(trip.efficiency));

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

    const withDuration = data.filter((t) => t.durationMin > 0);
    const totalDurationMin = withDuration.reduce((s, t) => s + t.durationMin, 0);
    const activeDays = new Set(data.map((t) => t.dayKey).filter(Boolean)).size;
    const longestTrip = data.reduce((best, t) => (t.distanceKm > (best?.distanceKm ?? -1) ? t : best), null);

    return {
        totalTrips: data.length,
        totalDistance: totalDistance.toFixed(2),
        totalConsumption: totalConsumption.toFixed(2),
        avgEfficiency,
        bestEfficiency: efficiencies.length > 0 ? Math.min(...efficiencies).toFixed(2) : 0,
        worstEfficiency: efficiencies.length > 0 ? Math.max(...efficiencies).toFixed(2) : 0,
        avgTripDistance: (totalDistance / data.length).toFixed(2),
        odometerStart: minStart,
        odometerEnd: maxEnd,
        distanceUnit,
        // Extended
        totalDurationMin,
        avgSpeed: totalDurationMin > 0
            ? Math.round((withDuration.reduce((s, t) => s + t.distanceKm, 0) / (totalDurationMin / 60)) * 10) / 10
            : null,
        activeDays,
        longestTrip,
        firstTs: data[0]?.startTs ?? null,
        lastTs: data[data.length - 1]?.startTs ?? null,
    };
};
