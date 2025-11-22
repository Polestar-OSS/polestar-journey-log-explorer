/**
 * TableDataProcessor - Service for processing table data
 * Follows Single Responsibility Principle: Only handles table data operations
 */
export class TableDataProcessor {
    /**
     * Filter table data based on search criteria
     * @param {Array} data - Table data
     * @param {string} searchTerm - Search term
     * @param {Array} searchFields - Fields to search in
     * @returns {Array} Filtered data
     */
    filterData(data, searchTerm, searchFields = ['startAddress', 'endAddress', 'startDate']) {
        if (!searchTerm || searchTerm.trim() === '') {
            return data;
        }

        const lowerSearch = searchTerm.toLowerCase();
        return data.filter(item =>
            searchFields.some(field =>
                item[field]?.toString().toLowerCase().includes(lowerSearch)
            )
        );
    }

    /**
     * Sort table data
     * @param {Array} data - Table data
     * @param {string} sortBy - Field to sort by
     * @param {string} sortOrder - Sort order ('asc' or 'desc')
     * @returns {Array} Sorted data
     */
    sortData(data, sortBy, sortOrder = 'asc') {
        const sorted = [...data].sort((a, b) => {
            let aVal = a[sortBy];
            let bVal = b[sortBy];

            // Handle date sorting
            if (sortBy === 'startDate' || sortBy === 'endDate') {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            }
            // Handle numeric sorting
            else if (typeof aVal === 'number' || !isNaN(parseFloat(aVal))) {
                aVal = parseFloat(aVal);
                bVal = parseFloat(bVal);
            }
            // Handle string sorting
            else if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }

            if (sortOrder === 'asc') {
                return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
            } else {
                return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
            }
        });

        return sorted;
    }

    /**
     * Paginate table data
     * @param {Array} data - Table data
     * @param {number} page - Current page (1-indexed)
     * @param {number} pageSize - Items per page
     * @returns {Object} Paginated data with metadata
     */
    paginateData(data, page = 1, pageSize = 50) {
        const totalItems = data.length;
        const totalPages = Math.ceil(totalItems / pageSize);
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedData = data.slice(startIndex, endIndex);

        return {
            data: paginatedData,
            pagination: {
                currentPage: page,
                pageSize,
                totalItems,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1,
            },
        };
    }

    /**
     * Apply multiple filters and sorting
     * @param {Array} data - Table data
     * @param {Object} options - Filter and sort options
     * @returns {Array} Processed data
     */
    processData(data, options = {}) {
        let processed = data;

        // Apply search filter
        if (options.search) {
            processed = this.filterData(processed, options.search, options.searchFields);
        }

        // Apply sorting
        if (options.sortBy) {
            processed = this.sortData(processed, options.sortBy, options.sortOrder);
        }

        return processed;
    }
}

/**
 * TableRowFormatter - Service for formatting table row data
 * Follows Single Responsibility Principle: Only handles row formatting
 */
export class TableRowFormatter {
    /**
     * Format efficiency value with color coding
     * @param {number} efficiency - Efficiency value
     * @returns {Object} Formatted efficiency with color
     */
    formatEfficiency(efficiency) {
        const eff = parseFloat(efficiency);
        let color;

        if (eff < 15) color = 'green';
        else if (eff < 20) color = 'yellow';
        else if (eff < 25) color = 'orange';
        else color = 'red';

        return {
            value: eff.toFixed(1),
            color,
            label: `${eff.toFixed(1)} kWh/100km`,
        };
    }

    /**
     * Format SOC (State of Charge) range
     * @param {number} socStart - Starting SOC
     * @param {number} socEnd - Ending SOC
     * @returns {Object} Formatted SOC range
     */
    formatSOCRange(socStart, socEnd) {
        const drop = socStart - socEnd;
        let color = 'blue';

        if (drop > 50) color = 'red';
        else if (drop > 30) color = 'orange';
        else if (drop > 15) color = 'yellow';

        return {
            label: `${socStart}% → ${socEnd}%`,
            drop,
            color,
        };
    }

    /**
     * Format distance with unit
     * @param {number} distance - Distance in km
     * @returns {string} Formatted distance
     */
    formatDistance(distance) {
        return `${distance.toFixed(1)} km`;
    }

    /**
     * Format consumption with unit
     * @param {number} consumption - Consumption in kWh
     * @returns {string} Formatted consumption
     */
    formatConsumption(consumption) {
        return `${consumption.toFixed(2)} kWh`;
    }

    /**
     * Format date for display
     * @param {string} dateStr - Date string
     * @returns {string} Formatted date
     */
    formatDate(dateStr) {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;

        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    /**
     * Truncate address for display
     * @param {string} address - Full address
     * @param {number} maxLength - Maximum length
     * @returns {string} Truncated address
     */
    truncateAddress(address, maxLength = 40) {
        if (address.length <= maxLength) return address;
        return `${address.substring(0, maxLength)}...`;
    }
}

/**
 * TableExporter - Service for exporting table data
 * Follows Single Responsibility Principle: Only handles data export
 */
export class TableExporter {
    /**
     * Export data to CSV format
     * @param {Array} data - Data to export
     * @param {Array} columns - Column definitions
     * @returns {string} CSV string
     */
    exportToCSV(data, columns) {
        // Create header row
        const headers = columns.map(col => col.label || col.key).join(',');

        // Create data rows
        const rows = data.map(row => {
            return columns.map(col => {
                const value = row[col.key];
                // Handle values that contain commas or quotes
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            }).join(',');
        });

        return [headers, ...rows].join('\n');
    }

    /**
     * Export data to JSON format
     * @param {Array} data - Data to export
     * @returns {string} JSON string
     */
    exportToJSON(data) {
        return JSON.stringify(data, null, 2);
    }

    /**
     * Trigger download of exported data
     * @param {string} content - File content
     * @param {string} filename - Filename
     * @param {string} mimeType - MIME type
     */
    downloadFile(content, filename, mimeType = 'text/csv') {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}
