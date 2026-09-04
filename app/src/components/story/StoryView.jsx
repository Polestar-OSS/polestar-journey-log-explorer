import { useMemo, useState } from 'react';
import { Box, Button, Grid, Group, List, SimpleGrid, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { IconArrowRight, IconMapPin, IconCoin, IconChartBar, IconTelescope, IconCheck } from '@tabler/icons-react';
import Eyebrow from '../ui/Eyebrow';
import ChartCard from '../charts/ChartCard';
import ChartTooltip from '../charts/ChartTooltip';
import CostCalculatorModal from '../CostCalculatorModal';
import { StoryBuilder } from '../../services/story/StoryBuilder';
import { ChartDataProcessor } from '../../services/charts/ChartDataProcessor';
import { usePreferences } from '../../hooks/usePreferences';
import { CURRENCY_SYMBOLS } from '../../utils/preferences';
import { useTokens } from '../../theme/useTokens';
import { useCountUp } from '../../hooks/useCountUp';
import { formatNumber } from '../../utils/format';

const processor = new ChartDataProcessor();

function Figure({ value }) {
    const numeric = typeof value === 'number';
    const animated = useCountUp(numeric ? value : 0, 900);
    if (value === null || value === undefined) return null;
    return <>{numeric ? formatNumber(animated, 0) : value}</>;
}

function StoryCard({ card, index, wide, onAction }) {
    const bar = card.tone === 'good' ? 'var(--ps-good)' : card.tone === 'accent' || card.tone === 'warm' ? 'var(--ps-accent)' : 'transparent';
    return (
        <Box className="ps-card ps-rise" p={{ base: 'lg', sm: 'xl' }} style={{ '--i': index, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 200 }}>
            <Box style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: bar }} />
            <Eyebrow>{card.eyebrow}</Eyebrow>
            <Group align="baseline" gap={8} wrap="wrap">
                {card.figure !== null && card.figure !== undefined && (
                    <Text component="span" className={wide ? 'ps-hero-figure' : 'ps-display'} fz={wide ? undefined : { base: 40, sm: 48 }} style={{ lineHeight: 1 }}>
                        <Figure value={card.figure} />
                    </Text>
                )}
                {card.unit && (
                    <Text component="span" c="dimmed" fz={{ base: 'md', sm: 'lg' }}>
                        {card.unit}
                    </Text>
                )}
            </Group>
            <Text fz={{ base: 'lg', sm: 'xl' }} fw={500} lh={1.25} style={{ letterSpacing: '-0.015em' }}>
                {card.headline}
            </Text>
            {card.body && (
                <Text size="sm" c="dimmed" lh={1.55}>
                    {card.body}
                </Text>
            )}
            {card.list && (
                <List spacing={8} size="sm" mt={4} icon={<ThemeIcon size={18} radius="xl" variant="light" color="polestar"><IconCheck size={11} /></ThemeIcon>}>
                    {card.list.map((item) => (
                        <List.Item key={item}>{item}</List.Item>
                    ))}
                </List>
            )}
            {card.action === 'map' && (
                <Button variant="subtle" color="gray" size="compact-sm" mt="auto" style={{ alignSelf: 'flex-start' }} rightSection={<IconArrowRight size={14} />} leftSection={<IconMapPin size={14} />} onClick={() => onAction('map')}>
                    See them on the map
                </Button>
            )}
            {card.action === 'cost' && (
                <Button variant="subtle" color="gray" size="compact-sm" mt="auto" style={{ alignSelf: 'flex-start' }} rightSection={<IconArrowRight size={14} />} leftSection={<IconCoin size={14} />} onClick={() => onAction('cost')}>
                    Use my own electricity price
                </Button>
            )}
        </Box>
    );
}

/**
 * The Simple level: what the log says, in sentences. One idea per card,
 * comparisons people can picture, and three tips derived from the data.
 */
function StoryView({ statistics, insights, data, distanceUnit = 'km', onOpenTab, onChangeLevel }) {
    const t = useTokens();
    const [prefs] = usePreferences();
    const [costOpened, setCostOpened] = useState(false);
    const unit = distanceUnit === 'mi' ? 'mi' : 'km';

    const cards = useMemo(
        () =>
            new StoryBuilder({
                distanceUnit,
                electricityRate: prefs.electricityRate,
                currency: prefs.currency,
                currencySymbol: CURRENCY_SYMBOLS[prefs.currency] ?? '$',
            }).build({ statistics, insights, data }),
        [statistics, insights, data, distanceUnit, prefs.electricityRate, prefs.currency]
    );

    const months = useMemo(() => processor.aggregateByPeriod(data, 'month'), [data]);

    const handleAction = (action) => {
        if (action === 'cost') setCostOpened(true);
        if (action === 'map') onOpenTab?.('map');
    };

    if (!cards.length) return null;
    const [lead, ...rest] = cards;

    return (
        <Stack gap="lg">
            <Box>
                <Eyebrow>In plain words</Eyebrow>
                <Title order={2} className="ps-display" fz={{ base: 28, sm: 36 }} mt={6}>
                    Here is what your log says.
                </Title>
                <Text c="dimmed" size="sm" mt={6} maw={620}>
                    No jargon, no axes. Every number below comes from your own trips, and the filter row above narrows it to any period you like.
                </Text>
            </Box>

            <StoryCard card={lead} index={0} wide onAction={handleAction} />

            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                {rest.map((card, i) => (
                    <StoryCard key={card.id} card={card} index={i + 1} onAction={handleAction} />
                ))}
            </SimpleGrid>

            <Grid gutter="md">
                <Grid.Col span={{ base: 12, lg: 8 }}>
                    <ChartCard eyebrow="Month by month" title={`How far you drove each month, in ${unit}`} description="Taller bars are months with more driving. Empty months are months the app did not record." className="ps-rise" style={{ '--i': rest.length + 1 }}>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={months} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barCategoryGap="22%">
                                <CartesianGrid vertical={false} stroke={t.grid} />
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: t.muted, fontSize: 11 }} interval={Math.max(0, Math.ceil(months.length / 8) - 1)} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: t.muted, fontSize: 11 }} width={48} tickFormatter={(v) => formatNumber(v, 0)} />
                                <Tooltip cursor={{ fill: t.accentSoft }} content={<ChartTooltip title={(d) => d?.label} rows={(d) => [{ key: 'distance', label: unit, value: d.distance, color: t.series[0] }, { key: 'trips', label: 'trips', value: d.trips, color: t.contextStrong }]} />} />
                                <Bar dataKey="distance" name={unit} fill={t.series[0]} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </Grid.Col>
                <Grid.Col span={{ base: 12, lg: 4 }}>
                    <Box className="ps-card ps-rise" p="lg" h="100%" style={{ '--i': rest.length + 2, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <Eyebrow>Want more?</Eyebrow>
                        <Text fw={500} fz="lg" lh={1.25} style={{ letterSpacing: '-0.01em' }}>
                            The same data, two deeper levels.
                        </Text>
                        <Text size="sm" c="dimmed" lh={1.5}>
                            Detailed adds charts, an insights page, the map and a searchable trip table. Expert adds a pivot builder, distributions, a fitted consumption model and a data-quality report.
                        </Text>
                        <Stack gap="xs" mt="auto">
                            <Button variant="default" leftSection={<IconChartBar size={16} />} onClick={() => onChangeLevel?.('detailed')} justify="space-between" rightSection={<IconArrowRight size={14} />}>
                                Switch to Detailed
                            </Button>
                            <Button variant="default" leftSection={<IconTelescope size={16} />} onClick={() => onChangeLevel?.('expert')} justify="space-between" rightSection={<IconArrowRight size={14} />}>
                                Switch to Expert
                            </Button>
                        </Stack>
                    </Box>
                </Grid.Col>
            </Grid>

            <CostCalculatorModal opened={costOpened} onClose={() => setCostOpened(false)} statistics={statistics} distanceUnit={distanceUnit} />
        </Stack>
    );
}

export default StoryView;
