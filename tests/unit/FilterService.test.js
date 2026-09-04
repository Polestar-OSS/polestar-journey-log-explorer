import { describe, it, expect } from 'vitest';
import { FilterService, FilterStateManager, FilterMetadataService } from '../../app/src/services/filters/FilterService.js';
import { TableDataProcessor, TableRowFormatter, TableExporter } from '../../app/src/services/table/TableDataProcessor.js';
import { processRawRows } from '../../app/src/utils/dataParser.js';
import { HEADERS_KM, SMALL_EXPORT } from '../fixtures/rows.js';

const { data } = processRawRows(SMALL_EXPORT, HEADERS_KM);
const service = new FilterService();

describe('FilterService date filters', () => {
    it('accepts Date objects and Journey Log strings, inclusive of the whole day', () => {
        expect(service.filterByDateFrom(data, new Date(2026, 6, 1))).toHaveLength(4);
        expect(service.filterByDateFrom(data, '2026-07-02')).toHaveLength(2);
        expect(service.filterByDateTo(data, new Date(2026, 0, 12))).toHaveLength(2);
        expect(service.filterByDateTo(data, '2026-01-13, 08:00')).toHaveLength(4); // whole of Jan 13 included
    });

    it('ignores unparsable bounds instead of filtering everything out', () => {
        expect(service.filterByDateFrom(data, 'nonsense')).toHaveLength(8);
    });

    it('applies numeric and category filters together', () => {
        const filtered = service.applyFilters(data, {
            dateFrom: new Date(2026, 0, 1),
            dateTo: new Date(2026, 0, 31),
            distanceMin: 6.45,
            efficiencyMin: 25,
            socDropMin: 2,
        });
        expect(filtered).toHaveLength(1);
        expect(filtered[0].startDate).toBe('2026-01-13, 08:03');
    });
});

describe('FilterStateManager', () => {
    it('tracks, counts and clears active filters', () => {
        const m = new FilterStateManager();
        expect(m.hasActiveFilters()).toBe(false);
        m.updateFilter('distanceMin', 5);
        m.updateFilter('tags', ['commute']);
        expect(m.countActiveFilters()).toBe(2);
        m.clearFilters();
        expect(m.hasActiveFilters()).toBe(false);
    });
});

describe('FilterMetadataService', () => {
    const meta = new FilterMetadataService().getAllMetadata(data);

    it('derives the date range from timestamps', () => {
        expect(meta.dateRange.min.getMonth()).toBe(0);
        expect(meta.dateRange.max.getMonth()).toBe(6);
    });

    it('derives categories and numeric ranges', () => {
        expect(meta.categories).toEqual(['Uncategorized']);
        expect(meta.ranges.minDistance).toBe(6);
        expect(meta.ranges.maxDistance).toBe(7);
        expect(meta.ranges.maxSocDrop).toBe(2);
    });
});

describe('TableDataProcessor', () => {
    const processor = new TableDataProcessor();

    it('searches across the requested fields case-insensitively', () => {
        expect(processor.filterData(data, 'LINDHOLMS', ['startAddress', 'endAddress'])).toHaveLength(8);
        expect(processor.filterData(data, '2026-07-02', ['startDate'])).toHaveLength(2);
        expect(processor.filterData(data, '', ['startDate'])).toHaveLength(8);
    });

    it('sorts numerically, by date and by string', () => {
        expect(processor.sortData(data, 'distanceKm', 'desc')[0].distanceKm).toBe(6.5);
        expect(processor.sortData(data, 'startDate', 'asc')[0].startDate).toBe('2026-01-12, 08:05');
        expect(processor.sortData(data, 'startTs', 'desc')[0].startDate).toBe('2026-07-02, 17:10');
    });

    it('paginates with metadata', () => {
        const page = processor.paginateData(data, 2, 3);
        expect(page.data).toHaveLength(3);
        expect(page.pagination).toMatchObject({ totalPages: 3, hasNextPage: true, hasPreviousPage: true });
    });
});

describe('TableRowFormatter and TableExporter', () => {
    const formatter = new TableRowFormatter();

    it('colour-codes efficiency with unit-aware thresholds', () => {
        expect(formatter.formatEfficiency(14, 'km').color).toBe('green');
        expect(formatter.formatEfficiency(24, 'km').color).toBe('orange');
        expect(formatter.formatEfficiency(23, 'mi').color).toBe('green'); // 15 km-threshold ≈ 24 kWh/100mi
    });

    it('exports CSV with quoting for commas and quotes', () => {
        const exporter = new TableExporter();
        const csv = exporter.exportToCSV(
            [{ a: 'plain', b: 'has, comma', c: 'has "quote"' }],
            [{ key: 'a', label: 'A' }, { key: 'b', label: 'B' }, { key: 'c', label: 'C' }]
        );
        expect(csv.split('\n')).toEqual(['A,B,C', 'plain,"has, comma","has ""quote"""']);
    });
});
