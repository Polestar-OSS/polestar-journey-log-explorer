import { useState, useMemo } from 'react';
import { Paper, Group, Select, NumberInput, Button, Stack, Collapse, Text, Badge, MultiSelect } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconFilter, IconX, IconChevronDown, IconChevronUp, IconCalendar, IconTag } from '@tabler/icons-react';
import { getAllTags, generateTripId, getTripAnnotation } from '../../utils/tripAnnotations';
import { FilterService, FilterStateManager, FilterMetadataService } from '../../services/filters/FilterService';

function Filters({ data, onFilterChange }) {
  const [opened, setOpened] = useState(false);

  // Initialize services (Dependency Injection)
  const filterService = useMemo(() => new FilterService(), []);
  const filterStateManager = useMemo(() => new FilterStateManager(), []);
  const metadataService = useMemo(() => new FilterMetadataService(), []);

  const [filters, setFiltersState] = useState(filterStateManager.getFilters());

  // Calculate metadata using service
  const metadata = useMemo(() => 
    metadataService.getAllMetadata(data),
    [data, metadataService]
  );

  const { categories, ranges: stats } = metadata;

  const categoryOptions = useMemo(() => 
    categories.map(cat => ({ value: cat, label: cat })),
    [categories]
  );

  const handleFilterChange = (field, value) => {
    filterStateManager.updateFilter(field, value);
    const newFilters = filterStateManager.getFilters();
    setFiltersState(newFilters);
    applyFilters(newFilters);
  };

  const applyFilters = (currentFilters) => {
    // Use service to apply filters
    let filtered = filterService.applyFilters(data, currentFilters);

    // Apply tags filter (special case requiring annotation utility)
    if (currentFilters.tags && currentFilters.tags.length > 0) {
      filtered = filtered.filter(trip => {
        const tripId = generateTripId(trip);
        const annotation = getTripAnnotation(tripId);
        const tripTags = annotation.tags || [];
        return currentFilters.tags.some(tag => tripTags.includes(tag));
      });
    }

    onFilterChange(filtered);
  };

  const handleReset = () => {
    filterStateManager.clearFilters();
    const resetFilters = filterStateManager.getFilters();
    setFiltersState(resetFilters);
    onFilterChange(data);
  };

  const activeFilterCount = filterStateManager.countActiveFilters();
  const hasActiveFilters = filterStateManager.hasActiveFilters();

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
            <Stack gap="xs">
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
            </Stack>

            <Text size="sm" fw={500} c="dimmed" mt="xs">Distance (km)</Text>
            <Stack gap="xs">
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
            </Stack>

            <Text size="sm" fw={500} c="dimmed" mt="xs">Efficiency (kWh/100km)</Text>
            <Stack gap="xs">
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
            </Stack>

            <Text size="sm" fw={500} c="dimmed" mt="xs">Battery SOC Drop (%)</Text>
            <Stack gap="xs">
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
            </Stack>

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
