import Papa from 'papaparse';

/**
 * JourneyLogWriter - writes trips back in the Journey Log export format,
 * the same columns and order the car app emails, so a file the explorer
 * produces can be re-imported here or opened anywhere the original can.
 * The distance column carries the unit, exactly as the export does.
 */
export const exportHeaders = (distanceUnit = 'km') => [
    'Start Date', 'End Date', 'Start Address', 'End Address',
    distanceUnit === 'mi' ? 'Distance in Mile' : 'Distance in KM',
    'Consumption in Kwh', 'Category', 'Start Latitude', 'Start Longitude', 'End Latitude', 'End Longitude',
    'Start Odometer', 'End Odometer', 'Trip Type', 'SOC Source', 'SOC Destination', 'Comments',
];

export class JourneyLogWriter {
    /** One export-format row object per trip, newest first like the original export. */
    toRows(trips, distanceUnit = 'km') {
        const h = exportHeaders(distanceUnit);
        return [...trips]
            .sort((a, b) => (b.startTs ?? 0) - (a.startTs ?? 0))
            .map((t) => ({
                [h[0]]: t.startDate,
                [h[1]]: t.endDate,
                [h[2]]: t.startAddress ?? '',
                [h[3]]: t.endAddress ?? '',
                [h[4]]: t.distanceKm,
                [h[5]]: t.consumptionKwh,
                [h[6]]: t.category ?? 'Uncategorized',
                [h[7]]: t.startLat ?? 0,
                [h[8]]: t.startLng ?? 0,
                [h[9]]: t.endLat ?? 0,
                [h[10]]: t.endLng ?? 0,
                [h[11]]: t.startOdometer ?? 0,
                [h[12]]: t.endOdometer ?? 0,
                [h[13]]: t.tripType ?? 'SINGLE',
                [h[14]]: t.socSource ?? 0,
                [h[15]]: t.socDestination ?? 0,
                [h[16]]: t.comments ?? '',
            }));
    }

    toCSV(trips, distanceUnit = 'km') {
        return Papa.unparse({ fields: exportHeaders(distanceUnit), data: this.toRows(trips, distanceUnit).map((r) => exportHeaders(distanceUnit).map((k) => r[k])) });
    }
}
