import { useMemo } from 'react';
import { Badge, Box, Grid, Group, Progress, SimpleGrid, Stack, Table, Text, ThemeIcon } from '@mantine/core';
import { IconSnowflake, IconHome, IconBatteryCharging, IconBattery3, IconRulerMeasure, IconRoute, IconCalendarTime, IconTrophy, IconMapPin, IconBolt, IconGauge, IconCar } from '@tabler/icons-react';
import Eyebrow from '../ui/Eyebrow';
import { formatNumber } from '../../utils/format';
import { VehicleComparison } from '../../services/comparison/VehicleComparison';
import { VEHICLES } from '../../services/comparison/Vehicles';
import { currencyPrefix } from '../../services/cost/TariffModel';
import { formatDuration, SEASON_MONTHS } from '../../utils/journeyDate';

const WEEKDAYS_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function InsightCard({ icon: Icon, eyebrow, headline, body, children, accent = false, index = 0 }) {
    return (
        <Box className={`ps-card ps-rise ${accent ? 'ps-accent-bar' : ''}`} p="lg" style={{ '--i': index, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Group gap="sm" wrap="nowrap" align="center">
                <ThemeIcon size={32} radius="xs" variant="light" color={accent ? 'polestar' : 'gray'}>
                    <Icon size={18} stroke={1.5} />
                </ThemeIcon>
                <Eyebrow>{eyebrow}</Eyebrow>
            </Group>
            <Text fz={{ base: 'lg', sm: 'xl' }} fw={500} lh={1.25} style={{ letterSpacing: '-0.015em' }}>
                {headline}
            </Text>
            {body && (
                <Text size="sm" c="dimmed" lh={1.5}>
                    {body}
                </Text>
            )}
            {children}
        </Box>
    );
}

function Fact({ label, value }) {
    return (
        <div>
            <Eyebrow style={{ fontSize: 10 }}>{label}</Eyebrow>
            <Text fw={500} className="ps-tabular" mt={2}>{value}</Text>
        </div>
    );
}

const truncate = (s, n = 42) => (s && s.length > n ? `${s.slice(0, n)}…` : s || '');

/**
 * Narrative findings derived from InsightsCalculator. Every card states the
 * number and what it was derived from, so nothing reads as magic.
 */
function InsightsView({ insights, statistics, distanceUnit = 'km', data, cost, comparison, fuelPrice = null }) {
    const fleet = useMemo(
        () => new VehicleComparison({ distanceUnit }).compareAll(data || [], VEHICLES, { fuelPrice, evCostPerKwh: cost?.effectiveRatePerKwh ?? null, evCostTotal: cost?.cost?.total ?? null }),
        [data, distanceUnit, fuelPrice, cost]
    );
    if (!insights || !statistics) return null;
    const unit = distanceUnit === 'mi' ? 'mi' : 'km';
    const effUnit = `kWh/100${unit}`;
    const { seasonality, places, charging, battery, coverage, shortTrips, rhythm, records } = insights;
    let i = 0;

    const seasonReady = seasonality.winterPenaltyPct !== null;
    const winterRange = seasonReady && battery.usableKwh && seasonality.winter.efficiency ? Math.round((battery.usableKwh / seasonality.winter.efficiency) * 100) : null;
    const summerRange = seasonReady && battery.usableKwh && seasonality.summer.efficiency ? Math.round((battery.usableKwh / seasonality.summer.efficiency) * 100) : null;
    const seasonMonths = SEASON_MONTHS[seasonality.hemisphere ?? 'north'];

    const home = places.top[0];
    const second = places.top[1];
    const sym = currencyPrefix(cost?.currency);

    return (
        <Stack gap="md">
            <Grid gap="md">
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <InsightCard
                        icon={IconSnowflake}
                        eyebrow="Seasonality"
                        accent={seasonReady && seasonality.winterPenaltyPct >= 15}
                        index={i++}
                        headline={
                            seasonReady
                                ? seasonality.winterPenaltyPct > 0
                                    ? `Winter costs you ${seasonality.winterPenaltyPct}% more energy per ${unit}.`
                                    : `Winter is not hurting your efficiency.`
                                : 'Not enough winter and summer driving yet to compare seasons.'
                        }
                        body={
                            seasonReady
                                ? `${formatNumber(seasonality.winter.efficiency, 1)} ${effUnit} over ${seasonality.winter.trips} winter trips (${seasonality.winter.monthsLabel}) versus ${formatNumber(seasonality.summer.efficiency, 1)} over ${seasonality.summer.trips} summer trips (${seasonality.summer.monthsLabel}). Cabin heating, a cold pack and denser air all add up.${seasonality.confidence === 'low' ? ' The sample is still small; a full year will sharpen this.' : ''}`
                                : `${seasonality.reason} Seasons are ${seasonMonths.winter} (winter) and ${seasonMonths.summer} (summer)${seasonality.hemisphere === 'south' ? ', southern hemisphere, from your trip coordinates' : ''}.`
                        }
                    >
                        {winterRange && summerRange && (
                            <SimpleGrid cols={2} spacing="md">
                                <Fact label="Est. full-charge range · summer" value={`≈ ${formatNumber(summerRange, 0)} ${unit}`} />
                                <Fact label="Est. full-charge range · winter" value={`≈ ${formatNumber(winterRange, 0)} ${unit}`} />
                            </SimpleGrid>
                        )}
                    </InsightCard>
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 6 }}>
                    <InsightCard
                        icon={IconBattery3}
                        eyebrow="Battery"
                        index={i++}
                        headline={
                            battery.usableKwh
                                ? `Your usable battery reads as ≈ ${formatNumber(battery.usableKwh, 0)} kWh.`
                                : 'Not enough long trips to size the battery yet.'
                        }
                        body={
                            battery.usableKwh
                                ? `Energy used ÷ SOC consumed across ${battery.samples} trips that moved the gauge by 5 % or more.${battery.likelyPack ? ` That matches a ${battery.likelyPack}.` : ''}`
                                : 'The estimate needs at least five trips that each used 5 % or more of the battery.'
                        }
                    >
                        {battery.estimatedRange && (
                            <SimpleGrid cols={2} spacing="md">
                                <Fact label="Range at 100 % · your average" value={`≈ ${formatNumber(battery.estimatedRange, 0)} ${unit}`} />
                                <Fact label="Range at 80 %" value={`≈ ${formatNumber(battery.rangeAt80, 0)} ${unit}`} />
                            </SimpleGrid>
                        )}
                    </InsightCard>
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 6 }}>
                    <InsightCard
                        icon={IconBatteryCharging}
                        eyebrow="Charging"
                        index={i++}
                        headline={
                            charging.significantSessions
                                ? `You typically plug in around ${charging.typicalPlugInSoc}% and stop at ${charging.typicalTargetSoc}%.`
                                : 'No charging sessions could be inferred.'
                        }
                        body={
                            charging.sessions
                                ? `${charging.significantSessions} sessions of 10 % or more were inferred from the battery level rising between trips (${charging.sessions} including top-ups). Lowest level seen: ${charging.lowestSoc}%.`
                                : 'A charging session is inferred whenever the battery level rises between two consecutive trips.'
                        }
                    >
                        {charging.sessions > 0 && (
                            <SimpleGrid cols={3} spacing="md">
                                <Fact label="Avg. session" value={`+${formatNumber(charging.avgGainPct, 0)}%`} />
                                <Fact label="Battery cycled" value={`${formatNumber(charging.fullCyclesEquivalent, 1)}×`} />
                                <Fact label="Median start SOC" value={`${charging.medianStartSoc}%`} />
                            </SimpleGrid>
                        )}
                    </InsightCard>
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 6 }}>
                    <InsightCard
                        icon={IconHome}
                        eyebrow="Places"
                        index={i++}
                        headline={
                            home
                                ? `${formatNumber(places.homeSharePct, 0)}% of your trips start or end at one place.`
                                : 'No location data in this export.'
                        }
                        body={
                            home
                                ? `${places.tripsTouchingHome} of ${data.length} trips touch it - almost certainly home. ${places.uniquePlaces} distinct places appear in total.`
                                : undefined
                        }
                    >
                        {home && (
                            <Stack gap={6}>
                                {places.top.slice(0, 3).map((p, idx) => (
                                    <Group key={p.address + idx} gap="sm" wrap="nowrap">
                                        <IconMapPin size={14} style={{ color: idx === 0 ? 'var(--ps-accent)' : 'var(--ps-muted)', flexShrink: 0 }} />
                                        <Text size="sm" style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.address}>
                                            {truncate(p.address, 48)}
                                        </Text>
                                        <Text size="xs" c="dimmed" className="ps-tabular" style={{ whiteSpace: 'nowrap' }}>
                                            {p.visits} visits · {p.sharePct}%
                                        </Text>
                                    </Group>
                                ))}
                                {second && (
                                    <Progress.Root size={6} radius={0} mt={4}>
                                        <Progress.Section value={home.sharePct} color="polestar" />
                                        <Progress.Section value={second.sharePct} color="gray" />
                                    </Progress.Root>
                                )}
                            </Stack>
                        )}
                    </InsightCard>
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 6 }}>
                    <InsightCard
                        icon={IconRoute}
                        eyebrow="Short hops"
                        accent={shortTrips.sharePct >= 25}
                        index={i++}
                        headline={`${formatNumber(shortTrips.sharePct, 0)}% of trips are under ${shortTrips.threshold} ${unit}.`}
                        body={
                            shortTrips.efficiency && shortTrips.restEfficiency
                                ? `They cover only ${formatNumber(shortTrips.distanceSharePct, 0)}% of your distance but run at ${formatNumber(shortTrips.efficiency, 1)} ${effUnit}, against ${formatNumber(shortTrips.restEfficiency, 1)} for everything else. Pre-conditioning while plugged in helps here.`
                                : `${shortTrips.count} trips fall in this band.`
                        }
                    />
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 6 }}>
                    <InsightCard
                        icon={IconRulerMeasure}
                        eyebrow="Coverage"
                        index={i++}
                        headline={
                            coverage.coveragePct !== null
                                ? `The log covers ${coverage.coveragePct}% of the ${unit} on the odometer.`
                                : `${formatNumber(coverage.loggedDistance, 0)} ${unit} logged.`
                        }
                        body={
                            coverage.coveragePct !== null
                                ? `Odometer moved ${formatNumber(coverage.odometerSpan, 0)} ${unit} between the first and last trip; ${formatNumber(coverage.loggedDistance, 0)} were recorded. ${coverage.unloggedDistance ? `${formatNumber(coverage.unloggedDistance, 0)} ${unit} were driven with the app not recording.` : 'Nothing is missing.'}`
                                : 'Odometer readings are needed to measure coverage.'
                        }
                    >
                        {coverage.coveragePct !== null && (
                            <Progress value={coverage.coveragePct} color="polestar" size={6} radius={0} aria-label="Coverage" />
                        )}
                    </InsightCard>
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 6 }}>
                    <InsightCard
                        icon={IconCalendarTime}
                        eyebrow="Rhythm"
                        index={i++}
                        headline={`${WEEKDAYS_LONG[rhythm.busiestWeekday] ?? 'Weekday'} is your busiest day; ${String(rhythm.peakHour).padStart(2, '0')}:00 the busiest hour.`}
                        body={`You drove on ${rhythm.activeDays} of ${rhythm.spanDays} days (${rhythm.activeDaySharePct}%), averaging ${rhythm.tripsPerActiveDay} trips per driving day. ${formatNumber(rhythm.weekendSharePct, 0)}% of trips fall on weekends.`}
                    >
                        <SimpleGrid cols={2} spacing="md">
                            <Fact label="Longest daily streak" value={`${rhythm.longestStreakDays} days`} />
                            <Fact label="Time behind the wheel" value={statistics.totalDurationMin ? formatDuration(statistics.totalDurationMin) : '–'} />
                        </SimpleGrid>
                    </InsightCard>
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 6 }}>
                    <InsightCard icon={IconTrophy} eyebrow="Records" index={i++} headline="Personal bests in this period.">
                        <Stack gap={10}>
                            {records.longestTrip && (
                                <Group gap="sm" wrap="nowrap" align="flex-start">
                                    <IconRoute size={16} style={{ color: 'var(--ps-muted)', marginTop: 2, flexShrink: 0 }} />
                                    <div style={{ minWidth: 0 }}>
                                        <Text size="sm" fw={500}>Longest trip · {formatNumber(records.longestTrip.distanceKm, 1)} {unit}</Text>
                                        <Text size="xs" c="dimmed" lineClamp={1}>{records.longestTrip.startDate} · {formatNumber(records.longestTrip.efficiency, 1)} {effUnit} · {records.longestTrip.durationMin ? formatDuration(records.longestTrip.durationMin) : ''}</Text>
                                    </div>
                                </Group>
                            )}
                            {records.longestDay && (
                                <Group gap="sm" wrap="nowrap" align="flex-start">
                                    <IconCalendarTime size={16} style={{ color: 'var(--ps-muted)', marginTop: 2, flexShrink: 0 }} />
                                    <div>
                                        <Text size="sm" fw={500}>Biggest day · {formatNumber(records.longestDay.distance, 0)} {unit}</Text>
                                        <Text size="xs" c="dimmed">{records.longestDay.dayKey} · {records.longestDay.trips} trips</Text>
                                    </div>
                                </Group>
                            )}
                            {records.mostEfficient && (
                                <Group gap="sm" wrap="nowrap" align="flex-start">
                                    <IconGauge size={16} style={{ color: 'var(--ps-muted)', marginTop: 2, flexShrink: 0 }} />
                                    <div style={{ minWidth: 0 }}>
                                        <Text size="sm" fw={500}>Most efficient · {formatNumber(records.mostEfficient.efficiency, 1)} {effUnit}</Text>
                                        <Text size="xs" c="dimmed" lineClamp={1}>{records.mostEfficient.startDate} · {formatNumber(records.mostEfficient.distanceKm, 1)} {unit}</Text>
                                    </div>
                                </Group>
                            )}
                            {records.leastEfficient && (
                                <Group gap="sm" wrap="nowrap" align="flex-start">
                                    <IconBolt size={16} style={{ color: 'var(--ps-muted)', marginTop: 2, flexShrink: 0 }} />
                                    <div style={{ minWidth: 0 }}>
                                        <Text size="sm" fw={500}>Thirstiest (≥ {formatNumber(10 / (distanceUnit === 'mi' ? 1.60934 : 1), 0)} {unit}) · {formatNumber(records.leastEfficient.efficiency, 1)} {effUnit}</Text>
                                        <Text size="xs" c="dimmed" lineClamp={1}>{records.leastEfficient.startDate} · {formatNumber(records.leastEfficient.distanceKm, 1)} {unit}</Text>
                                    </div>
                                </Group>
                            )}
                        </Stack>
                    </InsightCard>
                </Grid.Col>
            </Grid>

            {fleet.length > 0 && (
                <InsightCard icon={IconCar} eyebrow="Against real petrol and hybrid cars" index={i++}
                    headline={comparison ? `The same driving in a ${comparison.vehicle.year} ${comparison.vehicle.model} ${comparison.vehicle.trim} would have burned ${formatNumber(comparison.fuel, 0)} ${comparison.fuelUnit} and emitted ${formatNumber(comparison.co2Kg, 0)} kg of CO₂.` : 'Pick a car to compare against in the settings.'}
                    body={`Every row is a real car from the US EPA fuel-economy database (combined cycle, tailpipe CO₂ only). Plug-in hybrids are assumed charged every night: the first electric-range ${unit} of each day are electric at your electricity price, the rest petrol.${fuelPrice ? '' : ' Enter a fuel price in the settings to fill the cost columns.'}`}>
                    <Box className="ps-scroll-x">
                        <Table fz="xs" verticalSpacing={4} withRowBorders={false} className="ps-tabular" style={{ minWidth: 640 }}>
                            <Table.Thead>
                                <Table.Tr>{['Car', 'Powertrain', 'L/100 km', `Fuel (${fleet[0].fuelUnit})`, 'Electric share', 'CO₂ (kg)', 'Would have cost', 'vs your EV'].map((h) => <Table.Th key={h} style={{ color: 'var(--ps-muted)', fontWeight: 600, textAlign: h === 'Car' || h === 'Powertrain' ? 'left' : 'right' }}>{h}</Table.Th>)}</Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {fleet.map((row) => {
                                    const chosen = comparison?.vehicle?.id === row.vehicle.id;
                                    return (
                                        <Table.Tr key={row.vehicle.id} style={chosen ? { background: 'var(--ps-accent-soft)' } : undefined}>
                                            <Table.Td>{row.vehicle.year} {row.vehicle.model} {row.vehicle.trim}{chosen && <Badge size="xs" variant="light" color="polestar" ml={6}>chosen</Badge>}</Table.Td>
                                            <Table.Td c="dimmed">{row.vehicle.powertrainLabel}</Table.Td>
                                            <Table.Td ta="right">{row.vehicle.lPer100km}</Table.Td>
                                            <Table.Td ta="right">{formatNumber(row.fuel, 0)}</Table.Td>
                                            <Table.Td ta="right" c="dimmed">{row.electricSharePct > 0 ? `${row.electricSharePct}%` : '–'}</Table.Td>
                                            <Table.Td ta="right">{formatNumber(row.co2Kg, 0)}</Table.Td>
                                            <Table.Td ta="right">{row.totalCost === null ? '–' : `${sym}${formatNumber(row.totalCost, 0)}`}</Table.Td>
                                            <Table.Td ta="right" style={{ color: row.saving === null ? undefined : row.saving >= 0 ? 'var(--ps-good)' : 'var(--ps-critical)' }}>{row.saving === null ? '–' : `${row.saving >= 0 ? '−' : '+'}${sym}${formatNumber(Math.abs(row.saving), 0)}`}</Table.Td>
                                        </Table.Tr>
                                    );
                                })}
                            </Table.Tbody>
                        </Table>
                    </Box>
                </InsightCard>
            )}

            <Text size="xs" c="dimmed" ta="center" lh={1.6}>
                Findings are derived only from the columns in your export. Charging, battery size and "home" are inferences, not readings from the car.
                {seasonality.months.some((m) => m.trips) && ` Month-of-year figures fold every year in the file onto one calendar (${MONTHS[0]}–${MONTHS[11]}).`}
            </Text>
        </Stack>
    );
}

export default InsightsView;
