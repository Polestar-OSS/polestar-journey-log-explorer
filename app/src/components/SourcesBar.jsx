import { Badge, Box, Button, Group, Popover, Stack, Table, Text } from '@mantine/core';
import { IconFiles, IconPlus } from '@tabler/icons-react';
import Eyebrow from './ui/Eyebrow';
import { formatDayLabel } from '../utils/journeyDate';

const span = (s) => (s.firstTs && s.lastTs ? `${formatDayLabel(new Date(s.firstTs))} ${new Date(s.firstTs).getFullYear()} – ${formatDayLabel(new Date(s.lastTs))} ${new Date(s.lastTs).getFullYear()}` : '–');

/**
 * One line that says where the trips came from, with a breakdown per file
 * (rows read, added, duplicates skipped, conflicts) behind a popover.
 */
function SourcesBar({ sources, totalTrips, duplicatesRemoved, distanceUnit, onAddFiles }) {
    if (!sources || sources.length === 0) return null;
    const conflicts = sources.reduce((s, x) => s + (x.conflicts || 0), 0);
    return (
        <Group justify="space-between" wrap="wrap" gap="xs" className="ps-no-print">
            <Group gap="xs" wrap="wrap">
                <IconFiles size={14} style={{ color: 'var(--ps-muted)' }} />
                <Popover width={420} position="bottom-start" shadow="md">
                    <Popover.Target>
                        <Button size="compact-xs" variant="subtle" color="gray">
                            {sources.length} file{sources.length > 1 ? 's' : ''} · {totalTrips.toLocaleString()} trips
                            {duplicatesRemoved > 0 && ` · ${duplicatesRemoved.toLocaleString()} duplicates removed`}
                        </Button>
                    </Popover.Target>
                    <Popover.Dropdown>
                        <Stack gap="sm">
                            <Eyebrow>Loaded exports · distances in {distanceUnit}</Eyebrow>
                            <Box className="ps-scroll-x">
                                <Table fz="xs" verticalSpacing={4} withRowBorders={false} className="ps-tabular">
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th style={{ color: 'var(--ps-muted)' }}>File</Table.Th>
                                            <Table.Th style={{ color: 'var(--ps-muted)', textAlign: 'right' }}>Rows</Table.Th>
                                            <Table.Th style={{ color: 'var(--ps-muted)', textAlign: 'right' }}>Added</Table.Th>
                                            <Table.Th style={{ color: 'var(--ps-muted)', textAlign: 'right' }}>Dupes</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {sources.map((s) => (
                                            <Table.Tr key={s.fileName}>
                                                <Table.Td style={{ maxWidth: 220 }}>
                                                    <Text size="xs" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.fileName}>{s.fileName}</Text>
                                                    <Text size="10px" c="dimmed">{span(s)}{s.distanceUnit !== distanceUnit ? ` · converted from ${s.distanceUnit}` : ''}</Text>
                                                </Table.Td>
                                                <Table.Td style={{ textAlign: 'right' }}>{s.trips}</Table.Td>
                                                <Table.Td style={{ textAlign: 'right' }}>{s.added}</Table.Td>
                                                <Table.Td style={{ textAlign: 'right' }}>{s.duplicates}</Table.Td>
                                            </Table.Tr>
                                        ))}
                                    </Table.Tbody>
                                </Table>
                            </Box>
                            <Text size="xs" c="dimmed">
                                A trip is the same trip when its start time, end time and distance match. The first file to contain it wins.
                                {conflicts > 0 && ` ${conflicts} duplicate(s) disagreed on energy or battery values; the earlier file's values were kept.`}
                            </Text>
                        </Stack>
                    </Popover.Dropdown>
                </Popover>
                {conflicts > 0 && <Badge size="xs" variant="light" color="yellow">{conflicts} conflicts</Badge>}
            </Group>
            {onAddFiles && (
                <Button size="compact-xs" variant="subtle" color="gray" leftSection={<IconPlus size={12} />} onClick={onAddFiles}>
                    Add exports
                </Button>
            )}
        </Group>
    );
}

export default SourcesBar;
