import { useMemo, useState } from 'react';
import { ActionIcon, Badge, Box, Group, Pagination, ScrollArea, Select, Stack, Table, Text, TextInput, Tooltip, UnstyledButton } from '@mantine/core';
import { IconSearch, IconNote, IconTag, IconChevronUp, IconChevronDown, IconSelector } from '@tabler/icons-react';
import TripNotesModal from '../TripNotesModal';
import { generateTripId, getTripAnnotation } from '../../utils/tripAnnotations';
import { TableDataProcessor } from '../../services/table/TableDataProcessor';
import { efficiencyStatus } from '../../theme/tokens';
import { formatDuration } from '../../utils/journeyDate';
import { formatNumber } from '../../utils/format';
import Eyebrow from '../ui/Eyebrow';

const STATUS_COLOR = { good: 'green', ok: 'yellow', poor: 'orange', bad: 'red', unknown: 'gray' };
const STATUS_LABEL = { good: 'efficient', ok: 'typical', poor: 'high', bad: 'very high', unknown: '–' };

function SortableTh({ label, field, sortBy, sortOrder, onSort, align = 'right', width }) {
    const active = sortBy === field;
    const Icon = active ? (sortOrder === 'asc' ? IconChevronUp : IconChevronDown) : IconSelector;
    return (
        <Table.Th style={{ textAlign: align, width, whiteSpace: 'nowrap' }}>
            <UnstyledButton onClick={() => onSort(field)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: active ? 'var(--ps-ink)' : 'var(--ps-muted)' }}>
                <Eyebrow style={{ color: 'inherit' }}>{label}</Eyebrow>
                <Icon size={12} />
            </UnstyledButton>
        </Table.Th>
    );
}

function TableView({ data, distanceUnit = 'km' }) {
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('startTs');
    const [sortOrder, setSortOrder] = useState('desc');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState('50');
    const [modalOpened, setModalOpened] = useState(false);
    const [selectedTrip, setSelectedTrip] = useState(null);
    const [annotationVersion, setAnnotationVersion] = useState(0);

    const unit = distanceUnit === 'mi' ? 'mi' : 'km';
    const dataProcessor = useMemo(() => new TableDataProcessor(), []);

    const processed = useMemo(() => {
        const filtered = dataProcessor.filterData(data, search, ['startAddress', 'endAddress', 'startDate', 'category']);
        return dataProcessor.sortData(filtered, sortBy, sortOrder);
    }, [data, search, sortBy, sortOrder, dataProcessor]);

    const size = parseInt(pageSize);
    const totalPages = Math.max(1, Math.ceil(processed.length / size));
    const currentPage = Math.min(page, totalPages);
    const pageRows = processed.slice((currentPage - 1) * size, currentPage * size);

    const handleSort = (field) => {
        setPage(1);
        if (sortBy === field) setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
        else {
            setSortBy(field);
            setSortOrder('desc');
        }
    };

    const openNotes = (trip) => {
        setSelectedTrip(trip);
        setModalOpened(true);
    };

    return (
        <Box className="ps-card ps-rise" p={{ base: 'sm', sm: 'md' }}>
            <Stack gap="sm">
                <Group gap="sm" wrap="wrap" align="center">
                    <TextInput size="xs" placeholder="Search address, date or category" leftSection={<IconSearch size={14} />} value={search} onChange={(e) => { setSearch(e.currentTarget.value); setPage(1); }} style={{ flex: 1, minWidth: 220 }} />
                    <Select size="xs" value={pageSize} onChange={(v) => { setPageSize(v); setPage(1); }} data={['25', '50', '100', '250']} w={90} aria-label="Rows per page" />
                    <Text size="xs" c="dimmed" className="ps-tabular">
                        {processed.length.toLocaleString()} of {data.length.toLocaleString()} trips
                    </Text>
                </Group>

                <ScrollArea type="auto" offsetScrollbars>
                    <Table highlightOnHover withRowBorders verticalSpacing={8} horizontalSpacing="sm" fz="sm" style={{ minWidth: 980, borderColor: 'var(--ps-border)' }} className="ps-tabular">
                        <Table.Thead>
                            <Table.Tr>
                                <SortableTh label="Date" field="startTs" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} align="left" />
                                <Table.Th style={{ textAlign: 'left' }}><Eyebrow>Route</Eyebrow></Table.Th>
                                <SortableTh label={unit} field="distanceKm" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                                <SortableTh label="Time" field="durationMin" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                                <SortableTh label={`${unit}/h`} field="avgSpeed" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                                <SortableTh label="kWh" field="consumptionKwh" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                                <SortableTh label={`kWh/100${unit}`} field="efficiency" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                                <SortableTh label="Battery" field="socDrop" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} align="left" width={150} />
                                <Table.Th style={{ textAlign: 'right' }}><Eyebrow>Notes</Eyebrow></Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {pageRows.map((trip) => {
                                const annotation = getTripAnnotation(generateTripId(trip));
                                const hasNotes = annotation.notes?.length > 0;
                                const hasTags = annotation.tags?.length > 0;
                                const status = efficiencyStatus(trip.efficiency, distanceUnit);
                                const [day, time] = trip.startDate.split(',').map((s) => s.trim());
                                return (
                                    <Table.Tr key={trip.id} style={{ borderColor: 'var(--ps-border)' }}>
                                        <Table.Td style={{ whiteSpace: 'nowrap' }}>
                                            <Text size="sm" fw={500}>{day}</Text>
                                            <Text size="xs" c="dimmed">{time}</Text>
                                        </Table.Td>
                                        <Table.Td style={{ maxWidth: 320 }}>
                                            <Text size="xs" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={trip.startAddress}>{trip.startAddress}</Text>
                                            <Text size="xs" c="dimmed" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={trip.endAddress}>→ {trip.endAddress}</Text>
                                        </Table.Td>
                                        <Table.Td style={{ textAlign: 'right' }}>{formatNumber(trip.distanceKm, 1)}</Table.Td>
                                        <Table.Td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{trip.durationMin !== null ? formatDuration(trip.durationMin) : '–'}</Table.Td>
                                        <Table.Td style={{ textAlign: 'right' }}>{trip.avgSpeed ?? '–'}</Table.Td>
                                        <Table.Td style={{ textAlign: 'right' }}>{formatNumber(trip.consumptionKwh, 2)}</Table.Td>
                                        <Table.Td style={{ textAlign: 'right' }}>
                                            <Tooltip label={STATUS_LABEL[status]}>
                                                <Badge variant="light" color={STATUS_COLOR[status]} size="sm" style={{ minWidth: 52 }}>
                                                    {formatNumber(trip.efficiency, 1)}
                                                </Badge>
                                            </Tooltip>
                                        </Table.Td>
                                        <Table.Td>
                                            <Group gap={6} wrap="nowrap">
                                                <Text size="xs" style={{ width: 62, whiteSpace: 'nowrap' }}>{trip.socSource}% → {trip.socDestination}%</Text>
                                                <Box style={{ flex: 1, height: 4, background: 'var(--ps-grid)', borderRadius: 2, position: 'relative', overflow: 'hidden' }} aria-hidden>
                                                    <Box style={{ position: 'absolute', left: `${Math.max(0, Math.min(100, trip.socDestination))}%`, width: `${Math.max(0, Math.min(100 - trip.socDestination, trip.socDrop))}%`, top: 0, bottom: 0, background: 'var(--ps-accent)' }} />
                                                </Box>
                                            </Group>
                                        </Table.Td>
                                        <Table.Td style={{ textAlign: 'right' }}>
                                            <Group gap={4} justify="flex-end" wrap="nowrap">
                                                {hasTags && (
                                                    <Tooltip label={annotation.tags.join(', ')}>
                                                        <Badge size="xs" variant="outline" color="gray" leftSection={<IconTag size={10} />}>{annotation.tags.length}</Badge>
                                                    </Tooltip>
                                                )}
                                                <Tooltip label={hasNotes ? annotation.notes.substring(0, 120) : 'Add notes or tags'} multiline w={240}>
                                                    <ActionIcon variant={hasNotes || hasTags ? 'light' : 'subtle'} color={hasNotes || hasTags ? 'polestar' : 'gray'} size="sm" onClick={() => openNotes(trip)} aria-label="Notes and tags">
                                                        <IconNote size={14} />
                                                    </ActionIcon>
                                                </Tooltip>
                                            </Group>
                                        </Table.Td>
                                    </Table.Tr>
                                );
                            })}
                        </Table.Tbody>
                    </Table>
                </ScrollArea>

                {totalPages > 1 && (
                    <Group justify="space-between" wrap="wrap">
                        <Text size="xs" c="dimmed" className="ps-tabular">
                            Page {currentPage} of {totalPages}
                        </Text>
                        <Pagination size="xs" radius="xs" color="polestar" value={currentPage} onChange={setPage} total={totalPages} siblings={1} boundaries={1} />
                    </Group>
                )}
            </Stack>

            <TripNotesModal
                key={`${selectedTrip?.id ?? 'none'}-${annotationVersion}`}
                opened={modalOpened}
                onClose={() => setModalOpened(false)}
                trip={selectedTrip}
                tripId={selectedTrip ? generateTripId(selectedTrip) : null}
                distanceUnit={distanceUnit}
                onSave={() => setAnnotationVersion((v) => v + 1)}
            />
        </Box>
    );
}

export default TableView;
