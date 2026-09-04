import { useMemo, useState } from 'react';
import { useMediaQuery } from '@mantine/hooks';
import { Accordion, ActionIcon, Anchor, Badge, Box, Button, Grid, Group, List, Modal, NumberInput, SegmentedControl, Select, Slider, Stack, Switch, Table, Tabs, Text, TextInput, Tooltip } from '@mantine/core';
import { TimeInput } from '@mantine/dates';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as ChartTip, XAxis, YAxis } from 'recharts';
import { IconPlus, IconTrash, IconSearch, IconBolt, IconClock, IconStack2, IconInfoCircle, IconCalendarEvent, IconExternalLink, IconCar } from '@tabler/icons-react';
import { useTariff } from '../../hooks/useTariff';
import { useComparison } from '../../hooks/useComparison';
import { VehicleComparison } from '../../services/comparison/VehicleComparison';
import { vehicleGroups } from '../../services/comparison/Vehicles';
import { CostCalculator } from '../../services/cost/CostCalculator';
import { LIMITS, currencyPrefix } from '../../services/cost/TariffModel';
import { findPreset, presetGroups, searchPresets } from '../../services/cost/TariffPresets';
import { useTokens } from '../../theme/useTokens';
import { formatNumber } from '../../utils/format';
import Eyebrow from '../ui/Eyebrow';
import ChartTooltip from '../charts/ChartTooltip';

const DAY_OPTIONS = [{ value: 'all', label: 'Every day' }, { value: 'weekday', label: 'Weekdays' }, { value: 'weekend', label: 'Weekends' }];
const MMDD_RE = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const th = (label) => <Table.Th key={label} style={{ color: 'var(--ps-muted)', fontWeight: 600 }}>{label}</Table.Th>;

function Field({ label, children }) {
    return (
        <div>
            <Text size="xs" c="dimmed" mb={4}>{label}</Text>
            {children}
        </div>
    );
}

/** A 'MM-DD' text field that only commits valid values. */
function MonthDayInput({ value, onChange, ...rest }) {
    const [draft, setDraft] = useState(value);
    const [editing, setEditing] = useState(false);
    const shown = editing ? draft : value;
    return (
        <TextInput
            size="xs"
            w={76}
            placeholder="MM-DD"
            value={shown}
            error={editing && draft !== '' && !MMDD_RE.test(draft)}
            onFocus={() => { setDraft(value); setEditing(true); }}
            onChange={(e) => { const v = e.currentTarget.value; setDraft(v); if (MMDD_RE.test(v)) onChange(v); }}
            onBlur={() => setEditing(false)}
            className="ps-tabular"
            {...rest}
        />
    );
}

/** Editable tier table shared by the default table and each seasonal override. */
function TierTable({ tiers, onChange, compact }) {
    const setTier = (i, key, v) => onChange(tiers.map((t, j) => (j === i ? { ...t, [key]: v } : t)));
    const remove = (i) => onChange(tiers.filter((_, j) => j !== i));
    const add = () => {
        const last = tiers.at(-1);
        const prevCap = tiers.at(-2)?.upToKwh ?? 0;
        onChange([...tiers.slice(0, -1), { upToKwh: prevCap + 300, rate: last.rate }, { upToKwh: null, rate: last.rate * 1.2 }]);
    };
    return (
        <Stack gap="xs">
            <Table fz="xs" verticalSpacing={4} withRowBorders={false}>
                <Table.Thead><Table.Tr>{['Tier', 'Up to (kWh/month)', 'Price per kWh', ''].map(th)}</Table.Tr></Table.Thead>
                <Table.Tbody>
                    {tiers.map((tier, i) => (
                        <Table.Tr key={i}>
                            <Table.Td>{i + 1}</Table.Td>
                            <Table.Td>{tier.upToKwh === null ? <Text size="xs" c="dimmed">and above</Text> : <NumberInput size="xs" value={tier.upToKwh} onChange={(v) => typeof v === 'number' && setTier(i, 'upToKwh', v)} min={1} step={50} w={compact ? 96 : 120} />}</Table.Td>
                            <Table.Td><NumberInput size="xs" value={tier.rate} onChange={(v) => typeof v === 'number' && setTier(i, 'rate', v)} min={0} step={0.01} decimalScale={4} w={compact ? 88 : 100} /></Table.Td>
                            <Table.Td>{tiers.length > 1 && tier.upToKwh !== null && <ActionIcon size="sm" variant="subtle" color="gray" onClick={() => remove(i)} aria-label="Remove tier"><IconTrash size={14} /></ActionIcon>}</Table.Td>
                        </Table.Tr>
                    ))}
                </Table.Tbody>
            </Table>
            <Button size="compact-xs" variant="default" leftSection={<IconPlus size={12} />} style={{ alignSelf: 'flex-end' }} onClick={add} disabled={tiers.length >= LIMITS.tiers}>Add tier</Button>
        </Stack>
    );
}

/**
 * Everything about what electricity costs the user, persisted, with the
 * result of applying it to the current trips beside the inputs. Pricing
 * logic lives in services/cost; this component only edits the model.
 * Presets are JSON files under src/data/tariffs (see docs/TARIFF_PRESETS.md).
 */
function TariffSettingsModal({ opened, onClose, data, distanceUnit = 'km', usableKwh = null }) {
    const t = useTokens();
    const isMobile = useMediaQuery('(max-width: 48em)');
    const [tariff, setTariff] = useTariff();
    const [presetId, setPresetId] = useState(null);
    const unit = distanceUnit === 'mi' ? 'mi' : 'km';
    const symbol = currencyPrefix(tariff.currency);
    const preset = presetId ? findPreset(presetId) : null;
    const hasSeasons = tariff.seasons.length > 0;
    const seasonOptions = [{ value: 'all', label: 'All year' }, ...tariff.seasons.map((s) => ({ value: s.id, label: s.label }))];

    const result = useMemo(() => new CostCalculator(tariff, { distanceUnit }).compute(data || [], { usableKwh }), [tariff, data, distanceUnit, usableKwh]);
    const { vehicle, fuelPrice, setVehicleId, setFuelPrice } = useComparison();
    const comparison = useMemo(
        () => new VehicleComparison({ distanceUnit }).compare(data || [], vehicle, { fuelPrice, evCostPerKwh: result.effectiveRatePerKwh, evCostTotal: result.cost.total }),
        [data, vehicle, fuelPrice, result, distanceUnit]
    );

    const patch = (fn) => setTariff((current) => fn(structuredClone(current)));
    const setPeriod = (i, key, value) => patch((c) => { c.tou.periods[i][key] = value; return c; });
    const removePeriod = (i) => patch((c) => { c.tou.periods.splice(i, 1); if (!c.tou.periods.length) c.tou.periods.push({ id: 'p1', label: 'Off-peak', rate: c.tou.defaultRate, days: 'all', season: 'all', from: '22:00', to: '07:00' }); return c; });
    const addPeriod = () => patch((c) => { c.tou.periods.push({ id: `p${Date.now()}`, label: 'Period', rate: c.tou.defaultRate, days: 'all', season: 'all', from: '00:00', to: '00:00' }); return c; });
    const applyPreset = (id) => {
        const p = findPreset(id);
        if (!p) return;
        setPresetId(id);
        setTariff({ ...p.tariff, currency: p.tariff.currency || tariff.currency });
    };

    const money = (v, d = 2) => `${symbol}${formatNumber(v, d)}`;

    const periodEditor = isMobile ? (
        <Stack gap="xs">
            {tariff.tou.periods.map((p, i) => (
                <Box key={p.id} p="sm" style={{ border: '1px solid var(--ps-border)', borderRadius: 2 }}>
                    <Group gap="xs" wrap="nowrap" align="flex-end">
                        <TextInput size="xs" label="Period" value={p.label} onChange={(e) => setPeriod(i, 'label', e.currentTarget.value)} style={{ flex: 1 }} />
                        <NumberInput size="xs" label="Price per kWh" value={p.rate} onChange={(v) => typeof v === 'number' && setPeriod(i, 'rate', v)} min={0} step={0.01} decimalScale={4} w={110} />
                        <ActionIcon size="lg" variant="subtle" color="gray" onClick={() => removePeriod(i)} aria-label="Remove period"><IconTrash size={16} /></ActionIcon>
                    </Group>
                    <Group gap="xs" wrap="nowrap" mt="xs" grow>
                        <Select size="xs" label="Days" data={DAY_OPTIONS} value={p.days} onChange={(v) => v && setPeriod(i, 'days', v)} allowDeselect={false} />
                        {hasSeasons && <Select size="xs" label="Season" data={seasonOptions} value={p.season} onChange={(v) => v && setPeriod(i, 'season', v)} allowDeselect={false} />}
                    </Group>
                    <Group gap="xs" wrap="nowrap" mt="xs" grow>
                        <TimeInput size="xs" label="From" value={p.from} onChange={(e) => setPeriod(i, 'from', e.currentTarget.value)} />
                        <TimeInput size="xs" label="To" value={p.to} onChange={(e) => setPeriod(i, 'to', e.currentTarget.value)} />
                    </Group>
                </Box>
            ))}
        </Stack>
    ) : (
        <Box className="ps-scroll-x">
            <Table fz="xs" verticalSpacing={3} withRowBorders={false} style={{ minWidth: hasSeasons ? 560 : 470 }}>
                <Table.Thead>
                    <Table.Tr>{['Period', 'Price per kWh', 'Days', ...(hasSeasons ? ['Season'] : []), 'From', 'To', ''].map(th)}</Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {tariff.tou.periods.map((p, i) => (
                        <Table.Tr key={p.id}>
                            <Table.Td><TextInput size="xs" value={p.label} onChange={(e) => setPeriod(i, 'label', e.currentTarget.value)} w={96} /></Table.Td>
                            <Table.Td><NumberInput size="xs" value={p.rate} onChange={(v) => typeof v === 'number' && setPeriod(i, 'rate', v)} min={0} step={0.01} decimalScale={4} w={78} /></Table.Td>
                            <Table.Td><Select size="xs" data={DAY_OPTIONS} value={p.days} onChange={(v) => v && setPeriod(i, 'days', v)} w={100} allowDeselect={false} /></Table.Td>
                            {hasSeasons && <Table.Td><Select size="xs" data={seasonOptions} value={p.season} onChange={(v) => v && setPeriod(i, 'season', v)} w={92} allowDeselect={false} /></Table.Td>}
                            <Table.Td><TimeInput size="xs" value={p.from} onChange={(e) => setPeriod(i, 'from', e.currentTarget.value)} w={80} /></Table.Td>
                            <Table.Td><TimeInput size="xs" value={p.to} onChange={(e) => setPeriod(i, 'to', e.currentTarget.value)} w={80} /></Table.Td>
                            <Table.Td><ActionIcon size="sm" variant="subtle" color="gray" onClick={() => removePeriod(i)} aria-label="Remove period"><IconTrash size={14} /></ActionIcon></Table.Td>
                        </Table.Tr>
                    ))}
                </Table.Tbody>
            </Table>
        </Box>
    );

    const seasonsEditor = (
        <Accordion variant="contained" radius="xs" chevronPosition="left">
            <Accordion.Item value="seasons">
                <Accordion.Control icon={<IconCalendarEvent size={14} style={{ color: 'var(--ps-muted)' }} />}>
                    <Group gap="xs"><Text size="sm" fw={500}>Seasons</Text>{hasSeasons ? <Badge size="xs" variant="light" color="gray">{tariff.seasons.map((s) => s.label).join(' · ')}</Badge> : <Text size="xs" c="dimmed">same schedule all year</Text>}</Group>
                </Accordion.Control>
                <Accordion.Panel>
                    <Stack gap="xs">
                        <Text size="xs" c="dimmed">Some utilities change the schedule or the tier thresholds between summer and winter. Define the seasons here (MM-DD, inclusive; a range may wrap the year end), then pick a season on each period or tier table.</Text>
                        {tariff.seasons.map((s, i) => (
                            <Group key={s.id} gap="xs" wrap="nowrap" align="flex-end">
                                <TextInput size="xs" label={i === 0 ? 'Name' : undefined} value={s.label} onChange={(e) => patch((c) => { c.seasons[i].label = e.currentTarget.value; return c; })} style={{ flex: 1 }} />
                                <MonthDayInput label={i === 0 ? 'From' : undefined} value={s.from} onChange={(v) => patch((c) => { c.seasons[i].from = v; return c; })} />
                                <MonthDayInput label={i === 0 ? 'To' : undefined} value={s.to} onChange={(v) => patch((c) => { c.seasons[i].to = v; return c; })} />
                                <ActionIcon size="lg" variant="subtle" color="gray" onClick={() => patch((c) => { c.seasons.splice(i, 1); return c; })} aria-label="Remove season"><IconTrash size={16} /></ActionIcon>
                            </Group>
                        ))}
                        <Group justify="space-between">
                            <Button size="compact-xs" variant="default" leftSection={<IconPlus size={12} />} disabled={tariff.seasons.length >= LIMITS.seasons} onClick={() => patch((c) => { const n = c.seasons.length + 1; c.seasons.push(n === 1 ? { id: 'summer', label: 'Summer', from: '05-01', to: '10-31' } : n === 2 ? { id: 'winter', label: 'Winter', from: '11-01', to: '04-30' } : { id: `season-${n}`, label: `Season ${n}`, from: '01-01', to: '12-31' }); return c; })}>Add season</Button>
                            {hasSeasons && <Text size="xs" c="dimmed">Days outside every season use the all-year periods and default tiers.</Text>}
                        </Group>
                    </Stack>
                </Accordion.Panel>
            </Accordion.Item>
        </Accordion>
    );

    return (
        <Modal opened={opened} onClose={onClose} title="Electricity, charging and comparison" size={1180} fullScreen={isMobile} radius={0} zIndex={1000}>
            <Grid gap="lg">
                <Grid.Col span={{ base: 12, md: 7 }}>
                    <Stack gap="md">
                        <Group grow align="flex-end" preventGrowOverflow={false}>
                            <Select
                                label="Start from a preset"
                                description="Search a provider, country, province or state; presets are community JSON files"
                                placeholder="ottawa, texas, sweden, ulo…"
                                leftSection={<IconSearch size={14} />}
                                data={presetGroups()}
                                value={presetId}
                                onChange={(id) => id && applyPreset(id)}
                                size="xs"
                                searchable
                                clearable={false}
                                filter={({ search }) => presetGroups(searchPresets(search))}
                                nothingFoundMessage="No preset matches. Add one: docs/TARIFF_PRESETS.md"
                                maxDropdownHeight={280}
                            />
                            <TextInput size="xs" label="Currency label" description="Only for display; leave empty for plain numbers" placeholder="$, EUR, R$ …" value={tariff.currency} maxLength={8} onChange={(e) => patch((c) => { c.currency = e.currentTarget.value; return c; })} w={{ base: '100%', sm: 180 }} style={{ flexGrow: 0 }} />
                        </Group>
                        {preset && (
                            <Text size="xs" c="dimmed" lh={1.5}>
                                <b>{preset.provider}</b> · {preset.region}{preset.effective ? ` · rates effective ${preset.effective}` : ''}
                                {preset.source && <> · <Anchor href={preset.source} target="_blank" rel="noreferrer" size="xs">source <IconExternalLink size={10} style={{ verticalAlign: 'middle' }} /></Anchor></>}
                                {preset.notes ? ` — ${preset.notes}` : ''}
                            </Text>
                        )}

                        <div>
                            <Eyebrow>How you are billed</Eyebrow>
                            <SegmentedControl fullWidth mt={6} size="xs" radius="xs" value={tariff.mode} onChange={(m) => patch((c) => { c.mode = m; return c; })} data={[{ value: 'flat', label: (<Group gap={4} justify="center" wrap="nowrap"><IconBolt size={13} /><span>Flat</span></Group>) }, { value: 'tou', label: (<Group gap={4} justify="center" wrap="nowrap"><IconClock size={13} /><span>Time of use</span></Group>) }, { value: 'tiered', label: (<Group gap={4} justify="center" wrap="nowrap"><IconStack2 size={13} /><span>Tiered</span></Group>) }]} />
                        </div>

                        {tariff.mode === 'flat' && (
                            <NumberInput size="sm" label="Price per kWh" value={tariff.flat.rate} onChange={(v) => typeof v === 'number' && patch((c) => { c.flat.rate = v; return c; })} min={0} step={0.01} decimalScale={4} />
                        )}

                        {tariff.mode === 'tou' && (
                            <Stack gap="sm">
                                {seasonsEditor}
                                <NumberInput size="xs" label="Price per kWh when no period applies" value={tariff.tou.defaultRate} onChange={(v) => typeof v === 'number' && patch((c) => { c.tou.defaultRate = v; return c; })} min={0} step={0.01} decimalScale={4} />
                                {periodEditor}
                                <Group justify="space-between" align="flex-start">
                                    <Text size="xs" c="dimmed" style={{ flex: 1, minWidth: 200 }}>Periods are checked in order; a window that ends before it starts wraps midnight, and equal times mean all day.</Text>
                                    <Button size="compact-xs" variant="default" leftSection={<IconPlus size={12} />} onClick={addPeriod} disabled={tariff.tou.periods.length >= LIMITS.periods}>Add period</Button>
                                </Group>
                            </Stack>
                        )}

                        {tariff.mode === 'tiered' && (
                            <Stack gap="sm">
                                {seasonsEditor}
                                <NumberInput size="xs" label="Household electricity before the car (kWh per month)" description="Consumed first, so the car lands on the right tier" value={tariff.tiered.householdBaselineKwh} onChange={(v) => typeof v === 'number' && patch((c) => { c.tiered.householdBaselineKwh = v; return c; })} min={0} step={10} />
                                {hasSeasons ? (
                                    <Tabs defaultValue="default" variant="outline" radius="xs">
                                        <Tabs.List>
                                            <Tabs.Tab value="default">Default</Tabs.Tab>
                                            {tariff.seasons.map((s) => <Tabs.Tab key={s.id} value={s.id}>{s.label}{tariff.tiered.tiersBySeason[s.id] ? '' : ' · same'}</Tabs.Tab>)}
                                        </Tabs.List>
                                        <Tabs.Panel value="default" pt="sm">
                                            <TierTable tiers={tariff.tiered.tiers} compact={isMobile} onChange={(tiers) => patch((c) => { c.tiered.tiers = tiers; return c; })} />
                                        </Tabs.Panel>
                                        {tariff.seasons.map((s) => (
                                            <Tabs.Panel key={s.id} value={s.id} pt="sm">
                                                <Stack gap="xs">
                                                    <Switch size="sm" color="polestar" label={`Different tiers in ${s.label.toLowerCase()}`} checked={Boolean(tariff.tiered.tiersBySeason[s.id])} onChange={(e) => patch((c) => { if (e.currentTarget.checked) c.tiered.tiersBySeason[s.id] = structuredClone(c.tiered.tiers); else delete c.tiered.tiersBySeason[s.id]; return c; })} />
                                                    {tariff.tiered.tiersBySeason[s.id] && <TierTable tiers={tariff.tiered.tiersBySeason[s.id]} compact={isMobile} onChange={(tiers) => patch((c) => { c.tiered.tiersBySeason[s.id] = tiers; return c; })} />}
                                                </Stack>
                                            </Tabs.Panel>
                                        ))}
                                    </Tabs>
                                ) : (
                                    <TierTable tiers={tariff.tiered.tiers} compact={isMobile} onChange={(tiers) => patch((c) => { c.tiered.tiers = tiers; return c; })} />
                                )}
                            </Stack>
                        )}

                        <Accordion variant="contained" radius="xs" chevronPosition="left" multiple>
                            <Accordion.Item value="comparison">
                                <Accordion.Control icon={<IconCar size={14} style={{ color: 'var(--ps-muted)' }} />}><Text size="sm" fw={500}>Compared with a petrol or hybrid car</Text></Accordion.Control>
                                <Accordion.Panel>
                                    <Stack gap="md">
                                        <Text size="xs" c="dimmed">The CO₂ tile, the story and the Insights table compare your trips with a real car from the US EPA fuel-economy database, on the combined cycle. Plug-in hybrids are modelled as charged every night: the first {vehicle?.electric ? formatNumber(vehicle.electric.rangeKm * (unit === 'mi' ? 0.621371 : 1), 0) : '—'} {unit} of each day electric, the rest on petrol.</Text>
                                        <Group grow align="flex-start">
                                            <Select size="xs" label="Car to compare against" data={vehicleGroups()} value={vehicle?.id ?? null} onChange={(id) => id && setVehicleId(id)} allowDeselect={false} searchable maxDropdownHeight={280} />
                                            <NumberInput size="xs" label={`Fuel price per ${unit === 'mi' ? 'US gallon' : 'litre'}`} description="Leave empty to skip the money comparison" value={fuelPrice ?? ''} onChange={(v) => setFuelPrice(typeof v === 'number' ? v : null)} min={0} step={0.05} decimalScale={3} placeholder="e.g. 1.55" />
                                        </Group>
                                        {vehicle && (
                                            <Text size="xs" c="dimmed">
                                                {vehicle.label}: {vehicle.lPer100km} L/100 km ({vehicle.mpg.combined} mpg combined, {vehicle.co2GPerKm} g CO₂/km){vehicle.electric ? `; electric ${vehicle.electric.kwhPer100km} kWh/100 km for ${vehicle.electric.rangeKm} km` : ''}. Source: <Anchor href={`https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=${vehicle.epaVehicleId}`} target="_blank" rel="noreferrer" size="xs">EPA vehicle {vehicle.epaVehicleId}</Anchor>, read {vehicle.retrieved}.
                                            </Text>
                                        )}
                                        {comparison && (
                                            <Table fz="xs" verticalSpacing={3} withRowBorders={false} className="ps-tabular">
                                                <Table.Tbody>
                                                    <Table.Tr><Table.Td c="dimmed">Fuel it would have burned</Table.Td><Table.Td ta="right">{formatNumber(comparison.fuel, 0)} {comparison.fuelUnit}</Table.Td><Table.Td ta="right" c="dimmed">{comparison.electricSharePct > 0 ? `${comparison.electricSharePct}% of ${unit} on electricity` : `${formatNumber(comparison.petrolKm * (unit === 'mi' ? 0.621371 : 1), 0)} ${unit} on petrol`}</Table.Td></Table.Tr>
                                                    <Table.Tr><Table.Td c="dimmed">Tailpipe CO₂</Table.Td><Table.Td ta="right">{formatNumber(comparison.co2Kg, 0)} kg</Table.Td><Table.Td ta="right" c="dimmed">{comparison.treeYears} tree-years</Table.Td></Table.Tr>
                                                    <Table.Tr><Table.Td c="dimmed">What it would have cost</Table.Td><Table.Td ta="right">{comparison.totalCost === null ? '–' : money(comparison.totalCost)}</Table.Td><Table.Td ta="right" c="dimmed">{comparison.saving === null ? 'needs a fuel price' : `${comparison.saving >= 0 ? 'you saved' : 'you paid more:'} ${money(Math.abs(comparison.saving))}`}</Table.Td></Table.Tr>
                                                </Table.Tbody>
                                            </Table>
                                        )}
                                    </Stack>
                                </Accordion.Panel>
                            </Accordion.Item>
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
                                                <NumberInput size="xs" label="Public price per kWh" value={tariff.publicCharging.rate} onChange={(v) => typeof v === 'number' && patch((c) => { c.publicCharging.rate = v; return c; })} min={0} step={0.05} decimalScale={3} />
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
                                            <NumberInput size="xs" label="Fixed fees per month" description="Standing or delivery charge; shown, not attributed to the car" value={tariff.fixedMonthlyFee} onChange={(v) => typeof v === 'number' && patch((c) => { c.fixedMonthlyFee = v; return c; })} min={0} step={1} />
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
                                        <ChartTip cursor={{ fill: t.accentSoft }} content={<ChartTooltip title={(d) => d?.label} rows={(d) => [{ key: 'cost', label: 'cost', value: money(d.cost), color: t.series[0] }, { key: 'kwh', label: 'kWh', value: d.kwh, color: t.contextStrong }]} />} />
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
