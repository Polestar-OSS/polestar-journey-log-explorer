import { useState, useMemo } from 'react';
import { Paper, Group, Select, NumberInput, Button, Stack, Collapse, Text, Badge, MultiSelect } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconFilter, IconX, IconChevronDown, IconChevronUp, IconCalendar, IconTag } from '@tabler/icons-react';
import { getAllTags, generateTripId, getTripAnnotation } from '../utils/tripAnnotations';

function Filters({ data, distanceUnit = 'km', onFilterChange }) {
  const [opened, setOpened] = useState(false);
  const [filters, setFilters] = useState({
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
  });

  // Calculate available date range and values
  // eslint-disable-next-line no-unused-vars
  const { dateRange, categories, stats } = useMemo(() => {
    if (!data || data.length === 0) return { dateRange: { min: null, max: null }, categories: [], stats: {} };

    const dates = data.map(trip => new Date(trip.startDate)).sort((a, b) => a - b);
    const uniqueCategories = [...new Set(data.map(trip => trip.category))].filter(Boolean);
    
    const distances = data.map(trip => trip.distanceKm);
    const efficiencies = data.map(trip => parseFloat(trip.efficiency)).filter(e => e > 0);
    const socDrops = data.map(trip => trip.socDrop);

    return {
      dateRange: dates.length > 0 ? { min: dates[0], max: dates[dates.length - 1] } : { min: null, max: null },
      categories: uniqueCategories.sort(),
      stats: {
        minDistance: Math.floor(Math.min(...distances)),
        maxDistance: Math.ceil(Math.max(...distances)),
        minEfficiency: Math.floor(Math.min(...efficiencies)),
        maxEfficiency: Math.ceil(Math.max(...efficiencies)),
        minSocDrop: Math.floor(Math.min(...socDrops)),
        maxSocDrop: Math.ceil(Math.max(...socDrops)),
      }
    };
  }, [data]);

  const categoryOptions = useMemo(() => 
    categories.map(cat => ({ value: cat, label: cat }))
  , [categories]);

  const handleFilterChange = (field, value) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    applyFilters(newFilters);
  };

  const applyFilters = (currentFilters) => {
    const filtered = data.filter(trip => {
      // Date from filter
      if (currentFilters.dateFrom) {
        // Parse trip date - format is "YYYY-MM-DD, HH:MM"
        const tripDateStr = trip.startDate.split(',')[0].trim(); // Get just the date part
        const tripDate = new Date(tripDateStr);
        const filterDate = new Date(currentFilters.dateFrom);
        // Set to start of day for comparison
        filterDate.setHours(0, 0, 0, 0);
        tripDate.setHours(0, 0, 0, 0);
        if (tripDate < filterDate) return false;
      }

      // Date to filter
      if (currentFilters.dateTo) {
        // Parse trip date - format is "YYYY-MM-DD, HH:MM"
        const tripDateStr = trip.startDate.split(',')[0].trim(); // Get just the date part
        const tripDate = new Date(tripDateStr);
        const filterDate = new Date(currentFilters.dateTo);
        // Set to end of day for the "to" date
        filterDate.setHours(23, 59, 59, 999);
        tripDate.setHours(0, 0, 0, 0);
        if (tripDate > filterDate) return false;
      }

      // Distance filters
      if (currentFilters.distanceMin !== null && trip.distanceKm < currentFilters.distanceMin) return false;
      if (currentFilters.distanceMax !== null && trip.distanceKm > currentFilters.distanceMax) return false;

      // Efficiency filters
      if (currentFilters.efficiencyMin !== null && parseFloat(trip.efficiency) < currentFilters.efficiencyMin) return false;
      if (currentFilters.efficiencyMax !== null && parseFloat(trip.efficiency) > currentFilters.efficiencyMax) return false;

      // SOC drop filters
      if (currentFilters.socDropMin !== null && trip.socDrop < currentFilters.socDropMin) return false;
      if (currentFilters.socDropMax !== null && trip.socDrop > currentFilters.socDropMax) return false;

      // Category filter
      if (currentFilters.category && trip.category !== currentFilters.category) return false;

      // Tags filter
      if (currentFilters.tags && currentFilters.tags.length > 0) {
        const tripId = generateTripId(trip);
        const annotation = getTripAnnotation(tripId);
        const tripTags = annotation.tags || [];
        // Check if trip has ANY of the selected tags
        const hasMatchingTag = currentFilters.tags.some(tag => tripTags.includes(tag));
        if (!hasMatchingTag) return false;
      }

      return true;
    });

    onFilterChange(filtered);
  };

  const handleReset = () => {
    const resetFilters = {
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
    setFilters(resetFilters);
    onFilterChange(data); // Return all data
  };

  const activeFilterCount = useMemo(() => {
    return Object.entries(filters).filter(([key, value]) => {
      if (key === 'tags') return value.length > 0;
      return value !== null;
    }).length;
  }, [filters]);

  const hasActiveFilters = activeFilterCount > 0;

  return (
    <Paper p="md" withBorder>
      <Stack gap="md">
        <Group justify="space-between">
          <Group gap="xs">
            <Button
              variant={opened ? 'filled' : 'light'}
              leftSection={<IconFilter size={16} />}
              rightSection={opened ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
              onClick={() => setOpened(!opened)}
            >
              Filters
            </Button>
            {hasActiveFilters && (
              <Badge color="blue" variant="filled">
                {activeFilterCount} active
              </Badge>
            )}
          </Group>
          {hasActiveFilters && (
            <Button
              variant="subtle"
              color="red"
              leftSection={<IconX size={16} />}
              onClick={handleReset}
              size="sm"
            >
              Clear All Filters
            </Button>
          )}
        </Group>

        <Collapse in={opened}>
          <Stack gap="md">
            <Text size="sm" fw={500} c="dimmed">Date Range</Text>
            <Group grow>
              <DatePickerInput
                label="From Date"
                placeholder="Select start date"
                value={filters.dateFrom}
                onChange={(value) => handleFilterChange('dateFrom', value)}
                clearable
                leftSection={<IconCalendar size={16} />}
                maxDate={filters.dateTo || undefined}
              />
              <DatePickerInput
                label="To Date"
                placeholder="Select end date"
                value={filters.dateTo}
                onChange={(value) => handleFilterChange('dateTo', value)}
                clearable
                leftSection={<IconCalendar size={16} />}
                minDate={filters.dateFrom || undefined}
              />
            </Group>

            <Text size="sm" fw={500} c="dimmed" mt="xs">Distance ({distanceUnit === 'mi' ? 'mi' : 'km'})</Text>
            <Group grow>
              <NumberInput
                label="Min Distance"
                placeholder={`Min: ${stats.minDistance || 0}`}
                value={filters.distanceMin}
                onChange={(value) => handleFilterChange('distanceMin', value)}
                min={stats.minDistance}
                max={stats.maxDistance}
                allowNegative={false}
              />
              <NumberInput
                label="Max Distance"
                placeholder={`Max: ${stats.maxDistance || 0}`}
                value={filters.distanceMax}
                onChange={(value) => handleFilterChange('distanceMax', value)}
                min={stats.minDistance}
                max={stats.maxDistance}
                allowNegative={false}
              />
            </Group>

            <Text size="sm" fw={500} c="dimmed" mt="xs">Efficiency (kWh/100{distanceUnit === 'mi' ? 'mi' : 'km'})</Text>
            <Group grow>
              <NumberInput
                label="Min Efficiency"
                placeholder={`Min: ${stats.minEfficiency || 0}`}
                value={filters.efficiencyMin}
                onChange={(value) => handleFilterChange('efficiencyMin', value)}
                min={0}
                max={100}
                allowNegative={false}
                decimalScale={2}
              />
              <NumberInput
                label="Max Efficiency"
                placeholder={`Max: ${stats.maxEfficiency || 0}`}
                value={filters.efficiencyMax}
                onChange={(value) => handleFilterChange('efficiencyMax', value)}
                min={0}
                max={100}
                allowNegative={false}
                decimalScale={2}
              />
            </Group>

            <Text size="sm" fw={500} c="dimmed" mt="xs">Battery SOC Drop (%)</Text>
            <Group grow>
              <NumberInput
                label="Min SOC Drop"
                placeholder={`Min: ${stats.minSocDrop || 0}`}
                value={filters.socDropMin}
                onChange={(value) => handleFilterChange('socDropMin', value)}
                min={0}
                max={100}
                allowNegative={false}
              />
              <NumberInput
                label="Max SOC Drop"
                placeholder={`Max: ${stats.maxSocDrop || 0}`}
                value={filters.socDropMax}
                onChange={(value) => handleFilterChange('socDropMax', value)}
                min={0}
                max={100}
                allowNegative={false}
              />
            </Group>

            {categories.length > 0 && (
              <>
                <Text size="sm" fw={500} c="dimmed" mt="xs">Category</Text>
                <Select
                  label="Trip Category"
                  placeholder="Select category"
                  data={categoryOptions}
                  value={filters.category}
                  onChange={(value) => handleFilterChange('category', value)}
                  clearable
                />
              </>
            )}

            <Text size="sm" fw={500} c="dimmed" mt="xs">Tags</Text>
            <MultiSelect
              label="Filter by Tags"
              placeholder="Select tags to filter"
              leftSection={<IconTag size={16} />}
              data={getAllTags()}
              value={filters.tags}
              onChange={(value) => handleFilterChange('tags', value)}
              searchable
              clearable
            />
          </Stack>
        </Collapse>
      </Stack>
    </Paper>
  );
}

export default Filters;
