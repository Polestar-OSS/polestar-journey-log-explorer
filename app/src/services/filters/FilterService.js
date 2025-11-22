/**
 * FilterService - Service for applying filters to trip data
 * Follows Single Responsibility Principle: Only handles data filtering logic
 */
export class FilterService {
    /**
     * Apply all filters to data
     * @param {Array} data - Trip data
     * @param {Object} filters - Filter criteria
     * @returns {Array} Filtered data
     */
    applyFilters(data, filters) {
        let filtered = data;

        if (filters.dateFrom) {
            filtered = this.filterByDateFrom(filtered, filters.dateFrom);
        }

        if (filters.dateTo) {
            filtered = this.filterByDateTo(filtered, filters.dateTo);
        }

        if (filters.distanceMin !== null && filters.distanceMin !== undefined) {
            filtered = this.filterByMinDistance(filtered, filters.distanceMin);
        }

        if (filters.distanceMax !== null && filters.distanceMax !== undefined) {
            filtered = this.filterByMaxDistance(filtered, filters.distanceMax);
        }

        if (filters.efficiencyMin !== null && filters.efficiencyMin !== undefined) {
            filtered = this.filterByMinEfficiency(filtered, filters.efficiencyMin);
        }

        if (filters.efficiencyMax !== null && filters.efficiencyMax !== undefined) {
            filtered = this.filterByMaxEfficiency(filtered, filters.efficiencyMax);
        }

        if (filters.socDropMin !== null && filters.socDropMin !== undefined) {
            filtered = this.filterByMinSOCDrop(filtered, filters.socDropMin);
        }

        if (filters.socDropMax !== null && filters.socDropMax !== undefined) {
            filtered = this.filterByMaxSOCDrop(filtered, filters.socDropMax);
        }

        if (filters.category) {
            filtered = this.filterByCategory(filtered, filters.category);
        }

        if (filters.tags && filters.tags.length > 0) {
            filtered = this.filterByTags(filtered, filters.tags);
        }

        return filtered;
    }

    /**
     * Filter by start date (from)
     * @param {Array} data - Trip data
     * @param {Date} dateFrom - Start date
     * @returns {Array} Filtered data
     */
    filterByDateFrom(data, dateFrom) {
        const filterDate = new Date(dateFrom);
        filterDate.setHours(0, 0, 0, 0);

        return data.filter(trip => {
            const tripDateStr = trip.startDate.split(',')[0].trim();
            const tripDate = new Date(tripDateStr);
            tripDate.setHours(0, 0, 0, 0);
            return tripDate >= filterDate;
        });
    }

    /**
     * Filter by end date (to)
     * @param {Array} data - Trip data
     * @param {Date} dateTo - End date
     * @returns {Array} Filtered data
     */
    filterByDateTo(data, dateTo) {
        const filterDate = new Date(dateTo);
        filterDate.setHours(23, 59, 59, 999);

        return data.filter(trip => {
            const tripDateStr = trip.startDate.split(',')[0].trim();
            const tripDate = new Date(tripDateStr);
            tripDate.setHours(0, 0, 0, 0);
            return tripDate <= filterDate;
        });
    }

    /**
     * Filter by minimum distance
     * @param {Array} data - Trip data
     * @param {number} minDistance - Minimum distance
     * @returns {Array} Filtered data
     */
    filterByMinDistance(data, minDistance) {
        return data.filter(trip => trip.distanceKm >= minDistance);
    }

    /**
     * Filter by maximum distance
     * @param {Array} data - Trip data
     * @param {number} maxDistance - Maximum distance
     * @returns {Array} Filtered data
     */
    filterByMaxDistance(data, maxDistance) {
        return data.filter(trip => trip.distanceKm <= maxDistance);
    }

    /**
     * Filter by minimum efficiency
     * @param {Array} data - Trip data
     * @param {number} minEfficiency - Minimum efficiency
     * @returns {Array} Filtered data
     */
    filterByMinEfficiency(data, minEfficiency) {
        return data.filter(trip => parseFloat(trip.efficiency) >= minEfficiency);
    }

    /**
     * Filter by maximum efficiency
     * @param {Array} data - Trip data
     * @param {number} maxEfficiency - Maximum efficiency
     * @returns {Array} Filtered data
     */
    filterByMaxEfficiency(data, maxEfficiency) {
        return data.filter(trip => parseFloat(trip.efficiency) <= maxEfficiency);
    }

    /**
     * Filter by minimum SOC drop
     * @param {Array} data - Trip data
     * @param {number} minSOCDrop - Minimum SOC drop
     * @returns {Array} Filtered data
     */
    filterByMinSOCDrop(data, minSOCDrop) {
        return data.filter(trip => trip.socDrop >= minSOCDrop);
    }

    /**
     * Filter by maximum SOC drop
     * @param {Array} data - Trip data
     * @param {number} maxSOCDrop - Maximum SOC drop
     * @returns {Array} Filtered data
     */
    filterByMaxSOCDrop(data, maxSOCDrop) {
        return data.filter(trip => trip.socDrop <= maxSOCDrop);
    }

    /**
     * Filter by category
     * @param {Array} data - Trip data
     * @param {string} category - Category to filter by
     * @returns {Array} Filtered data
     */
    filterByCategory(data, category) {
        return data.filter(trip => trip.category === category);
    }

    /**
     * Filter by tags (requires trip annotation utility)
     * @param {Array} data - Trip data
     * @param {Array} tags - Tags to filter by
     * @returns {Array} Filtered data
     */
    /* eslint-disable no-unused-vars */
    filterByTags(data, tags) {
        // This would require integration with the trip annotations utility
        // For now, return data as-is
        return data.filter(trip => {
            // Implementation would check if trip has any of the specified tags
            // This requires the generateTripId and getTripAnnotation utilities
            return true;
        });
    }
}

/**
 * FilterStateManager - Service for managing filter state
 * Follows Single Responsibility Principle: Only handles filter state management
 */
export class FilterStateManager {
    constructor(initialFilters = {}) {
        this.filters = {
            dateFrom: null,
            dateTo: null,
            distanceMin: null,
            distanceMax: null,
            efficiencyMin: null,
            efficiencyMax: null,
            socDropMin: null,
            socDropMax: null,
            category: null,
            tags: [],
            ...initialFilters,
        };
    }

    /**
     * Get current filter state
     * @returns {Object} Current filters
     */
    getFilters() {
        return { ...this.filters };
    }

    /**
     * Update a single filter
     * @param {string} key - Filter key
     * @param {*} value - Filter value
     */
    updateFilter(key, value) {
        this.filters[key] = value;
    }

    /**
     * Update multiple filters
     * @param {Object} updates - Filter updates
     */
    updateFilters(updates) {
        this.filters = { ...this.filters, ...updates };
    }

    /**
     * Clear all filters
     */
    clearFilters() {
        this.filters = {
            dateFrom: null,
            dateTo: null,
            distanceMin: null,
            distanceMax: null,
            efficiencyMin: null,
            efficiencyMax: null,
            socDropMin: null,
            socDropMax: null,
            category: null,
            tags: [],
        };
    }

    /**
     * Check if any filters are active
     * @returns {boolean} True if any filter is set
     */
    hasActiveFilters() {
        return Object.values(this.filters).some(value => {
            if (Array.isArray(value)) return value.length > 0;
            return value !== null && value !== undefined;
        });
    }

    /**
     * Count active filters
     * @returns {number} Number of active filters
     */
    countActiveFilters() {
        return Object.values(this.filters).filter(value => {
            if (Array.isArray(value)) return value.length > 0;
            return value !== null && value !== undefined;
        }).length;
    }
}

/**
 * FilterMetadataService - Service for calculating filter metadata
 * Follows Single Responsibility Principle: Only handles filter metadata
 */
export class FilterMetadataService {
    /**
     * Calculate available date range from data
     * @param {Array} data - Trip data
     * @returns {Object} Date range {min, max}
     */
    getDateRange(data) {
        if (!data || data.length === 0) {
            return { min: null, max: null };
        }

        const dates = data
            .map(trip => new Date(trip.startDate))
            .sort((a, b) => a - b);

        return {
            min: dates[0],
            max: dates[dates.length - 1],
        };
    }

    /**
     * Get unique categories from data
     * @param {Array} data - Trip data
     * @returns {Array} Unique categories
     */
    getCategories(data) {
        if (!data || data.length === 0) return [];

        const categories = [...new Set(data.map(trip => trip.category))].filter(Boolean);
        return categories.sort();
    }

    /**
     * Calculate numeric range statistics
     * @param {Array} data - Trip data
     * @returns {Object} Range statistics
     */
    getRangeStatistics(data) {
        if (!data || data.length === 0) {
            return {
                minDistance: 0,
                maxDistance: 0,
                minEfficiency: 0,
                maxEfficiency: 0,
                minSocDrop: 0,
                maxSocDrop: 0,
            };
        }

        const distances = data.map(trip => trip.distanceKm);
        const efficiencies = data
            .map(trip => parseFloat(trip.efficiency))
            .filter(e => e > 0);
        const socDrops = data.map(trip => trip.socDrop);

        return {
            minDistance: Math.floor(Math.min(...distances)),
            maxDistance: Math.ceil(Math.max(...distances)),
            minEfficiency: Math.floor(Math.min(...efficiencies)),
            maxEfficiency: Math.ceil(Math.max(...efficiencies)),
            minSocDrop: Math.floor(Math.min(...socDrops)),
            maxSocDrop: Math.ceil(Math.max(...socDrops)),
        };
    }

    /**
     * Get all filter metadata
     * @param {Array} data - Trip data
     * @returns {Object} Complete filter metadata
     */
    getAllMetadata(data) {
        return {
            dateRange: this.getDateRange(data),
            categories: this.getCategories(data),
            ranges: this.getRangeStatistics(data),
        };
    }
}
