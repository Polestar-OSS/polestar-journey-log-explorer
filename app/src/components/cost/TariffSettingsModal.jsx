import { useEffect, useMemo, useState } from 'react';
import { useMediaQuery } from '@mantine/hooks';
import { Accordion, ActionIcon, Badge, Box, Button, Combobox, Grid, Group, List, Loader, Modal, NumberInput, ScrollArea, SegmentedControl, Select, Slider, Stack, Switch, Table, Text, TextInput, Tooltip, useCombobox } from '@mantine/core';
import { TimeInput } from '@mantine/dates';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as ChartTip, XAxis, YAxis } from 'recharts';
import { IconPlus, IconTrash, IconMapPin, IconBolt, IconClock, IconStack2, IconInfoCircle } from '@tabler/icons-react';
import { useTariff } from '../../hooks/useTariff';
import { CostCalculator } from '../../services/cost/CostCalculator';
import { TARIFF_PRESETS } from '../../services/cost/TariffModel';
import { CURRENCY_SYMBOLS } from '../../utils/preferences';
import { useTokens } from '../../theme/useTokens';
import { formatNumber } from '../../utils/format';
import Eyebrow from '../ui/Eyebrow';
import ChartTooltip from '../charts/ChartTooltip';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'SEK', 'NOK', 'DKK', 'CHF'].map((c) => ({ value: c, label: c }));

/** Rough average residential prices per kWh by country, in local currency (2025–2026). */
const COUNTRY_RATES = {
    'United States': { rate: 0.16, currency: 'USD' }, Canada: { rate: 0.11, currency: 'CAD' }, 'United Kingdom': { rate: 0.27, currency: 'GBP' },
    Germany: { rate: 0.38, currency: 'EUR' }, France: { rate: 0.23, currency: 'EUR' }, Spain: { rate: 0.2, currency: 'EUR' }, Italy: { rate: 0.31, currency: 'EUR' },
    Netherlands: { rate: 0.3, currency: 'EUR' }, Belgium: { rate: 0.3, currency: 'EUR' }, Sweden: { rate: 2.1, currency: 'SEK' }, Norway: { rate: 1.8, currency: 'NOK' },
    Denmark: { rate: 2.6, currency: 'DKK' }, Finland: { rate: 0.19, currency: 'EUR' }, Switzerland: { rate: 0.27, currency: 'CHF' }, Austria: { rate: 0.24, currency: 'EUR' },
    Poland: { rate: 0.18, currency: 'EUR' }, Portugal: { rate: 0.27, currency: 'EUR' }, Ireland: { rate: 0.32, currency: 'EUR' }, Australia: { rate: 0.25, currency: 'AUD' },
    'New Zealand': { rate: 0.23, currency: 'AUD' }, Japan: { rate: 0.26, currency: 'USD' }, 'South Korea': { rate: 0.11, currency: 'USD' }, Brazil: { rate: 0.15, currency: 'USD' },
};

function Field({ label, children }) {
    return (
        <div>
            <Text size="xs" c="dimmed" mb={4}>{label}</Text>
            {children}
        </div>
    );
}

/**
 * Everything about what electricity costs the user, persisted, with the
 * result of applying it to the current trips beside the inputs. Pricing
 * logic lives in services/cost; this component only edits the model.
 */
function TariffSettingsModal({ opened, onClose, data, distanceUnit = 'km', usableKwh = null }) {
    const t = useTokens();
    const isMobile = useMediaQuery('(max-width: 48em)');
    const [tariff, setTariff] = useTariff();
    const unit = distanceUnit === 'mi' ? 'mi' : 'km';
    const symbol = CURRENCY_SYMBOLS[tariff.currency] ?? `${tariff.currency} `;

    const result = useMemo(() => new CostCalculator(tariff, { distanceUnit }).compute(data || [], { usableKwh }), [tariff, data, distanceUnit, usableKwh]);

    const patch = (fn) => setTariff((current) => fn(structuredClone(current)));
    const setPeriod = (i, key, value) => patch((c) => { c.tou.periods[i][key] = value; return c; });
    const setTier = (i, key, value) => patch((c) => { c.tiered.tiers[i][key] = value; return c; });

    // Country lookup (typed city name → Nominatim → country → average rate)
    const combobox = useCombobox();
    const [citySearch, setCitySearch] = useState('');
    const [cityOptions, setCityOptions] = useState([]);
    const [loadingCities, setLoadingCities] = useState(false);
    useEffect(() => {
        if (citySearch.length < 3) return undefined;
        const timer = setTimeout(async () => {
            setLoadingCities(true);
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(citySearch)}&addressdetails=1&limit=5`, { headers: { Accept: 'application/json' } });
                const json = await res.json();
                setCityOptions(json.map((p) => ({ label: p.display_name, country: p.address?.country })));
            } catch {
                setCityOptions([]);
            } finally {
                setLoadingCities(false);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [citySearch]);
    const applyCountry = (label) => {
        const hit = cityOptions.find((o) => o.label === label);
        const rate = hit?.country ? COUNTRY_RATES[hit.country] : null;
        setCitySearch(label);
        if (rate) patch((c) => { c.mode = 'flat'; c.flat.rate = rate.rate; c.currency = rate.currency; return c; });
    };
    const visibleCities = citySearch.length >= 3 ? cityOptions : [];

    const money = (v, d = 2) => `${symbol}${formatNumber(v, d)}`;

    return (
        <Modal opened={opened} onClose={onClose} title="Electricity tariff and charging" size={1080} fullScreen={isMobile} radius={0}>
            <Grid gutter="lg">
                <Grid.Col span={{ base: 12, md: 7 }}>
                    <Stack gap="md">
                        <Group grow align="flex-end">
                            <Select label="Start from a preset" placeholder="Choose…" data={TARIFF_PRESETS.map((p) => ({ value: p.id, label: p.label }))} value={null} onChange={(id) => { const p = TARIFF_PRESETS.find((x) => x.id === id); if (p) setTariff({ ...tariff, ...p.tariff }); }} size="xs" />
                            <Select label="Currency" data={CURRENCIES} value={tariff.currency} onChange={(v) => v && patch((c) => { c.currency = v; return c; })} size="xs" allowDeselect={false} />
                        </Group>

                        <Combobox store={combobox} onOptionSubmit={(v) => { applyCountry(v); combobox.closeDropdown(); }}>
                            <Combobox.Target>
                                <TextInput size="xs" label="Or look up your country's average" placeholder="Type a city…" leftSection={<IconMapPin size={14} />} rightSection={loadingCities ? <Loader size={12} /> : null} value={citySearch} onChange={(e) => { setCitySearch(e.currentTarget.value); combobox.openDropdown(); }} onFocus={() => combobox.openDropdown()} onBlur={() => combobox.closeDropdown()} />
                            </Combobox.Target>
                            <Combobox.Dropdown>
                                <Combobox.Options>
                                    <ScrollArea.Autosize mah={180}>
                                        {visibleCities.length ? visibleCities.map((o) => <Combobox.Option value={o.label} key={o.label}>{o.label}</Combobox.Option>) : <Combobox.Empty>{citySearch.length >= 3 && !loadingCities ? 'No match' : 'Type at least three letters'}</Combobox.Empty>}
                                    </ScrollArea.Autosize>
                                </Combobox.Options>
                            </Combobox.Dropdown>
                        </Combobox>

                        <div>
                            <Eyebrow>How you are billed</Eyebrow>
                            <SegmentedControl fullWidth mt={6} size="xs" radius="xs" value={tariff.mode} onChange={(m) => patch((c) => { c.mode = m; return c; })} data={[{ value: 'flat', label: (<Group gap={4} justify="center"><IconBolt size={13} /><span>Flat</span></Group>) }, { value: 'tou', label: (<Group gap={4} justify="center"><IconClock size={13} /><span>Time of use</span></Group>) }, { value: 'tiered', label: (<Group gap={4} justify="center"><IconStack2 size={13} /><span>Tiered</span></Group>) }]} />
                        </div>

                        {tariff.mode === 'flat' && (
                            <NumberInput size="sm" label={`Price per kWh (${tariff.currency})`} value={tariff.flat.rate} onChange={(v) => typeof v === 'number' && patch((c) => { c.flat.rate = v; return c; })} min={0} step={0.01} decimalScale={4} />
                        )}

                        {tariff.mode === 'tou' && (
                            <Stack gap="sm">
                                <NumberInput size="xs" label={`Price outside every period (${tariff.currency}/kWh)`} value={tariff.tou.defaultRate} onChange={(v) => typeof v === 'number' && patch((c) => { c.tou.defaultRate = v; return c; })} min={0} step={0.01} decimalScale={4} />
                                <Box className="ps-scroll-x">
                                    <Table fz="xs" verticalSpacing={4} withRowBorders={false} style={{ minWidth: 500 }}>
                                        <Table.Thead>
                                            <Table.Tr>
                                                {['Period', `${tariff.currency}/kWh`, 'Days', 'From', 'To', ''].map((h) => <Table.Th key={h} style={{ color: 'var(--ps-muted)', fontWeight: 600 }}>{h}</Table.Th>)}
                                            </Table.Tr>
                                        </Table.Thead>
                                        <Table.Tbody>
                                            {tariff.tou.periods.map((p, i) => (
                                                <Table.Tr key={p.id}>
                                                    <Table.Td><TextInput size="xs" value={p.label} onChange={(e) => setPeriod(i, 'label', e.currentTarget.value)} w={100} /></Table.Td>
                                                    <Table.Td><NumberInput size="xs" value={p.rate} onChange={(v) => typeof v === 'number' && setPeriod(i, 'rate', v)} min={0} step={0.01} decimalScale={4} w={84} /></Table.Td>
                                                    <Table.Td><Select size="xs" data={[{ value: 'all', label: 'Every day' }, { value: 'weekday', label: 'Weekdays' }, { value: 'weekend', label: 'Weekends' }]} value={p.days} onChange={(v) => v && setPeriod(i, 'days', v)} w={104} allowDeselect={false} /></Table.Td>
                                                    <Table.Td><TimeInput size="xs" value={p.from} onChange={(e) => setPeriod(i, 'from', e.currentTarget.value)} w={84} /></Table.Td>
                                                    <Table.Td><TimeInput size="xs" value={p.to} onChange={(e) => setPeriod(i, 'to', e.currentTarget.value)} w={84} /></Table.Td>
                                                    <Table.Td><ActionIcon size="sm" variant="subtle" color="gray" onClick={() => patch((c) => { c.tou.periods.splice(i, 1); if (!c.tou.periods.length) c.tou.periods.push({ id: 'p1', label: 'Off-peak', rate: c.tou.defaultRate, days: 'all', from: '22:00', to: '07:00' }); return c; })} aria-label="Remove period"><IconTrash size={14} /></ActionIcon></Table.Td>
                                                </Table.Tr>
                                            ))}
                                        </Table.Tbody>
                                    </Table>
                                </Box>
                                <Group justify="space-between">
                                    <Text size="xs" c="dimmed">Periods are checked in order; a window that ends before it starts wraps midnight. Weekday/weekend rules do not overlap.</Text>
                                    <Button size="compact-xs" variant="default" leftSection={<IconPlus size={12} />} onClick={() => patch((c) => { c.tou.periods.push({ id: `p${Date.now()}`, label: 'Period', rate: c.tou.defaultRate, days: 'all', from: '00:00', to: '00:00' }); return c; })} disabled={tariff.tou.periods.length >= 8}>Add period</Button>
                                </Group>
                            </Stack>
                        )}

                        {tariff.mode === 'tiered' && (
                            <Stack gap="sm">
                                <NumberInput size="xs" label="Household electricity before the car (kWh per month)" description="Consumed first, so the car lands on the right tier" value={tariff.tiered.householdBaselineKwh} onChange={(v) => typeof v === 'number' && patch((c) => { c.tiered.householdBaselineKwh = v; return c; })} min={0} step={10} />
                                <Table fz="xs" verticalSpacing={4} withRowBorders={false}>
                                    <Table.Thead>
                                        <Table.Tr>{['Tier', 'Up to (kWh/month)', `${tariff.currency}/kWh`, ''].map((h) => <Table.Th key={h} style={{ color: 'var(--ps-muted)', fontWeight: 600 }}>{h}</Table.Th>)}</Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {tariff.tiered.tiers.map((tier, i) => (
                                            <Table.Tr key={i}>
                                                <Table.Td>{i + 1}</Table.Td>
                                                <Table.Td>{tier.upToKwh === null ? <Text size="xs" c="dimmed">and above</Text> : <NumberInput size="xs" value={tier.upToKwh} onChange={(v) => typeof v === 'number' && setTier(i, 'upToKwh', v)} min={1} step={50} w={120} />}</Table.Td>
                                                <Table.Td><NumberInput size="xs" value={tier.rate} onChange={(v) => typeof v === 'number' && setTier(i, 'rate', v)} min={0} step={0.01} decimalScale={4} w={100} /></Table.Td>
                                                <Table.Td>{tariff.tiered.tiers.length > 1 && tier.upToKwh !== null && <ActionIcon size="sm" variant="subtle" color="gray" onClick={() => patch((c) => { c.tiered.tiers.splice(i, 1); return c; })} aria-label="Remove tier"><IconTrash size={14} /></ActionIcon>}</Table.Td>
                                            </Table.Tr>
                                        ))}
                                    </Table.Tbody>
                                </Table>
                                <Button size="compact-xs" variant="default" leftSection={<IconPlus size={12} />} style={{ alignSelf: 'flex-end' }} onClick={() => patch((c) => { const last = c.tiered.tiers.pop(); const prevCap = c.tiered.tiers.at(-1)?.upToKwh ?? 0; c.tiered.tiers.push({ upToKwh: prevCap + 300, rate: last.rate }, { upToKwh: null, rate: last.rate * 1.2 }); return c; })} disabled={tariff.tiered.tiers.length >= 6}>Add tier</Button>
                            </Stack>
                        )}

                        <Accordion variant="contained" radius="xs" chevronPosition="left">
                            <Accordion.Item value="charging">
                                <Accordion.Control><Text size="sm" fw={500}>Charging habits</Text></Accordion.Control>
                                <Accordion.Panel>
                                    <Stack gap="md">
                                        <Switch size="sm" color="polestar" label="Some charging is public" checked={tariff.publicCharging.enabled} onChange={(e) => patch((c) => { c.publicCharging.enabled = e.currentTarget.checked; return c; })} />
                                        {tariff.publicCharging.enabled && (
                                            <Group grow align="flex-start">
                                                <Field label={`Share of energy charged publicly: ${tariff.publicCharging.sharePct}%`}>
                                                    <Slider size="sm" color="polestar" min={0} max={100} step={5} value={tariff.publicCharging.sharePct} onChange={(v) => patch((c) => { c.publicCharging.sharePct = v; return c; })} label={(v) => `${v}%`} />
                                                </Field>
                                                <NumberInput size="xs" label={`Public price (${tariff.currency}/kWh)`} value={tariff.publicCharging.rate} onChange={(v) => typeof v === 'number' && patch((c) => { c.publicCharging.rate = v; return c; })} min={0} step={0.05} decimalScale={3} />
                                            </Group>
                                        )}
                                        <Group grow align="flex-start">
                                            <NumberInput size="xs" label="Charging losses at home (%)" description="Wall to battery; 8–15% is typical on AC" value={tariff.chargingLossPct} onChange={(v) => typeof v === 'number' && patch((c) => { c.chargingLossPct = v; return c; })} min={0} max={50} step={1} />
                                            <NumberInput size="xs" label="Home charger power (kW)" value={tariff.homeCharger.powerKw} onChange={(v) => typeof v === 'number' && patch((c) => { c.homeCharger.powerKw = v; return c; })} min={0.5} max={350} step={0.1} decimalScale={1} />
                                        </Group>
                                        <Group grow align="flex-start">
                                            <Select size="xs" label="When does home charging happen?" description="Matters for time-of-use pricing" data={[{ value: 'cheapest', label: 'Cheapest hours first (smart charging)' }, { value: 'plugin', label: 'As soon as I plug in' }, { value: 'window', label: 'In my preferred window' }]} value={tariff.homeCharger.strategy} onChange={(v) => v && patch((c) => { c.homeCharger.strategy = v; return c; })} allowDeselect={false} />
                                            <Group grow>
                                                <TimeInput size="xs" label="Window from" value={tariff.homeChargingWindow.from} onChange={(e) => patch((c) => { c.homeChargingWindow.from = e.currentTarget.value; return c; })} />
                                                <TimeInput size="xs" label="to" value={tariff.homeChargingWindow.to} onChange={(e) => patch((c) => { c.homeChargingWindow.to = e.currentTarget.value; return c; })} />
                                            </Group>
                                        </Group>
                                        <Group grow align="flex-start">
                                            <NumberInput size="xs" label="Usable battery (kWh)" description={usableKwh ? `Leave empty to use the ${formatNumber(usableKwh, 0)} kWh estimated from your trips` : 'Leave empty for the default'} value={tariff.batteryUsableKwh ?? ''} onChange={(v) => patch((c) => { c.batteryUsableKwh = typeof v === 'number' ? v : null; return c; })} min={10} max={300} step={1} placeholder={usableKwh ? formatNumber(usableKwh, 0) : '79'} />
                                            <NumberInput size="xs" label={`Fixed fees (${tariff.currency}/month)`} description="Standing charge; shown, not attributed to the car" value={tariff.fixedMonthlyFee} onChange={(v) => typeof v === 'number' && patch((c) => { c.fixedMonthlyFee = v; return c; })} min={0} step={1} />
                                        </Group>
                                    </Stack>
                                </Accordion.Panel>
                            </Accordion.Item>
                        </Accordion>
                    </Stack>
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 5 }}>
                    <Box className="ps-card" p="md" h="100%" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <Group justify="space-between" align="flex-start">
                            <div>
                                <Eyebrow>Cost of this selection</Eyebrow>
                                <Text className="ps-display" fz={40} mt={4}>{money(result.cost.total, 0)}</Text>
                            </div>
                            <Badge variant="light" color="gray" size="sm">{result.method === 'sessions' ? `${result.sessionsUsed} sessions` : result.method}</Badge>
                        </Group>
                        <Table fz="xs" verticalSpacing={3} withRowBorders={false} className="ps-tabular">
                            <Table.Tbody>
                                <Table.Tr><Table.Td c="dimmed">Home charging</Table.Td><Table.Td ta="right">{money(result.cost.home)}</Table.Td><Table.Td ta="right" c="dimmed">{formatNumber(result.energy.homeWall, 0)} kWh from the wall</Table.Td></Table.Tr>
                                <Table.Tr><Table.Td c="dimmed">Public charging</Table.Td><Table.Td ta="right">{money(result.cost.public)}</Table.Td><Table.Td ta="right" c="dimmed">{formatNumber(result.energy.public, 0)} kWh</Table.Td></Table.Tr>
                                <Table.Tr><Table.Td c="dimmed">Effective price</Table.Td><Table.Td ta="right">{result.effectiveRatePerKwh === null ? '–' : money(result.effectiveRatePerKwh, 3)}</Table.Td><Table.Td ta="right" c="dimmed">per kWh driven</Table.Td></Table.Tr>
                                <Table.Tr><Table.Td c="dimmed">Per 100 {unit}</Table.Td><Table.Td ta="right">{result.costPer100 === null ? '–' : money(result.costPer100)}</Table.Td><Table.Td ta="right" c="dimmed">per trip {result.costPerTrip === null ? '–' : money(result.costPerTrip)}</Table.Td></Table.Tr>
                                {result.cost.fixedFees > 0 && <Table.Tr><Table.Td c="dimmed">Fixed fees over the period</Table.Td><Table.Td ta="right">{money(result.cost.fixedFees)}</Table.Td><Table.Td ta="right" c="dimmed">not in the total</Table.Td></Table.Tr>}
                            </Table.Tbody>
                        </Table>

                        {result.byPeriod.length > 0 && (
                            <div>
                                <Eyebrow style={{ fontSize: 10 }}>By rate</Eyebrow>
                                <Table fz="xs" verticalSpacing={2} withRowBorders={false} className="ps-tabular" mt={4}>
                                    <Table.Tbody>
                                        {result.byPeriod.map((p) => (
                                            <Table.Tr key={p.id}><Table.Td>{p.label}</Table.Td><Table.Td ta="right" c="dimmed">{money(p.rate, 3)}</Table.Td><Table.Td ta="right">{formatNumber(p.kwh, 0)} kWh</Table.Td><Table.Td ta="right">{money(p.cost)}</Table.Td><Table.Td ta="right" c="dimmed">{p.sharePct}%</Table.Td></Table.Tr>
                                        ))}
                                    </Table.Tbody>
                                </Table>
                            </div>
                        )}

                        {result.byMonth.length > 1 && (
                            <div>
                                <Eyebrow style={{ fontSize: 10 }}>By month</Eyebrow>
                                <ResponsiveContainer width="100%" height={120}>
                                    <BarChart data={result.byMonth} margin={{ top: 6, right: 4, left: -20, bottom: 0 }} barCategoryGap="25%">
                                        <CartesianGrid vertical={false} stroke={t.grid} />
                                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: t.muted, fontSize: 10 }} interval="preserveStartEnd" minTickGap={28} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: t.muted, fontSize: 10 }} tickFormatter={(v) => formatNumber(v, 0)} />
                                        <ChartTip cursor={{ fill: t.accentSoft }} content={<ChartTooltip title={(d) => d?.label} rows={(d) => [{ key: 'cost', label: tariff.currency, value: d.cost, color: t.series[0] }, { key: 'kwh', label: 'kWh', value: d.kwh, color: t.contextStrong }]} />} />
                                        <Bar dataKey="cost" fill={t.series[0]} radius={[3, 3, 0, 0]} maxBarSize={18} isAnimationActive={false} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {result.assumptions.length > 0 && (
                            <Box mt="auto">
                                <Group gap={4}><IconInfoCircle size={12} style={{ color: 'var(--ps-muted)' }} /><Eyebrow style={{ fontSize: 10 }}>Assumptions</Eyebrow></Group>
                                <List size="xs" spacing={2} mt={4} c="dimmed">
                                    {result.assumptions.map((a) => <List.Item key={a}>{a}</List.Item>)}
                                </List>
                            </Box>
                        )}
                        <Tooltip label="Settings are saved in this browser as you change them">
                            <Text size="10px" c="dimmed">Saved automatically · used by the Simple story and the cost tile</Text>
                        </Tooltip>
                    </Box>
                </Grid.Col>
            </Grid>
        </Modal>
    );
}

export default TariffSettingsModal;
