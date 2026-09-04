import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import { Box, Center, Loader, Stack, Tabs, Text } from '@mantine/core';
import { IconChartBar, IconMap, IconList, IconBook, IconBulb, IconSparkles, IconTelescope } from '@tabler/icons-react';
import StatsCards from './stats/StatsCards';
import ChartsView from './charts/ChartsView';
import InsightsView from './insights/InsightsView';
import StoryView from './story/StoryView';
import ExploreView from './explore/ExploreView';
import TableView from './table/TableView';
import DataGuide from './DataGuide';
import FilterBar from './filters/FilterBar';
import SourcesBar from './SourcesBar';
import { EXPERIENCE_LEVELS } from '../utils/preferences';
import { calculateStatistics } from '../utils/dataParser';
import { InsightsCalculator } from '../services/insights/InsightsCalculator';
import { CostCalculator } from '../services/cost/CostCalculator';
import { VehicleComparison } from '../services/comparison/VehicleComparison';
import { useTariff } from '../hooks/useTariff';
import { useComparison } from '../hooks/useComparison';

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

const TABS_BY_LEVEL = {
    simple: ['story', 'map', 'trips', 'guide'],
    detailed: ['overview', 'insights', 'map', 'trips', 'guide'],
    expert: ['overview', 'insights', 'explore', 'map', 'trips', 'guide'],
};

function Dashboard({ data, distanceUnit = 'km', sources, duplicatesRemoved = 0, onFilteredChange, onAddFiles, level = 'detailed', onChangeLevel }) {
    const tabs = TABS_BY_LEVEL[level] ?? TABS_BY_LEVEL.detailed;
    const [requestedTab, setActiveTab] = useState(null);
    const activeTab = requestedTab && tabs.includes(requestedTab) ? requestedTab : tabs[0];
    const [filterState, setFilterState] = useState({ filtered: data, range: null, isFiltered: false });
    const { filtered: filteredData, range, isFiltered } = filterState;

    const handleFilterChange = useCallback((next) => {
        setFilterState(next);
        onFilteredChange?.(next.filtered);
    }, [onFilteredChange]);

    const statistics = useMemo(() => calculateStatistics(filteredData, distanceUnit), [filteredData, distanceUnit]);

    const insights = useMemo(() => new InsightsCalculator(distanceUnit).compute(filteredData), [filteredData, distanceUnit]);
    const [tariff] = useTariff();
    const { vehicle, fuelPrice } = useComparison();
    const usableKwh = insights?.battery?.usableKwh ?? null;
    const cost = useMemo(() => new CostCalculator(tariff, { distanceUnit }).compute(filteredData, { usableKwh }), [tariff, filteredData, distanceUnit, usableKwh]);
    const comparison = useMemo(
        () => new VehicleComparison({ distanceUnit }).compare(filteredData, vehicle, { fuelPrice, evCostPerKwh: cost.effectiveRatePerKwh, evCostTotal: cost.cost.total }),
        [filteredData, vehicle, fuelPrice, cost, distanceUnit]
    );

    const deltas = useMemo(() => {
        if (!range?.fromTs || !range?.toTs || !isFiltered) return null;
        const previous = InsightsCalculator.previousPeriod(data, range.fromTs, range.toTs);
        return InsightsCalculator.comparePeriods(filteredData, previous);
    }, [data, filteredData, range, isFiltered]);

    const periodLabel = isFiltered ? periodLabelFor(range) : null;

    return (
        <Stack gap="lg">
            <Stack gap="xs">
                <SourcesBar sources={sources} totalTrips={data.length} duplicatesRemoved={duplicatesRemoved} distanceUnit={distanceUnit} onAddFiles={onAddFiles} />
                <FilterBar data={data} distanceUnit={distanceUnit} sources={sources} onFilterChange={handleFilterChange} />
            </Stack>

            {filteredData.length === 0 ? (
                <Box className="ps-card" p="xl">
                    <Text fw={500}>No trips match these filters.</Text>
                    <Text size="sm" c="dimmed">Widen the date range or clear the filters to see your data again.</Text>
                </Box>
            ) : (
                <>
                    <StatsCards statistics={statistics} data={filteredData} distanceUnit={distanceUnit} deltas={deltas} periodLabel={periodLabel} compact={level === 'simple'} usableKwh={usableKwh} cost={cost} comparison={comparison} />

                    <Tabs value={activeTab} onChange={setActiveTab} keepMounted={false}>
                        <Text size="xs" c="dimmed" className="ps-no-print" mb={4}>
                            <b>{EXPERIENCE_LEVELS.find((l) => l.value === level)?.label}</b>: {EXPERIENCE_LEVELS.find((l) => l.value === level)?.description}
                            {level === 'simple' && ' Detailed adds the Overview charts and an Insights page.'}
                            {level === 'detailed' && ' Expert adds the Explore tab (pivots, distributions, a consumption model, data quality) and more columns in Trips.'}
                        </Text>
                        <Tabs.List className="ps-no-print">
                            {tabs.includes('story') && <Tabs.Tab value="story" leftSection={<IconSparkles size={16} />}>Your driving</Tabs.Tab>}
                            {tabs.includes('overview') && <Tabs.Tab value="overview" leftSection={<IconChartBar size={16} />}>Overview</Tabs.Tab>}
                            {tabs.includes('insights') && <Tabs.Tab value="insights" leftSection={<IconBulb size={16} />}>Insights</Tabs.Tab>}
                            {tabs.includes('explore') && <Tabs.Tab value="explore" leftSection={<IconTelescope size={16} />}>Explore</Tabs.Tab>}
                            <Tabs.Tab value="map" leftSection={<IconMap size={16} />}>Map</Tabs.Tab>
                            <Tabs.Tab value="trips" leftSection={<IconList size={16} />}>Trips</Tabs.Tab>
                            <Tabs.Tab value="guide" leftSection={<IconBook size={16} />}>Guide</Tabs.Tab>
                        </Tabs.List>

                        {tabs.includes('story') && (
                            <Tabs.Panel value="story" pt="lg">
                                <StoryView statistics={statistics} insights={insights} data={filteredData} distanceUnit={distanceUnit} usableKwh={usableKwh} cost={cost} comparison={comparison} onOpenTab={setActiveTab} onChangeLevel={onChangeLevel} />
                            </Tabs.Panel>
                        )}

                        {tabs.includes('overview') && (
                            <Tabs.Panel value="overview" pt="lg">
                                <ChartsView data={filteredData} distanceUnit={distanceUnit} insights={insights} />
                            </Tabs.Panel>
                        )}

                        {tabs.includes('insights') && (
                            <Tabs.Panel value="insights" pt="lg">
                                <InsightsView insights={insights} statistics={statistics} distanceUnit={distanceUnit} data={filteredData} cost={cost} comparison={comparison} fuelPrice={fuelPrice} />
                            </Tabs.Panel>
                        )}

                        {tabs.includes('explore') && (
                            <Tabs.Panel value="explore" pt="lg">
                                <ExploreView data={filteredData} distanceUnit={distanceUnit} sources={sources} />
                            </Tabs.Panel>
                        )}

                        <Tabs.Panel value="map" pt="lg">
                            <Suspense fallback={<TabLoader />}>
                                <MapView data={filteredData} distanceUnit={distanceUnit} places={insights?.places} />
                            </Suspense>
                        </Tabs.Panel>

                        <Tabs.Panel value="trips" pt="lg">
                            <TableView data={filteredData} distanceUnit={distanceUnit} expert={level === 'expert'} />
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
