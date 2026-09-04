import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import { Box, Center, Loader, Stack, Tabs, Text } from '@mantine/core';
import { IconChartBar, IconMap, IconList, IconBook, IconBulb } from '@tabler/icons-react';
import StatsCards from './stats/StatsCards';
import ChartsView from './charts/ChartsView';
import InsightsView from './insights/InsightsView';
import TableView from './table/TableView';
import DataGuide from './DataGuide';
import FilterBar from './filters/FilterBar';
import { calculateStatistics } from '../utils/dataParser';
import { InsightsCalculator } from '../services/insights/InsightsCalculator';

// OpenLayers is ~600 kB; only fetch it when the map tab is opened
const MapView = lazy(() => import('./map/MapView'));

const periodLabelFor = (range) => {
    if (!range?.fromTs || !range?.toTs) return null;
    const days = Math.round((range.toTs - range.fromTs) / 86400000);
    if (days <= 1) return 'day';
    if (days <= 7) return `${days} days`;
    if (days <= 100) return `${days} days`;
    const months = Math.round(days / 30.4);
    return months <= 24 ? `${months} months` : `${Math.round(days / 365)} years`;
};

function TabLoader() {
    return (
        <Center py={80}>
            <Loader color="polestar" type="dots" />
        </Center>
    );
}

function Dashboard({ data, distanceUnit = 'km', onFilteredChange }) {
    const [activeTab, setActiveTab] = useState('overview');
    const [filterState, setFilterState] = useState({ filtered: data, range: null, isFiltered: false });
    const { filtered: filteredData, range, isFiltered } = filterState;

    const handleFilterChange = useCallback((next) => {
        setFilterState(next);
        onFilteredChange?.(next.filtered);
    }, [onFilteredChange]);

    const statistics = useMemo(() => calculateStatistics(filteredData, distanceUnit), [filteredData, distanceUnit]);

    const insights = useMemo(() => new InsightsCalculator(distanceUnit).compute(filteredData), [filteredData, distanceUnit]);

    const deltas = useMemo(() => {
        if (!range?.fromTs || !range?.toTs || !isFiltered) return null;
        const previous = InsightsCalculator.previousPeriod(data, range.fromTs, range.toTs);
        return InsightsCalculator.comparePeriods(filteredData, previous);
    }, [data, filteredData, range, isFiltered]);

    const periodLabel = isFiltered ? periodLabelFor(range) : null;

    return (
        <Stack gap="lg">
            <FilterBar data={data} distanceUnit={distanceUnit} onFilterChange={handleFilterChange} />

            {filteredData.length === 0 ? (
                <Box className="ps-card" p="xl">
                    <Text fw={500}>No trips match these filters.</Text>
                    <Text size="sm" c="dimmed">Widen the date range or clear the filters to see your data again.</Text>
                </Box>
            ) : (
                <>
                    <StatsCards statistics={statistics} data={filteredData} distanceUnit={distanceUnit} deltas={deltas} periodLabel={periodLabel} />

                    <Tabs value={activeTab} onChange={setActiveTab} keepMounted={false}>
                        <Tabs.List className="ps-no-print">
                            <Tabs.Tab value="overview" leftSection={<IconChartBar size={16} />}>Overview</Tabs.Tab>
                            <Tabs.Tab value="insights" leftSection={<IconBulb size={16} />}>Insights</Tabs.Tab>
                            <Tabs.Tab value="map" leftSection={<IconMap size={16} />}>Map</Tabs.Tab>
                            <Tabs.Tab value="trips" leftSection={<IconList size={16} />}>Trips</Tabs.Tab>
                            <Tabs.Tab value="guide" leftSection={<IconBook size={16} />}>Guide</Tabs.Tab>
                        </Tabs.List>

                        <Tabs.Panel value="overview" pt="lg">
                            <ChartsView data={filteredData} distanceUnit={distanceUnit} insights={insights} />
                        </Tabs.Panel>

                        <Tabs.Panel value="insights" pt="lg">
                            <InsightsView insights={insights} statistics={statistics} distanceUnit={distanceUnit} data={filteredData} />
                        </Tabs.Panel>

                        <Tabs.Panel value="map" pt="lg">
                            <Suspense fallback={<TabLoader />}>
                                <MapView data={filteredData} distanceUnit={distanceUnit} places={insights?.places} />
                            </Suspense>
                        </Tabs.Panel>

                        <Tabs.Panel value="trips" pt="lg">
                            <TableView data={filteredData} distanceUnit={distanceUnit} />
                        </Tabs.Panel>

                        <Tabs.Panel value="guide" pt="lg">
                            <DataGuide distanceUnit={distanceUnit} />
                        </Tabs.Panel>
                    </Tabs>
                </>
            )}
        </Stack>
    );
}

export default Dashboard;
