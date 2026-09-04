import { useEffect, useMemo, useState } from 'react';
import { Badge, Box, Button, Group, MultiSelect, Popover, RangeSlider, SegmentedControl, Select, Stack, Text } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconAdjustmentsHorizontal, IconX, IconCalendar, IconTag } from '@tabler/icons-react';
import { getAllTags, generateTripId, getTripAnnotation } from '../../utils/tripAnnotations';
import { FilterService, FilterMetadataService } from '../../services/filters/FilterService';
import { addDays, startOfDay } from '../../utils/journeyDate';
import Eyebrow from '../ui/Eyebrow';

const EMPTY = {
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
    sourceFile: null,
};

const PRESETS = [
    { value: 'all', label: 'All' },
    { value: '30d', label: '30d' },
    { value: '90d', label: '90d' },
    { value: '12m', label: '12m' },
    { value: 'ytd', label: 'YTD' },
    { value: 'custom', label: 'Custom' },
];

/**
 * One filter row that scopes every chart, stat and table underneath it.
 * Date presets count back from the newest trip in the file, so an old export
 * still has a meaningful "last 30 days".
 */
function FilterBar({ data, distanceUnit = 'km', sources = [], onFilterChange }) {
    const filterService = useMemo(() => new FilterService(), []);
    const metadataService = useMemo(() => new FilterMetadataService(), []);
    const metadata = useMemo(() => metadataService.getAllMetadata(data), [data, metadataService]);
    const { categories, ranges, dateRange } = metadata;

    const [preset, setPreset] = useState('all');
    const [filters, setFilters] = useState(EMPTY);
    const [moreOpened, setMoreOpened] = useState(false);
    const tags = useMemo(() => getAllTags(), []);
    const unit = distanceUnit === 'mi' ? 'mi' : 'km';

    const presetRange = (key) => {
        const last = dateRange.max ? startOfDay(dateRange.max) : null;
        if (!last) return { dateFrom: null, dateTo: null };
        switch (key) {
            case '30d': return { dateFrom: addDays(last, -29), dateTo: last };
            case '90d': return { dateFrom: addDays(last, -89), dateTo: last };
            case '12m': { const d = new Date(last); d.setFullYear(d.getFullYear() - 1); return { dateFrom: addDays(d, 1), dateTo: last }; }
            case 'ytd': return { dateFrom: new Date(last.getFullYear(), 0, 1), dateTo: last };
            default: return { dateFrom: null, dateTo: null };
        }
    };

    const applyPreset = (key) => {
        setPreset(key);
        if (key === 'custom') return;
        setFilters((f) => ({ ...f, ...presetRange(key) }));
    };

    // Apply whenever filters change
    useEffect(() => {
        let filtered = filterService.applyFilters(data, filters);
        if (filters.sourceFile) filtered = filtered.filter((trip) => trip.sourceFile === filters.sourceFile);
        if (filters.tags.length > 0) {
            filtered = filtered.filter((trip) => {
                const annotation = getTripAnnotation(generateTripId(trip));
                return filters.tags.some((tag) => (annotation.tags || []).includes(tag));
            });
        }
        const fromTs = filters.dateFrom ? startOfDay(filters.dateFrom).getTime() : (data[0]?.startTs ?? null);
        const toTs = filters.dateTo ? addDays(startOfDay(filters.dateTo), 1).getTime() : ((data[data.length - 1]?.startTs ?? 0) + 1);
        onFilterChange({ filtered, range: { fromTs, toTs }, isFiltered: filtered.length !== data.length });
        // onFilterChange is stable by contract of the parent
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, filters, filterService]);

    const activeCount = [
        filters.dateFrom || filters.dateTo,
        filters.distanceMin !== null || filters.distanceMax !== null,
        filters.efficiencyMin !== null || filters.efficiencyMax !== null,
        filters.socDropMin !== null || filters.socDropMax !== null,
        filters.category,
        filters.tags.length > 0,
        filters.sourceFile,
    ].filter(Boolean).length;

    const reset = () => {
        setPreset('all');
        setFilters(EMPTY);
    };

    const sliderValue = (minKey, maxKey, lo, hi) => [filters[minKey] ?? lo, filters[maxKey] ?? hi];
    const setSlider = (minKey, maxKey, lo, hi) => ([a, b]) =>
        setFilters((f) => ({ ...f, [minKey]: a <= lo ? null : a, [maxKey]: b >= hi ? null : b }));

    const effMax = Math.max(ranges.maxEfficiency || 0, 10);

    return (
        <Box className="ps-card ps-no-print" p="sm" style={{ position: 'sticky', top: 'var(--ps-header-offset, 64px)', zIndex: 150 }}>
            <Group gap="sm" wrap="wrap" align="center">
                <Group gap={6} wrap="nowrap">
                    <IconCalendar size={16} style={{ color: 'var(--ps-muted)' }} />
                    <SegmentedControl size="xs" radius="xs" value={preset} onChange={applyPreset} data={PRESETS} />
                </Group>

                {preset === 'custom' && (
                    <DatePickerInput
                        type="range"
                        size="xs"
                        radius="xs"
                        placeholder="Pick a range"
                        value={[filters.dateFrom, filters.dateTo]}
                        onChange={([from, to]) => setFilters((f) => ({ ...f, dateFrom: from, dateTo: to }))}
                        minDate={dateRange.min || undefined}
                        maxDate={dateRange.max || undefined}
                        clearable
                        w={240}
                        valueFormat="MMM D, YYYY"
                    />
                )}

                {categories.length > 1 && (
                    <Select
                        size="xs"
                        placeholder="Category"
                        data={categories}
                        value={filters.category}
                        onChange={(v) => setFilters((f) => ({ ...f, category: v }))}
                        clearable
                        w={150}
                    />
                )}

                {sources.length > 1 && (
                    <Select
                        size="xs"
                        placeholder="All files"
                        data={sources.map((s) => ({ value: s.fileName, label: `${s.fileName} (${s.added})` }))}
                        value={filters.sourceFile}
                        onChange={(v) => setFilters((f) => ({ ...f, sourceFile: v }))}
                        clearable
                        w={220}
                        aria-label="Filter by source file"
                    />
                )}

                {tags.length > 0 && (
                    <MultiSelect
                        size="xs"
                        placeholder="Tags"
                        leftSection={<IconTag size={14} />}
                        data={tags}
                        value={filters.tags}
                        onChange={(v) => setFilters((f) => ({ ...f, tags: v }))}
                        clearable
                        searchable
                        w={200}
                    />
                )}

                <Popover opened={moreOpened} onChange={setMoreOpened} width={320} position="bottom-start" trapFocus>
                    <Popover.Target>
                        <Button size="xs" variant="default" leftSection={<IconAdjustmentsHorizontal size={14} />} onClick={() => setMoreOpened((o) => !o)}>
                            More
                        </Button>
                    </Popover.Target>
                    <Popover.Dropdown>
                        <Stack gap="lg">
                            <div>
                                <Group justify="space-between" mb={6}>
                                    <Eyebrow>Distance ({unit})</Eyebrow>
                                    <Text size="xs" c="dimmed" className="ps-tabular">
                                        {sliderValue('distanceMin', 'distanceMax', ranges.minDistance, ranges.maxDistance).join(' – ')}
                                    </Text>
                                </Group>
                                <RangeSlider
                                    size="xs"
                                    color="polestar"
                                    min={ranges.minDistance}
                                    max={Math.max(ranges.maxDistance, ranges.minDistance + 1)}
                                    step={1}
                                    minRange={1}
                                    value={sliderValue('distanceMin', 'distanceMax', ranges.minDistance, ranges.maxDistance)}
                                    onChange={setSlider('distanceMin', 'distanceMax', ranges.minDistance, ranges.maxDistance)}
                                    label={null}
                                />
                            </div>
                            <div>
                                <Group justify="space-between" mb={6}>
                                    <Eyebrow>Efficiency (kWh/100{unit})</Eyebrow>
                                    <Text size="xs" c="dimmed" className="ps-tabular">
                                        {sliderValue('efficiencyMin', 'efficiencyMax', 0, effMax).join(' – ')}
                                    </Text>
                                </Group>
                                <RangeSlider
                                    size="xs"
                                    color="polestar"
                                    min={0}
                                    max={effMax}
                                    step={0.5}
                                    minRange={0.5}
                                    value={sliderValue('efficiencyMin', 'efficiencyMax', 0, effMax)}
                                    onChange={setSlider('efficiencyMin', 'efficiencyMax', 0, effMax)}
                                    label={null}
                                />
                            </div>
                            <div>
                                <Group justify="space-between" mb={6}>
                                    <Eyebrow>Battery used (%)</Eyebrow>
                                    <Text size="xs" c="dimmed" className="ps-tabular">
                                        {sliderValue('socDropMin', 'socDropMax', 0, 100).join(' – ')}
                                    </Text>
                                </Group>
                                <RangeSlider
                                    size="xs"
                                    color="polestar"
                                    min={0}
                                    max={100}
                                    step={1}
                                    minRange={1}
                                    value={sliderValue('socDropMin', 'socDropMax', 0, 100)}
                                    onChange={setSlider('socDropMin', 'socDropMax', 0, 100)}
                                    label={null}
                                />
                            </div>
                        </Stack>
                    </Popover.Dropdown>
                </Popover>

                {activeCount > 0 && (
                    <Group gap={6} wrap="nowrap" ml="auto">
                        <Badge variant="light" color="polestar" size="sm">{activeCount} active</Badge>
                        <Button size="compact-xs" variant="subtle" color="gray" leftSection={<IconX size={12} />} onClick={reset}>
                            Clear
                        </Button>
                    </Group>
                )}
            </Group>
        </Box>
    );
}

export default FilterBar;
