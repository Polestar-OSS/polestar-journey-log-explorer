import { useMemo, useState } from 'react';
import { Box, Button, Grid, Group, SimpleGrid, Stack, Text } from '@mantine/core';
import { IconRoute, IconBolt, IconGauge, IconLeaf, IconClock, IconCoin, IconArrowsDiagonal, IconCalendarStats } from '@tabler/icons-react';
import CostCalculatorModal from '../CostCalculatorModal';
import StatTile from './StatTile';
import Eyebrow from '../ui/Eyebrow';
import DeltaBadge from '../ui/DeltaBadge';
import { useCountUp } from '../../hooks/useCountUp';
import { formatNumber } from '../../utils/format';
import { formatDuration, formatDayLabel } from '../../utils/journeyDate';
import { ChartDataProcessor } from '../../services/charts/ChartDataProcessor';

const processor = new ChartDataProcessor();

/**
 * Hero figure (total distance) plus a KPI row. Deltas compare the filtered
 * period with the period of equal length that precedes it.
 */
function StatsCards({ statistics, data, distanceUnit = 'km', deltas, periodLabel }) {
    const [costModalOpened, setCostModalOpened] = useState(false);
    const distLabel = distanceUnit === 'mi' ? 'mi' : 'km';

    const totalDistance = parseFloat(statistics?.totalDistance ?? 0);
    const animatedDistance = useCountUp(totalDistance, 900);

    const sparks = useMemo(() => {
        if (!data || data.length === 0) return {};
        const granularity = (statistics?.lastTs - statistics?.firstTs) > 120 * 86400000 ? 'week' : 'day';
        return {
            distance: processor.sparkline(data, 'distance', granularity, 14),
            trips: processor.sparkline(data, 'trips', granularity, 14),
            consumption: processor.sparkline(data, 'consumption', granularity, 14),
            efficiency: processor.sparkline(data, 'efficiency', granularity, 14).map((p) => ({ ...p, value: p.value ?? 0 })),
        };
    }, [data, statistics]);

    if (!statistics) return null;

    const rangeLabel = statistics.firstTs && statistics.lastTs
        ? `${formatDayLabel(new Date(statistics.firstTs))} – ${formatDayLabel(new Date(statistics.lastTs))}, ${new Date(statistics.lastTs).getFullYear()}`
        : '';
    const deltaLabel = periodLabel ? `vs previous ${periodLabel}` : 'vs previous period';

    return (
        <>
            <Grid gutter="md" align="stretch">
                <Grid.Col span={{ base: 12, md: 5, lg: 4 }}>
                    <Box className="ps-card ps-rise" p={{ base: 'lg', sm: 'xl' }} h="100%" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
                        <Box className="ps-dotgrid" style={{ position: 'absolute', right: -60, top: -60, width: 260, height: 260, opacity: 0.6, pointerEvents: 'none' }} />
                        <Stack gap={6}>
                            <Eyebrow>Distance driven</Eyebrow>
                            <Text component="div" className="ps-hero-figure">
                                {formatNumber(animatedDistance, 0)}
                                <span className="ps-hero-unit">{distLabel}</span>
                            </Text>
                        </Stack>
                        <Stack gap={8} mt="lg">
                            {deltas?.hasPrevious && <DeltaBadge value={deltas.distance} label={deltaLabel} size="sm" />}
                            <Text size="sm" c="dimmed">
                                {statistics.totalTrips.toLocaleString()} trips · {statistics.activeDays} driving days
                            </Text>
                            <Text size="xs" c="dimmed" className="ps-tabular">{rangeLabel}</Text>
                        </Stack>
                    </Box>
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 7, lg: 8 }}>
                    <SimpleGrid cols={{ base: 2, sm: 2, lg: 4 }} spacing="md" h="100%">
                        <StatTile
                            label="Trips"
                            value={statistics.totalTrips}
                            digits={0}
                            icon={IconRoute}
                            delta={deltas?.hasPrevious ? deltas.trips : null}
                            deltaLabel={deltaLabel}
                            spark={sparks.trips}
                            hint={`${statistics.avgTripDistance} ${distLabel} per trip on average`}
                            className="ps-card ps-rise"
                            style={{ '--i': 1 }}
                        />
                        <StatTile
                            label="Energy used"
                            value={parseFloat(statistics.totalConsumption)}
                            unit="kWh"
                            icon={IconBolt}
                            delta={deltas?.hasPrevious ? deltas.consumption : null}
                            upIsGood={false}
                            deltaLabel={deltaLabel}
                            spark={sparks.consumption}
                            hint="Energy drawn from the battery while driving"
                            className="ps-card ps-rise"
                            style={{ '--i': 2 }}
                        />
                        <StatTile
                            label="Efficiency"
                            value={parseFloat(statistics.avgEfficiency)}
                            unit={`kWh/100${distLabel}`}
                            digits={1}
                            icon={IconGauge}
                            delta={deltas?.hasPrevious ? deltas.efficiency : null}
                            upIsGood={false}
                            deltaLabel={deltaLabel}
                            spark={sparks.efficiency}
                            hint={`Best ${statistics.bestEfficiency}, worst ${statistics.worstEfficiency}`}
                            accent
                            className="ps-card ps-rise"
                            style={{ '--i': 3 }}
                        />
                        <StatTile
                            label="CO₂ avoided"
                            value={parseFloat(statistics.carbonSaved)}
                            unit="kg"
                            icon={IconLeaf}
                            hint={`≈ ${statistics.treesEquivalent} trees for a year · ${statistics.gasSaved} ${statistics.fuelUnit} of fuel not burned`}
                            className="ps-card ps-rise"
                            style={{ '--i': 4 }}
                        />
                        <StatTile
                            label="Time driving"
                            value={statistics.totalDurationMin > 0 ? formatDuration(statistics.totalDurationMin) : '–'}
                            icon={IconClock}
                            hint={statistics.avgSpeed ? `${statistics.avgSpeed} ${distLabel}/h average moving speed` : 'No timing data'}
                            className="ps-card ps-rise"
                            style={{ '--i': 5 }}
                        />
                        <StatTile
                            label="Longest trip"
                            value={statistics.longestTrip?.distanceKm ?? 0}
                            unit={distLabel}
                            icon={IconArrowsDiagonal}
                            hint={statistics.longestTrip ? `${statistics.longestTrip.startDate} · ${statistics.longestTrip.consumptionKwh} kWh` : ''}
                            className="ps-card ps-rise"
                            style={{ '--i': 6 }}
                        />
                        <StatTile
                            label="Odometer span"
                            value={statistics.odometerEnd - statistics.odometerStart}
                            unit={distLabel}
                            digits={0}
                            icon={IconCalendarStats}
                            hint={`${formatNumber(statistics.odometerStart, 0)} → ${formatNumber(statistics.odometerEnd, 0)} on the clock`}
                            className="ps-card ps-rise"
                            style={{ '--i': 7 }}
                        />
                        <StatTile
                            label="Charging cost"
                            value="Estimate"
                            icon={IconCoin}
                            hint="Open the calculator with your tariff"
                            onClick={() => setCostModalOpened(true)}
                            className="ps-card ps-rise ps-card-hover"
                            style={{ '--i': 8 }}
                        />
                    </SimpleGrid>
                </Grid.Col>
            </Grid>

            <Group justify="flex-end" mt={-4} className="ps-no-print">
                <Button size="compact-xs" variant="subtle" color="gray" onClick={() => setCostModalOpened(true)}>
                    Charging cost calculator
                </Button>
            </Group>

            <CostCalculatorModal opened={costModalOpened} onClose={() => setCostModalOpened(false)} statistics={statistics} distanceUnit={distanceUnit} />
        </>
    );
}

export default StatsCards;
