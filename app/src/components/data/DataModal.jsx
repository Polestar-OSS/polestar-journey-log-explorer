import { useState } from 'react';
import { Alert, Badge, Box, Button, Checkbox, Divider, FileButton, Group, Modal, Stack, Switch, Table, Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconDatabase, IconDownload, IconUpload, IconTrash, IconAlertTriangle, IconFileSpreadsheet, IconSettings } from '@tabler/icons-react';
import { usePreferences } from '../../hooks/usePreferences';
import { formatNumber } from '../../utils/format';
import Eyebrow from '../ui/Eyebrow';

const kb = (bytes) => `${formatNumber(bytes / 1024, 0)} KB`;

function ConfirmModal({ opened, onClose, title, children, confirmLabel, onConfirm }) {
    const [ack, setAck] = useState(false);
    return (
        <Modal opened={opened} onClose={() => { setAck(false); onClose(); }} title={title} size="md" radius={0}>
            <Stack gap="md">
                <Alert color="red" icon={<IconAlertTriangle size={16} />} variant="light" radius="xs">{children}</Alert>
                <Checkbox color="red" label="I understand this cannot be undone" checked={ack} onChange={(e) => setAck(e.currentTarget.checked)} />
                <Group justify="flex-end">
                    <Button variant="subtle" color="gray" onClick={() => { setAck(false); onClose(); }}>Keep it</Button>
                    <Button color="red" disabled={!ack} leftSection={<IconTrash size={14} />} onClick={() => { setAck(false); onConfirm(); }}>{confirmLabel}</Button>
                </Group>
            </Stack>
        </Modal>
    );
}

/**
 * Your data and settings: whether the de-duplicated journey stays in this
 * browser, what is stored, exports (journey as a Journey Log CSV, settings as
 * JSON), settings import, and a danger zone with confirmations. All storage
 * operations live in services/persistence; this component only calls them.
 */
function DataModal({ opened, onClose, journey, saved, onExportJourney, onExportSettings, onImportSettings, onClearSaved, onClearAll }) {
    const isMobile = useMediaQuery('(max-width: 48em)');
    const [prefs, update] = usePreferences();
    const [confirm, setConfirm] = useState(null); // 'saved' | 'all'
    const persist = prefs.persistJourney !== false;

    return (
        <>
            <Modal opened={opened} onClose={onClose} title="Your data and settings" size="lg" fullScreen={isMobile} radius={0}>
                <Stack gap="lg">
                    <Box>
                        <Eyebrow>In this browser</Eyebrow>
                        <Switch mt={8} size="sm" color="polestar" label="Keep my journey in this browser" description="The de-duplicated trips are saved in this browser's IndexedDB after every upload and reopen automatically. Nothing is sent anywhere." checked={persist} onChange={(e) => update('persistJourney', e.currentTarget.checked)} />
                        {saved ? (
                            <Table fz="xs" verticalSpacing={3} withRowBorders={false} mt="sm" className="ps-tabular">
                                <Table.Tbody>
                                    <Table.Tr><Table.Td c="dimmed">Saved trips</Table.Td><Table.Td>{saved.trips.toLocaleString()} · {saved.distanceUnit}</Table.Td></Table.Tr>
                                    <Table.Tr><Table.Td c="dimmed">From files</Table.Td><Table.Td>{saved.sources.length ? saved.sources.map((s) => s.fileName).join(', ') : '–'}</Table.Td></Table.Tr>
                                    <Table.Tr><Table.Td c="dimmed">Last saved</Table.Td><Table.Td>{saved.savedAt ? new Date(saved.savedAt).toLocaleString() : '–'}</Table.Td></Table.Tr>
                                    <Table.Tr><Table.Td c="dimmed">Size</Table.Td><Table.Td>{kb(saved.bytes)} in this browser's IndexedDB (hundreds of MB available)</Table.Td></Table.Tr>
                                </Table.Tbody>
                            </Table>
                        ) : (
                            <Text size="xs" c="dimmed" mt="sm">Nothing saved yet{persist ? '; the next upload will be' : ''}.</Text>
                        )}
                    </Box>

                    <Divider />

                    <Box>
                        <Eyebrow>Export</Eyebrow>
                        <Group mt={8} gap="sm" wrap="wrap">
                            <Button size="xs" variant="default" leftSection={<IconFileSpreadsheet size={14} />} onClick={onExportJourney} disabled={!journey && !saved}>
                                Journey as CSV{journey ? ` · ${journey.data.length.toLocaleString()} trips` : saved ? ` · ${saved.trips.toLocaleString()} saved trips` : ''}
                            </Button>
                            <Button size="xs" variant="default" leftSection={<IconSettings size={14} />} onClick={onExportSettings}>Settings as JSON</Button>
                            <FileButton onChange={onImportSettings} accept="application/json,.json">
                                {(props) => <Button size="xs" variant="default" leftSection={<IconUpload size={14} />} {...props}>Import settings</Button>}
                            </FileButton>
                        </Group>
                        <Text size="xs" c="dimmed" mt={6}>
                            The CSV has the same columns as the Journey Log export, de-duplicated across every file you added and in your display unit, so it opens anywhere the original does and re-imports here. Settings cover level, units, tariff, comparison car, fuel price, this switch, and your trip notes and tags.
                        </Text>
                    </Box>

                    <Divider />

                    <Box>
                        <Group gap="xs"><Eyebrow>Danger zone</Eyebrow><Badge size="xs" color="red" variant="light">irreversible</Badge></Group>
                        <Group mt={8} gap="sm" wrap="wrap">
                            <Button size="xs" color="red" variant="outline" leftSection={<IconDatabase size={14} />} onClick={() => setConfirm('saved')} disabled={!saved}>Delete saved journey</Button>
                            <Button size="xs" color="red" variant="outline" leftSection={<IconTrash size={14} />} onClick={() => setConfirm('all')}>Delete everything</Button>
                        </Group>
                        <Text size="xs" c="dimmed" mt={6}>"Everything" is the saved journey, settings, trip notes and tags, and the cached road routes. Export first if you want any of it back.</Text>
                    </Box>

                    <Button onClick={onClose} variant="default" fullWidth leftSection={<IconDownload size={14} style={{ visibility: 'hidden' }} />}>Done</Button>
                </Stack>
            </Modal>

            <ConfirmModal opened={confirm === 'saved'} onClose={() => setConfirm(null)} title="Delete the saved journey?" confirmLabel="Delete saved journey" onConfirm={() => { setConfirm(null); onClearSaved(); }}>
                {saved ? `${saved.trips.toLocaleString()} trips from ${saved.sources.length || 'your'} file${saved.sources.length === 1 ? '' : 's'} will be removed from this browser. ` : ''}The loaded journey closes and you return to the start page; your settings stay. You can upload the files again any time.
            </ConfirmModal>
            <ConfirmModal opened={confirm === 'all'} onClose={() => setConfirm(null)} title="Delete everything this app stored?" confirmLabel="Delete everything" onConfirm={() => { setConfirm(null); onClearAll(); }}>
                The saved journey, every setting (tariff, comparison car, units, level), trip notes and tags, and the cached road routes will be removed from this browser, and the page will reload as if you had never been here.
            </ConfirmModal>
        </>
    );
}

export default DataModal;
