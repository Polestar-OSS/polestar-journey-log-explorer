import { useMemo, useState } from 'react';
import { Badge, Box, Button, Grid, Group, Select, SimpleGrid, Stack, Table, Text } from '@mantine/core';
import { Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis, ZAxis, ErrorBar } from 'recharts';
import { IconDownload } from '@tabler/icons-react';
import ChartCard from '../charts/ChartCard';
import ChartTooltip from '../charts/ChartTooltip';
import { TableToggle, DataTable } from '../charts/DataTableToggle';
import Eyebrow from '../ui/Eyebrow';
import { PivotService } from '../../services/analytics/PivotService';
import { StatsService } from '../../services/analytics/StatsService';
import { TableExporter } from '../../services/table/TableDataProcessor';
import { useTokens } from '../../theme/useTokens';
import { formatNumber } from '../../utils/format';

const exporter = new TableExporter();

const axis = (t) => ({ axisLine: false, tickLine: false, tick: { fill: t.muted, fontSize: 11 } });

function Stat({ label, value, unit, hint }) {
    return (
        <div>
            <Eyebrow style={{ fontSize: 10 }}>{label}</Eyebrow>
            <Text className="ps-stat-value" mt={4}>
                {value ?? '–'}
                {unit && value !== null && value !== undefined && <span className="ps-stat-unit">{unit}</span>}
            </Text>
            {hint && <Text size="xs" c="dimmed" mt={2}>{hint}</Text>}
        </div>
    );
}

/**
 * Expert level: a pivot builder over every dimension and metric, percentile
 * tables, a fitted consumption model, efficiency drivers, a battery fit,
 * charging behaviour and a data-quality report.
 */
function ExploreView({ data, distanceUnit = 'km', sources = [] }) {
    const t = useTokens();
    const unit = distanceUnit === 'mi' ? 'mi' : 'km';
    const effUnit = `kWh/100${unit}`;
    const pivotService = useMemo(() => new PivotService(distanceUnit), [distanceUnit]);
    const stats = useMemo(() => new StatsService(distanceUnit), [distanceUnit]);

    const [dimension, setDimension] = useState('month');
    const [metric, setMetric] = useState('efficiency');
    const [pivotTable, setPivotTable] = useState(false);

    const pivot = useMemo(() => pivotService.pivot(data, dimension, metric), [pivotService, data, dimension, metric]);
    const distribution = useMemo(() => stats.distributionTable(data), [stats, data]);
    const model = useMemo(() => stats.consumptionModel(data), [stats, data]);
    const bySpeed = useMemo(() => stats.efficiencyBySpeed(data), [stats, data]);
    const byHour = useMemo(() => stats.efficiencyByHour(data), [stats, data]);
    const bySoc = useMemo(() => stats.efficiencyByStartSoc(data), [stats, data]);
    const battery = useMemo(() => stats.batteryFit(data), [stats, data]);
    const charging = useMemo(() => stats.chargeSessions(data), [stats, data]);
    const quality = useMemo(() => stats.dataQuality(data, sources), [stats, data, sources]);

    const horizontal = !pivot.dimension.timeline && pivot.rows.length > 8;
    const exportPivot = () => exporter.downloadFile(pivotService.toCSV(pivot), `pivot-${dimension}-${metric}.csv`, 'text/csv;charset=utf-8;');

    const fitLine = model.overall.marginalPer100 !== null
        ? [{ x: 0, y: model.overall.overheadKwh }, { x: Math.max(...model.points.map((p) => p.x), 1), y: model.overall.overheadKwh + (model.overall.marginalPer100 / 100) * Math.max(...model.points.map((p) => p.x), 1) }]
        : [];
    const batteryLine = battery.kwhPerPct ? [{ x: 0, y: 0 }, { x: Math.max(...battery.points.map((p) => p.x), 1), y: battery.kwhPerPct * Math.max(...battery.points.map((p) => p.x), 1) }] : [];
    const speedData = bySpeed.filter((b) => b.n > 0).map((b) => ({ ...b, err: b.median !== null ? [b.median - b.p25, b.p75 - b.median] : [0, 0] }));

    return (
        <Stack gap="md">
            {/* Pivot builder */}
            <ChartCard
                eyebrow="Pivot builder"
                title={`${pivot.metric.label} by ${pivot.dimension.label.toLowerCase()}`}
                description="Any dimension against any metric. Ratio metrics (efficiency, speed) are energy ÷ distance for the bucket, not an average of trips."
                controls={
                    <Group gap="xs" wrap="wrap">
                        <Select size="xs" data={pivotService.dimensionOptions()} value={dimension} onChange={setDimension} w={170} aria-label="Group by" allowDeselect={false} />
                        <Select size="xs" data={pivotService.metricOptions()} value={metric} onChange={setMetric} w={230} aria-label="Metric" allowDeselect={false} />
                        <Button size="xs" variant="default" leftSection={<IconDownload size={14} />} onClick={exportPivot}>CSV</Button>
                        <TableToggle opened={pivotTable} onToggle={() => setPivotTable((o) => !o)} />
                    </Group>
                }
                footer={pivot.total !== null ? `Total ${formatNumber(pivot.total, pivot.metric.digits)} ${pivot.metric.unit}. Shares are of that total.` : `${pivot.rows.length} buckets · hover a bar for trips, distance and energy in that bucket.`}
                className="ps-rise"
            >
                {pivotTable ? (
                    <DataTable
                        columns={[
                            { key: 'label', label: pivot.dimension.label, align: 'left' },
                            { key: 'value', label: `${pivot.metric.label}${pivot.metric.unit ? ` (${pivot.metric.unit})` : ''}`, format: (v) => formatNumber(v, pivot.metric.digits) },
                            { key: 'trips', label: 'Trips' },
                            { key: 'distance', label: unit, format: (v) => formatNumber(v, 0) },
                            { key: 'energy', label: 'kWh', format: (v) => formatNumber(v, 1) },
                            { key: 'share', label: '%', format: (v) => (v === null ? '–' : `${v}%`) },
                        ]}
                        rows={pivot.rows}
                        maxHeight={360}
                    />
                ) : (
                    <ResponsiveContainer width="100%" height={horizontal ? Math.max(240, pivot.rows.length * 26) : 280}>
                        <BarChart data={pivot.rows} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 8, right: 16, left: horizontal ? 8 : -12, bottom: 0 }} barCategoryGap={horizontal ? 4 : '22%'}>
                            <CartesianGrid vertical={horizontal} horizontal={!horizontal} stroke={t.grid} />
                            {horizontal ? (
                                <>
                                    <XAxis type="number" {...axis(t)} tickFormatter={(v) => formatNumber(v, 0)} />
                                    <YAxis type="category" dataKey="label" {...axis(t)} width={150} tick={{ fill: t.muted, fontSize: 10 }} />
                                </>
                            ) : (
                                <>
                                    <XAxis dataKey="label" {...axis(t)} interval={Math.max(0, Math.ceil(pivot.rows.length / 12) - 1)} />
                                    <YAxis {...axis(t)} width={48} tickFormatter={(v) => formatNumber(v, 0)} />
                                </>
                            )}
                            <Tooltip
                                cursor={{ fill: t.accentSoft }}
                                content={<ChartTooltip title={(d) => d?.label} rows={(d) => [{ key: 'value', label: pivot.metric.label, value: d.value ?? '–', unit: pivot.metric.unit, color: t.series[0] }, { key: 'trips', label: 'trips', value: d.trips, color: t.contextStrong }, { key: 'distance', label: unit, value: d.distance, color: t.contextStrong }, { key: 'energy', label: 'kWh', value: d.energy, color: t.contextStrong }]} />}
                            />
                            <Bar dataKey="value" name={pivot.metric.label} fill={t.series[0]} radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} maxBarSize={horizontal ? 18 : 28} isAnimationActive={false} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </ChartCard>

            {/* Distribution table */}
            <ChartCard eyebrow="Distributions" title="Percentiles per trip" description="Where the middle of your driving really is. p50 is the median; p5 and p95 bracket the usual range." className="ps-rise" style={{ '--i': 1 }}>
                <Box className="ps-scroll-x">
                    <Table fz="xs" verticalSpacing={6} withRowBorders className="ps-tabular" style={{ minWidth: 640 }}>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th style={{ color: 'var(--ps-muted)' }}>Measure</Table.Th>
                                {['n', 'min', 'p5', 'p25', 'p50', 'p75', 'p95', 'max', 'mean'].map((h) => (
                                    <Table.Th key={h} style={{ color: 'var(--ps-muted)', textAlign: 'right' }}>{h}</Table.Th>
                                ))}
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {distribution.map((r) => (
                                <Table.Tr key={r.key}>
                                    <Table.Td>
                                        <Text size="xs" fw={500}>{r.label}</Text>
                                        <Text size="10px" c="dimmed">{r.unit}</Text>
                                    </Table.Td>
                                    <Table.Td style={{ textAlign: 'right' }}>{r.n}</Table.Td>
                                    {['min', 'p5', 'p25', 'p50', 'p75', 'p95', 'max', 'mean'].map((k) => (
                                        <Table.Td key={k} style={{ textAlign: 'right', fontWeight: k === 'p50' ? 600 : 400 }}>{formatNumber(r[k], r.digits)}</Table.Td>
                                    ))}
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                </Box>
            </ChartCard>

            {/* Consumption model */}
            <Grid gap="md">
                <Grid.Col span={{ base: 12, lg: 7 }}>
                    <ChartCard
                        eyebrow="Consumption model"
                        title="Energy per trip = overhead + rolling consumption × distance"
                        description="A straight line fitted to every trip. The intercept is what a trip costs before the wheels turn (cabin, battery conditioning, computers); the slope is what the car really uses on the move."
                        className="ps-rise"
                        style={{ '--i': 2 }}
                        footer={model.breakEvenDistance ? `Below ${formatNumber(model.breakEvenDistance, 1)} ${unit} the overhead is the bigger half of the bill.` : null}
                    >
                        <ResponsiveContainer width="100%" height={280}>
                            <ComposedChart margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                                <CartesianGrid stroke={t.grid} />
                                <XAxis type="number" dataKey="x" name={unit} {...axis(t)} domain={[0, 'auto']} tickFormatter={(v) => formatNumber(v, 0)} />
                                <YAxis type="number" dataKey="y" name="kWh" {...axis(t)} width={44} domain={[0, 'auto']} tickFormatter={(v) => formatNumber(v, 0)} />
                                <ZAxis range={[24, 24]} />
                                <Tooltip cursor={{ stroke: t.axis }} content={<ChartTooltip title={() => 'Trip'} rows={(d) => [{ key: 'y', label: 'kWh', value: d.y, color: t.series[0] }, { key: 'x', label: unit, value: d.x, color: t.contextStrong }]} />} />
                                <Scatter data={model.points} fill={t.series[0]} shape={(p) => <circle cx={p.cx} cy={p.cy} r={3} fill={t.series[0]} fillOpacity={0.5} stroke={t.surface} strokeWidth={1} />} isAnimationActive={false} />
                                {fitLine.length > 0 && <Line data={fitLine} dataKey="y" type="linear" stroke={t.ink} strokeWidth={1.5} dot={false} isAnimationActive={false} name="Fit" />}
                            </ComposedChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </Grid.Col>
                <Grid.Col span={{ base: 12, lg: 5 }}>
                    <Box className="ps-card ps-rise" p="lg" h="100%" style={{ '--i': 3 }}>
                        <Eyebrow>Fitted parameters</Eyebrow>
                        <SimpleGrid cols={2} spacing="md" mt="md">
                            <Stat label="Overhead per trip" value={formatNumber(model.overall.overheadKwh, 2)} unit="kWh" hint="Fixed cost of starting a trip" />
                            <Stat label="Rolling consumption" value={formatNumber(model.overall.marginalPer100, 1)} unit={effUnit} hint="Slope of the line" />
                            <Stat label="Fit quality (r²)" value={formatNumber(model.overall.r2, 2)} hint="1.0 is a perfect line" />
                            <Stat label="Trips fitted" value={model.overall.n} />
                        </SimpleGrid>
                        <Text size="xs" c="dimmed" mt="lg" mb={6}>By season (8+ trips needed)</Text>
                        <Table fz="xs" verticalSpacing={4} withRowBorders={false} className="ps-tabular">
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th style={{ color: 'var(--ps-muted)' }}>Season</Table.Th>
                                    <Table.Th style={{ color: 'var(--ps-muted)', textAlign: 'right' }}>Overhead kWh</Table.Th>
                                    <Table.Th style={{ color: 'var(--ps-muted)', textAlign: 'right' }}>{effUnit}</Table.Th>
                                    <Table.Th style={{ color: 'var(--ps-muted)', textAlign: 'right' }}>n</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {Object.entries(model.bySeason).map(([season, m]) => (
                                    <Table.Tr key={season}>
                                        <Table.Td tt="capitalize">{season}</Table.Td>
                                        <Table.Td style={{ textAlign: 'right' }}>{formatNumber(m.overheadKwh, 2)}</Table.Td>
                                        <Table.Td style={{ textAlign: 'right' }}>{formatNumber(m.marginalPer100, 1)}</Table.Td>
                                        <Table.Td style={{ textAlign: 'right' }}>{m.n}</Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    </Box>
                </Grid.Col>
            </Grid>

            {/* Efficiency drivers */}
            <Grid gap="md">
                <Grid.Col span={{ base: 12, md: 4 }}>
                    <ChartCard eyebrow="Driver" title="Efficiency by average speed" description="Median per band; whiskers span the middle half of trips." className="ps-rise" style={{ '--i': 4 }}>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={speedData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barCategoryGap="25%">
                                <CartesianGrid vertical={false} stroke={t.grid} />
                                <XAxis dataKey="label" {...axis(t)} tick={{ fill: t.muted, fontSize: 10 }} interval={0} />
                                <YAxis {...axis(t)} width={40} tickFormatter={(v) => formatNumber(v, 0)} />
                                <Tooltip cursor={{ fill: t.accentSoft }} content={<ChartTooltip title={(d) => `${d?.label} ${unit}/h`} rows={(d) => [{ key: 'median', label: `median ${effUnit}`, value: d.median, color: t.series[0] }, { key: 'range', label: 'p25–p75', value: `${d.p25}–${d.p75}`, color: t.contextStrong }, { key: 'n', label: 'trips', value: d.n, color: t.contextStrong }]} />} />
                                <Bar dataKey="median" name={effUnit} fill={t.series[0]} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false}>
                                    <ErrorBar dataKey="err" width={4} strokeWidth={1} stroke={t.ink2} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 4 }}>
                    <ChartCard eyebrow="Driver" title="Efficiency by hour of day" description="Median per hour, hours with fewer than 3 trips left blank." className="ps-rise" style={{ '--i': 5 }}>
                        <ResponsiveContainer width="100%" height={220}>
                            <ComposedChart data={byHour} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                                <CartesianGrid vertical={false} stroke={t.grid} />
                                <XAxis dataKey="hour" {...axis(t)} tickFormatter={(h) => (h % 6 === 0 ? `${h}h` : '')} interval={0} />
                                <YAxis {...axis(t)} width={40} tickFormatter={(v) => formatNumber(v, 0)} domain={['auto', 'auto']} />
                                <Tooltip cursor={{ stroke: t.axis }} content={<ChartTooltip title={(d) => `${String(d?.hour).padStart(2, '0')}:00`} rows={(d) => [{ key: 'median', label: `median ${effUnit}`, value: d.median ?? '–', color: t.series[0] }, { key: 'n', label: 'trips', value: d.n, color: t.contextStrong }]} />} />
                                <Line dataKey="median" type="monotone" stroke={t.series[0]} strokeWidth={2} dot={{ r: 3, fill: t.series[0], stroke: t.surface, strokeWidth: 1.5 }} connectNulls={false} isAnimationActive={false} name={effUnit} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 4 }}>
                    <ChartCard eyebrow="Driver" title="Efficiency by battery level at start" description="Does a fuller battery drive differently? Median per band." className="ps-rise" style={{ '--i': 6 }}>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={bySoc} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barCategoryGap="25%">
                                <CartesianGrid vertical={false} stroke={t.grid} />
                                <XAxis dataKey="label" {...axis(t)} tick={{ fill: t.muted, fontSize: 10 }} interval={0} />
                                <YAxis {...axis(t)} width={40} tickFormatter={(v) => formatNumber(v, 0)} />
                                <Tooltip cursor={{ fill: t.accentSoft }} content={<ChartTooltip title={(d) => `Start at ${d?.label}`} rows={(d) => [{ key: 'median', label: `median ${effUnit}`, value: d.median ?? '–', color: t.series[0] }, { key: 'n', label: 'trips', value: d.n, color: t.contextStrong }]} />} />
                                <Bar dataKey="median" name={effUnit} fill={t.series[0]} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </Grid.Col>
            </Grid>

            {/* Battery + charging */}
            <Grid gap="md">
                <Grid.Col span={{ base: 12, lg: 6 }}>
                    <ChartCard
                        eyebrow="Battery"
                        title="Energy used vs battery percentage used"
                        description="Each dot is a trip that used 3% or more. The slope, forced through zero, is kWh per percent; ×100 is the usable pack."
                        className="ps-rise"
                        style={{ '--i': 7 }}
                        footer={battery.usableKwh ? `≈ ${formatNumber(battery.kwhPerPct, 3)} kWh per % → ≈ ${formatNumber(battery.usableKwh, 1)} kWh usable, from ${battery.n} trips (r² ${formatNumber(battery.r2, 2)}).` : 'Not enough trips with a measurable battery drop yet.'}
                    >
                        <ResponsiveContainer width="100%" height={260}>
                            <ComposedChart margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                                <CartesianGrid stroke={t.grid} />
                                <XAxis type="number" dataKey="x" name="% used" {...axis(t)} domain={[0, 'auto']} tickFormatter={(v) => `${v}%`} />
                                <YAxis type="number" dataKey="y" name="kWh" {...axis(t)} width={44} domain={[0, 'auto']} tickFormatter={(v) => formatNumber(v, 0)} />
                                <ZAxis range={[24, 24]} />
                                <Tooltip cursor={{ stroke: t.axis }} content={<ChartTooltip title={() => 'Trip'} rows={(d) => [{ key: 'y', label: 'kWh', value: d.y, color: t.series[1] }, { key: 'x', label: 'battery used', value: `${d.x}%`, color: t.contextStrong }]} />} />
                                <Scatter data={battery.points} shape={(p) => <circle cx={p.cx} cy={p.cy} r={3} fill={t.series[1]} fillOpacity={0.55} stroke={t.surface} strokeWidth={1} />} isAnimationActive={false} />
                                {batteryLine.length > 0 && <Line data={batteryLine} dataKey="y" type="linear" stroke={t.ink} strokeWidth={1.5} dot={false} isAnimationActive={false} />}
                            </ComposedChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </Grid.Col>
                <Grid.Col span={{ base: 12, lg: 6 }}>
                    <ChartCard
                        eyebrow="Charging"
                        title="Where charging starts and stops"
                        description="Sessions inferred between trips, bucketed by battery level: where you plug in versus where you unplug."
                        className="ps-rise"
                        style={{ '--i': 8 }}
                        footer={`${charging.sessions.length} sessions${charging.sessionsPerWeek !== null ? ` · ≈ ${charging.sessionsPerWeek} a week of 10 % or more` : ''}${charging.medianGapMin !== null ? ` · median time parked before a charged departure ${Math.round(charging.medianGapMin / 60)} h` : ''}.`}
                    >
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={charging.histogram} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barCategoryGap="20%" barGap={2}>
                                <CartesianGrid vertical={false} stroke={t.grid} />
                                <XAxis dataKey="band" {...axis(t)} tick={{ fill: t.muted, fontSize: 10 }} interval={0} tickFormatter={(b) => `${b}%`} />
                                <YAxis {...axis(t)} width={36} allowDecimals={false} />
                                <Tooltip cursor={{ fill: t.accentSoft }} content={<ChartTooltip title={(d) => `${d?.band}%`} rows={(d) => [{ key: 'from', label: 'plugged in here', value: d.from, color: t.series[1] }, { key: 'to', label: 'unplugged here', value: d.to, color: t.series[2] }]} />} />
                                <Bar dataKey="from" name="Plug in" fill={t.series[1]} radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false} />
                                <Bar dataKey="to" name="Unplug" fill={t.series[2]} radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false} />
                                <Legend iconType="rect" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </Grid.Col>
            </Grid>

            {/* Data quality */}
            <Grid gap="md">
                <Grid.Col span={{ base: 12, lg: 7 }}>
                    <ChartCard
                        eyebrow="Data quality"
                        title="Logged vs unlogged distance per month"
                        description="Unlogged is the odometer moving between two recorded trips: driving the app did not capture."
                        className="ps-rise"
                        style={{ '--i': 9 }}
                    >
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={quality.months} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barCategoryGap="22%">
                                <CartesianGrid vertical={false} stroke={t.grid} />
                                <XAxis dataKey="label" {...axis(t)} interval={Math.max(0, Math.ceil(quality.months.length / 10) - 1)} />
                                <YAxis {...axis(t)} width={48} tickFormatter={(v) => formatNumber(v, 0)} />
                                <Tooltip cursor={{ fill: t.accentSoft }} content={<ChartTooltip title={(d) => d?.label} rows={(d) => [{ key: 'logged', label: `logged ${unit}`, value: d.logged, color: t.series[0] }, { key: 'unlogged', label: `unlogged ${unit}`, value: d.unlogged, color: t.context }, { key: 'cov', label: 'coverage', value: d.coveragePct === null ? '–' : `${d.coveragePct}%`, color: t.contextStrong }]} />} />
                                <Bar dataKey="logged" name="Logged" stackId="a" fill={t.series[0]} isAnimationActive={false} maxBarSize={28} />
                                <Bar dataKey="unlogged" name="Unlogged" stackId="a" fill={t.context} radius={[4, 4, 0, 0]} isAnimationActive={false} maxBarSize={28} />
                                <Legend iconType="rect" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                                <ReferenceLine y={0} stroke={t.axis} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </Grid.Col>
                <Grid.Col span={{ base: 12, lg: 5 }}>
                    <Box className="ps-card ps-rise" p="lg" h="100%" style={{ '--i': 10 }}>
                        <Eyebrow>What the log cannot tell you</Eyebrow>
                        <Stack gap="sm" mt="md">
                            {quality.issues.map((issue) => (
                                <Group key={issue.key} justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
                                    <div style={{ minWidth: 0 }}>
                                        <Text size="sm" fw={500}>{issue.label}</Text>
                                        <Text size="xs" c="dimmed" lh={1.4}>{issue.hint}</Text>
                                    </div>
                                    <Badge variant={issue.count ? 'light' : 'outline'} color={issue.count ? 'yellow' : 'gray'} size="sm" className="ps-tabular" style={{ flexShrink: 0 }}>
                                        {issue.count}
                                    </Badge>
                                </Group>
                            ))}
                            {quality.sources > 1 && (
                                <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
                                    <div>
                                        <Text size="sm" fw={500}>Duplicate rows across {quality.sources} files</Text>
                                        <Text size="xs" c="dimmed" lh={1.4}>{quality.conflicts ? `${quality.conflicts} of them disagreed on energy or battery values.` : 'All duplicates agreed on their values.'}</Text>
                                    </div>
                                    <Badge variant="light" color={quality.conflicts ? 'yellow' : 'gray'} size="sm" className="ps-tabular" style={{ flexShrink: 0 }}>{quality.duplicates}</Badge>
                                </Group>
                            )}
                        </Stack>
                    </Box>
                </Grid.Col>
            </Grid>
        </Stack>
    );
}

export default ExploreView;
