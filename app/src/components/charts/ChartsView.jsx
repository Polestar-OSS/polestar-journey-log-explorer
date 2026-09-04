import { useMemo, useState } from 'react';
import { Grid, SegmentedControl, Group, Text } from '@mantine/core';
import {
    Area,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ComposedChart,
    Legend,
    Line,
    ReferenceLine,
    ResponsiveContainer,
    Scatter,
    ScatterChart,
    Tooltip,
    XAxis,
    YAxis,
    ZAxis,
    LabelList,
} from 'recharts';
import { ChartDataProcessor } from '../../services/charts/ChartDataProcessor';
import { useTokens } from '../../theme/useTokens';
import ChartCard from './ChartCard';
import ChartTooltip from './ChartTooltip';
import { formatNumber } from '../../utils/format';
import Heatmap from './Heatmap';
import { TableToggle, DataTable } from './DataTableToggle';
import { formatDayLabel } from '../../utils/journeyDate';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const axisProps = (t) => ({
    axisLine: false,
    tickLine: false,
    tick: { fill: t.muted, fontSize: 11 },
});

const useTable = () => {
    const [open, setOpen] = useState(false);
    return [open, () => setOpen((o) => !o)];
};

/**
 * Sample the x-axis so labels never collide: show at most ~8 ticks.
 */
const tickInterval = (n, target = 8) => Math.max(0, Math.ceil(n / target) - 1);

function ChartsView({ data, distanceUnit = 'km', insights }) {
    const t = useTokens();
    const processor = useMemo(() => new ChartDataProcessor(), []);
    const unit = distanceUnit === 'mi' ? 'mi' : 'km';
    const effUnit = `kWh/100${unit}`;

    const spanDays = data.length > 1 && data[0].startTs && data[data.length - 1].startTs
        ? (data[data.length - 1].startTs - data[0].startTs) / 86400000
        : 0;
    const defaultGranularity = spanDays > 240 ? 'month' : spanDays > 45 ? 'week' : 'day';

    const [granularityOverride, setGranularity] = useState(null);
    const granularity = granularityOverride ?? defaultGranularity;
    const [metric, setMetric] = useState('distance');
    const [heatMetric, setHeatMetric] = useState('trips');
    const [tsTable, toggleTsTable] = useTable();
    const [effTable, toggleEffTable] = useTable();
    const [seasonTable, toggleSeasonTable] = useTable();
    const [histTable, toggleHistTable] = useTable();
    const [distTable, toggleDistTable] = useTable();
    const [socTable, toggleSocTable] = useTable();
    const [scatterTable, toggleScatterTable] = useTable();

    const series = useMemo(() => processor.aggregateByPeriod(data, granularity), [data, granularity, processor]);
    const trend = useMemo(() => processor.efficiencyTrend(data, distanceUnit, 10), [data, distanceUnit, processor]);
    const effHist = useMemo(() => processor.efficiencyHistogram(data, distanceUnit), [data, distanceUnit, processor]);
    const distHist = useMemo(() => processor.distanceHistogram(data, distanceUnit), [data, distanceUnit, processor]);
    const heat = useMemo(() => processor.weekdayHourHeatmap(data, heatMetric), [data, heatMetric, processor]);
    const soc = useMemo(() => processor.socTimeline(data, 40), [data, processor]);
    const scatter = useMemo(() => processor.efficiencyVsDistance(data, distanceUnit), [data, distanceUnit, processor]);
    const months = insights?.seasonality?.months ?? [];

    const totalDistance = data.reduce((s, x) => s + x.distanceKm, 0);
    const totalConsumption = data.reduce((s, x) => s + x.consumptionKwh, 0);
    const avgEff = totalDistance > 0 ? (totalConsumption / totalDistance) * 100 : null;

    const metricMeta = {
        distance: { label: `Distance (${unit})`, unit, digits: 0 },
        consumption: { label: 'Energy (kWh)', unit: 'kWh', digits: 1 },
        trips: { label: 'Trips', unit: '', digits: 0 },
    }[metric];

    const worstMonth = months.reduce((b, m) => (m.efficiency !== null && m.efficiency > (b?.efficiency ?? -1) ? m : b), null);
    const bestMonth = months.reduce((b, m) => (m.efficiency !== null && m.efficiency < (b?.efficiency ?? Infinity) ? m : b), null);

    const scatterDomain = useMemo(() => {
        if (scatter.length === 0) return [1, 10];
        const min = Math.max(0.5, Math.min(...scatter.map((p) => p.distance)));
        const max = Math.max(...scatter.map((p) => p.distance));
        return [min, max * 1.15];
    }, [scatter]);
    const logTicks = [0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000].filter((v) => v >= scatterDomain[0] && v <= scatterDomain[1]);

    const socMax = Math.max(0, ...soc.map((p) => p.charged));

    return (
        <Grid gap="md">
            {/* Distance / energy / trips over time */}
            <Grid.Col span={12}>
                <ChartCard
                    eyebrow="Over time"
                    title={`${metricMeta.label.replace(/ \(.*\)/, '')} per ${granularity}`}
                    description={granularity === 'day' ? 'One bar per calendar day; empty days stay empty.' : `Calendar ${granularity}s, gaps included, so the shape of the year is honest.`}
                    controls={
                        <Group gap="xs" wrap="nowrap">
                            <SegmentedControl size="xs" radius="xs" value={metric} onChange={setMetric} data={[{ value: 'distance', label: unit }, { value: 'consumption', label: 'kWh' }, { value: 'trips', label: 'Trips' }]} />
                            <SegmentedControl size="xs" radius="xs" value={granularity} onChange={setGranularity} data={[{ value: 'day', label: 'Day' }, { value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }]} />
                            <TableToggle opened={tsTable} onToggle={toggleTsTable} />
                        </Group>
                    }
                    className="ps-rise"
                >
                    {tsTable ? (
                        <DataTable
                            columns={[
                                { key: 'label', label: granularity, align: 'left' },
                                { key: 'trips', label: 'Trips' },
                                { key: 'distance', label: unit, format: (v) => formatNumber(v, 1) },
                                { key: 'consumption', label: 'kWh', format: (v) => formatNumber(v, 1) },
                                { key: 'efficiency', label: effUnit, format: (v) => (v === null ? '–' : formatNumber(v, 1)) },
                            ]}
                            rows={series}
                        />
                    ) : (
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={series} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barCategoryGap="22%">
                                <CartesianGrid vertical={false} stroke={t.grid} />
                                <XAxis dataKey="label" {...axisProps(t)} interval={tickInterval(series.length)} minTickGap={12} />
                                <YAxis {...axisProps(t)} tickFormatter={(v) => formatNumber(v, 0)} width={52} />
                                <Tooltip
                                    cursor={{ fill: t.accentSoft }}
                                    content={
                                        <ChartTooltip
                                            title={(d) => d?.label}
                                            rows={(d) => [
                                                { key: 'distance', label: `distance`, value: d.distance, unit, color: t.series[0] },
                                                { key: 'consumption', label: 'energy', value: d.consumption, unit: 'kWh', color: t.contextStrong },
                                                { key: 'trips', label: 'trips', value: d.trips, color: t.contextStrong },
                                                { key: 'efficiency', label: 'efficiency', value: d.efficiency ?? '–', unit: d.efficiency ? effUnit : '', color: t.contextStrong },
                                            ]}
                                        />
                                    }
                                />
                                <Bar dataKey={metric} name={metricMeta.label} fill={t.series[0]} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={series.length < 200} animationDuration={600} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>
            </Grid.Col>

            {/* Efficiency trend */}
            <Grid.Col span={{ base: 12, lg: 7 }}>
                <ChartCard
                    eyebrow="Efficiency"
                    title="Every trip, and the rolling median"
                    description={`Dots are single trips; the line is the median of the last 10, which shrugs off short-hop spikes. Trips above ${formatNumber(processor.efficiencyCap(distanceUnit), 0)} ${effUnit} are hidden.`}
                    controls={<TableToggle opened={effTable} onToggle={toggleEffTable} />}
                    footer={avgEff ? `Period average ${formatNumber(avgEff, 1)} ${effUnit} (energy ÷ distance, so long trips weigh more).` : null}
                    className="ps-rise"
                    style={{ '--i': 1 }}
                >
                    {effTable ? (
                        <DataTable
                            columns={[
                                { key: 'label', label: 'Trip', align: 'left' },
                                { key: 'distance', label: unit, format: (v) => formatNumber(v, 1) },
                                { key: 'efficiency', label: effUnit, format: (v) => formatNumber(v, 1) },
                                { key: 'rolling', label: 'Rolling median', format: (v) => (v === null ? '–' : formatNumber(v, 1)) },
                            ]}
                            rows={trend}
                        />
                    ) : (
                        <ResponsiveContainer width="100%" height={280}>
                            <ComposedChart data={trend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                                <CartesianGrid vertical={false} stroke={t.grid} />
                                <XAxis dataKey="ts" type="number" domain={['dataMin', 'dataMax']} scale="time" tickFormatter={(v) => formatDayLabel(new Date(v))} {...axisProps(t)} minTickGap={40} />
                                <YAxis {...axisProps(t)} width={40} tickFormatter={(v) => formatNumber(v, 0)} domain={[0, 'auto']} />
                                <Tooltip
                                    cursor={{ stroke: t.axis }}
                                    content={
                                        <ChartTooltip
                                            title={(d) => d?.label}
                                            rows={(d) => [
                                                { key: 'efficiency', label: 'this trip', value: d.efficiency, unit: effUnit, color: t.contextStrong },
                                                { key: 'rolling', label: 'rolling median', value: d.rolling ?? '–', unit: d.rolling ? effUnit : '', color: t.series[0] },
                                                { key: 'distance', label: 'distance', value: d.distance, unit, color: t.contextStrong },
                                            ]}
                                        />
                                    }
                                />
                                {avgEff && <ReferenceLine y={avgEff} stroke={t.axis} strokeWidth={1} label={{ value: `avg ${formatNumber(avgEff, 1)}`, position: 'insideTopRight', fill: t.muted, fontSize: 10 }} />}
                                <Scatter dataKey="efficiency" name="Trip" fill={t.context} shape={(p) => <circle cx={p.cx} cy={p.cy} r={2.5} fill={t.contextStrong} fillOpacity={0.55} />} isAnimationActive={false} />
                                <Line type="monotone" dataKey="rolling" name="Rolling median" stroke={t.series[0]} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: t.surface }} connectNulls isAnimationActive={false} />
                                <Legend iconType="plainline" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>
            </Grid.Col>

            {/* Seasonality */}
            <Grid.Col span={{ base: 12, lg: 5 }}>
                <ChartCard
                    eyebrow="Seasonality"
                    title="Efficiency by month of year"
                    description="All years folded onto one calendar. Heating, cold batteries and winter tyres show up here."
                    controls={<TableToggle opened={seasonTable} onToggle={toggleSeasonTable} />}
                    footer={
                        worstMonth && bestMonth && worstMonth !== bestMonth
                            ? `${MONTHS[worstMonth.month]} costs ${formatNumber(((worstMonth.efficiency - bestMonth.efficiency) / bestMonth.efficiency) * 100, 0)}% more energy per ${unit} than ${MONTHS[bestMonth.month]}.`
                            : null
                    }
                    className="ps-rise"
                    style={{ '--i': 2 }}
                >
                    {seasonTable ? (
                        <DataTable
                            columns={[
                                { key: 'month', label: 'Month', align: 'left', format: (v) => MONTHS[v] },
                                { key: 'trips', label: 'Trips' },
                                { key: 'distance', label: unit, format: (v) => formatNumber(v, 0) },
                                { key: 'efficiency', label: effUnit, format: (v) => (v === null ? '–' : formatNumber(v, 1)) },
                            ]}
                            rows={months}
                        />
                    ) : (
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={months} margin={{ top: 16, right: 8, left: -12, bottom: 0 }} barCategoryGap="25%">
                                <CartesianGrid vertical={false} stroke={t.grid} />
                                <XAxis dataKey="month" tickFormatter={(m) => MONTHS[m][0]} {...axisProps(t)} interval={0} />
                                <YAxis {...axisProps(t)} width={40} tickFormatter={(v) => formatNumber(v, 0)} />
                                <Tooltip
                                    cursor={{ fill: t.accentSoft }}
                                    content={
                                        <ChartTooltip
                                            title={(d) => (d ? MONTHS[d.month] : '')}
                                            rows={(d) => [
                                                { key: 'efficiency', label: effUnit, value: d.efficiency ?? '–', color: t.series[0] },
                                                { key: 'distance', label: unit, value: d.distance, color: t.contextStrong },
                                                { key: 'trips', label: 'trips', value: d.trips, color: t.contextStrong },
                                            ]}
                                        />
                                    }
                                />
                                <Bar dataKey="efficiency" name={effUnit} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false}>
                                    {months.map((m) => (
                                        <Cell key={m.month} fill={worstMonth && m.month === worstMonth.month ? t.series[0] : t.context} />
                                    ))}
                                    <LabelList
                                        dataKey="efficiency"
                                        position="top"
                                        fontSize={10}
                                        fill={t.ink2}
                                        formatter={(v) => v}
                                        content={(p) => {
                                            const isExtreme = p.index === worstMonth?.month || p.index === bestMonth?.month;
                                            if (!isExtreme || p.value === null || p.value === undefined) return null;
                                            return (
                                                <text x={p.x + p.width / 2} y={p.y - 6} textAnchor="middle" fill={t.ink2} fontSize={10} fontWeight={600}>
                                                    {formatNumber(p.value, 1)}
                                                </text>
                                            );
                                        }}
                                    />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>
            </Grid.Col>

            {/* Efficiency histogram */}
            <Grid.Col span={{ base: 12, md: 6 }}>
                <ChartCard
                    eyebrow="Distribution"
                    title="How efficient is a typical trip?"
                    description={`Trips grouped in ${formatNumber(2.5 * (distanceUnit === 'mi' ? 1.60934 : 1), 1)} ${effUnit} bins.`}
                    controls={<TableToggle opened={histTable} onToggle={toggleHistTable} />}
                    footer={effHist.median ? `Median trip ${formatNumber(effHist.median, 1)} ${effUnit}${effHist.outliers ? ` · ${effHist.outliers} extreme short-hop values excluded` : ''}.` : null}
                    className="ps-rise"
                    style={{ '--i': 3 }}
                >
                    {histTable ? (
                        <DataTable columns={[{ key: 'label', label: `From (${effUnit})`, align: 'left' }, { key: 'count', label: 'Trips' }]} rows={effHist.bins} />
                    ) : (
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={effHist.bins} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barCategoryGap={2}>
                                <CartesianGrid vertical={false} stroke={t.grid} />
                                <XAxis dataKey="label" {...axisProps(t)} interval={tickInterval(effHist.bins.length, 10)} />
                                <YAxis {...axisProps(t)} width={40} allowDecimals={false} />
                                <Tooltip cursor={{ fill: t.accentSoft }} content={<ChartTooltip title={(d) => `${d?.x0}–${d?.x1 ?? '∞'} ${effUnit}`} rows={(d) => [{ key: 'count', label: 'trips', value: d.count, color: t.series[0] }]} />} />
                                <Bar dataKey="count" name="Trips" fill={t.series[0]} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>
            </Grid.Col>

            {/* Distance histogram */}
            <Grid.Col span={{ base: 12, md: 6 }}>
                <ChartCard
                    eyebrow="Distribution"
                    title="How long are your trips?"
                    description="Share of trips per distance band."
                    controls={<TableToggle opened={distTable} onToggle={toggleDistTable} />}
                    className="ps-rise"
                    style={{ '--i': 4 }}
                >
                    {distTable ? (
                        <DataTable columns={[{ key: 'label', label: 'Band', align: 'left' }, { key: 'count', label: 'Trips' }, { key: 'share', label: '%', format: (v) => `${v}%` }]} rows={distHist} />
                    ) : (
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={distHist} layout="vertical" margin={{ top: 4, right: 48, left: 8, bottom: 0 }} barCategoryGap={4}>
                                <CartesianGrid horizontal={false} stroke={t.grid} />
                                <XAxis type="number" {...axisProps(t)} tickFormatter={(v) => `${v}%`} domain={[0, 'dataMax']} />
                                <YAxis type="category" dataKey="label" {...axisProps(t)} width={96} tick={{ fill: t.muted, fontSize: 10 }} />
                                <Tooltip cursor={{ fill: t.accentSoft }} content={<ChartTooltip title={(d) => d?.label} rows={(d) => [{ key: 'count', label: 'trips', value: d.count, color: t.series[0] }, { key: 'share', label: 'share', value: `${d.share}%`, color: t.contextStrong }]} />} />
                                <Bar dataKey="share" name="Share" fill={t.series[0]} radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false}>
                                    <LabelList dataKey="count" position="right" fill={t.ink2} fontSize={11} formatter={(v) => (v ? v : '')} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>
            </Grid.Col>

            {/* Weekday × hour heatmap */}
            <Grid.Col span={12}>
                <ChartCard
                    eyebrow="Rhythm"
                    title="When you drive"
                    description="Each cell is one hour of one weekday, summed over the whole period."
                    controls={<SegmentedControl size="xs" radius="xs" value={heatMetric} onChange={setHeatMetric} data={[{ value: 'trips', label: 'Trips' }, { value: 'distance', label: unit }]} />}
                    className="ps-rise"
                    style={{ '--i': 5 }}
                >
                    <div className="ps-scroll-x">
                        <div style={{ minWidth: 560 }}>
                            <Heatmap cells={heat.cells} max={heat.max} unit={heatMetric === 'trips' ? 'trips' : unit} formatValue={(v) => formatNumber(v, heatMetric === 'trips' ? 0 : 0)} />
                        </div>
                    </div>
                </ChartCard>
            </Grid.Col>

            {/* SOC timeline */}
            <Grid.Col span={{ base: 12, lg: 7 }}>
                <ChartCard
                    eyebrow="Battery"
                    title="State of charge, last 40 trips"
                    description="The line is the battery level after each trip; bars mark charge added before a trip."
                    controls={<TableToggle opened={socTable} onToggle={toggleSocTable} />}
                    className="ps-rise"
                    style={{ '--i': 6 }}
                >
                    {socTable ? (
                        <DataTable
                            columns={[
                                { key: 'label', label: 'Trip', align: 'left' },
                                { key: 'start', label: 'Start %' },
                                { key: 'end', label: 'End %' },
                                { key: 'drop', label: 'Used %' },
                                { key: 'charged', label: 'Charged before %' },
                            ]}
                            rows={soc}
                        />
                    ) : (
                        <ResponsiveContainer width="100%" height={260}>
                            <ComposedChart data={soc} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="soc-fill" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={t.series[0]} stopOpacity={0.18} />
                                        <stop offset="100%" stopColor={t.series[0]} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid vertical={false} stroke={t.grid} />
                                <XAxis dataKey="label" {...axisProps(t)} interval={tickInterval(soc.length, 6)} minTickGap={24} />
                                <YAxis {...axisProps(t)} width={46} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                                <Tooltip
                                    cursor={{ stroke: t.axis }}
                                    content={
                                        <ChartTooltip
                                            title={(d) => d?.label}
                                            rows={(d) => [
                                                { key: 'end', label: 'after trip', value: `${d.end}%`, color: t.series[0] },
                                                { key: 'start', label: 'before trip', value: `${d.start}%`, color: t.contextStrong },
                                                ...(d.charged ? [{ key: 'charged', label: 'charged before', value: `+${d.charged}%`, color: t.series[2] }] : []),
                                                { key: 'distance', label: 'distance', value: d.distance, unit, color: t.contextStrong },
                                            ]}
                                        />
                                    }
                                />
                                {socMax > 0 && <Bar dataKey="charged" name="Charge added" fill={t.series[2]} radius={[4, 4, 0, 0]} maxBarSize={12} isAnimationActive={false} />}
                                <Area type="monotone" dataKey="end" name="SOC after trip" stroke={t.series[0]} strokeWidth={2} fill="url(#soc-fill)" dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: t.surface }} isAnimationActive={false} />
                                <Legend iconType="plainline" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>
            </Grid.Col>

            {/* Efficiency vs distance */}
            <Grid.Col span={{ base: 12, lg: 5 }}>
                <ChartCard
                    eyebrow="Correlation"
                    title="Trip length vs efficiency"
                    description="Log scale on distance. Short trips pay the cold-start tax; long ones settle on the car's true number."
                    controls={<TableToggle opened={scatterTable} onToggle={toggleScatterTable} />}
                    className="ps-rise"
                    style={{ '--i': 7 }}
                >
                    {scatterTable ? (
                        <DataTable columns={[{ key: 'distance', label: unit, format: (v) => formatNumber(v, 1) }, { key: 'efficiency', label: effUnit, format: (v) => formatNumber(v, 1) }, { key: 'soc', label: 'SOC used %' }]} rows={scatter.map((p) => ({ ...p, key: p.id }))} />
                    ) : (
                        <ResponsiveContainer width="100%" height={260}>
                            <ScatterChart margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                                <CartesianGrid stroke={t.grid} />
                                <XAxis type="number" dataKey="distance" name={`Distance (${unit})`} scale="log" domain={scatterDomain} ticks={logTicks} {...axisProps(t)} tickFormatter={(v) => formatNumber(v, 0)} />
                                <YAxis type="number" dataKey="efficiency" name={effUnit} {...axisProps(t)} width={40} domain={[0, 'auto']} tickFormatter={(v) => formatNumber(v, 0)} />
                                <ZAxis range={[28, 28]} />
                                <Tooltip cursor={{ stroke: t.axis, strokeDasharray: '2 2' }} content={<ChartTooltip title={() => 'Trip'} rows={(d) => [{ key: 'efficiency', label: effUnit, value: d.efficiency, color: t.series[0] }, { key: 'distance', label: unit, value: d.distance, color: t.contextStrong }, { key: 'soc', label: 'SOC used', value: `${d.soc}%`, color: t.contextStrong }]} />} />
                                {avgEff && <ReferenceLine y={avgEff} stroke={t.axis} strokeWidth={1} />}
                                <Scatter data={scatter} fill={t.series[0]} fillOpacity={0.55} shape={(p) => <circle cx={p.cx} cy={p.cy} r={3.5} fill={t.series[0]} fillOpacity={0.6} stroke={t.surface} strokeWidth={1} />} isAnimationActive={false} />
                            </ScatterChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>
            </Grid.Col>

            <Grid.Col span={12}>
                <Text size="xs" c="dimmed" ta="center" className="ps-no-print">
                    Every chart has a table view (⊞) and reflects the filters above. Hover or focus any mark for exact values.
                </Text>
            </Grid.Col>
        </Grid>
    );
}

export default ChartsView;
