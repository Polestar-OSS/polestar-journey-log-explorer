import { useCallback, useMemo, useState } from 'react';
import { Anchor, Box, Container, Divider, Group, Image, Modal, Stack, Text } from '@mantine/core';
import { IconBrandGithub } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import AppHeader from './components/layout/AppHeader';
import { LOGO_GREY } from './theme/logo';
import Landing from './components/landing/Landing';
import FileDropzone from './components/landing/FileDropzone';
import Dashboard from './components/Dashboard';
import HelpModal from './components/HelpModal';
import { TableExporter } from './services/table/TableDataProcessor';
import { JourneyMerger } from './services/ingest/JourneyMerger';
import { buildSampleJourneyLog } from './utils/sampleData';
import { useExperienceLevel } from './hooks/usePreferences';

const REPO_URL = 'https://github.com/Polestar-OSS/polestar-journey-log-explorer';

// Build columns for CSV export based on distance unit
const getColumns = (distanceUnit) => {
    const distLabel = distanceUnit === 'mi' ? 'mi' : 'km';
    return [
        { key: 'startDate', label: 'Start Date' },
        { key: 'endDate', label: 'End Date' },
        { key: 'startAddress', label: 'Start Address' },
        { key: 'endAddress', label: 'End Address' },
        { key: 'distanceKm', label: `Distance (${distLabel})` },
        { key: 'consumptionKwh', label: 'Consumption (kWh)' },
        { key: 'efficiency', label: `Efficiency (kWh/100${distLabel})` },
        { key: 'durationMin', label: 'Duration (min)' },
        { key: 'avgSpeed', label: `Avg Speed (${distLabel}/h)` },
        { key: 'category', label: 'Category' },
        { key: 'socSource', label: 'SOC Start' },
        { key: 'socDestination', label: 'SOC End' },
        { key: 'socDrop', label: 'SOC Drop' },
        { key: 'startOdometer', label: 'Start Odometer' },
        { key: 'endOdometer', label: 'End Odometer' },
        { key: 'sourceFile', label: 'Source File' },
    ];
};

const tableExporter = new TableExporter();
const merger = new JourneyMerger();

function Footer() {
    return (
        <Box component="footer" mt={64} pt="xl" pb="xl" style={{ borderTop: '1px solid var(--ps-border)' }} className="ps-no-print">
            <Container size="xl" px={{ base: 'sm', sm: 'md' }}>
                <Stack gap="md">
                    <Group justify="space-between" align="center" wrap="wrap" gap="md">
                        <Group gap="sm">
                            <Image src={LOGO_GREY} alt="Polestar OSS" h={44} w="auto" fit="contain" />
                            <div>
                                <Text size="sm" fw={500}>Polestar Journey Log Explorer</Text>
                                <Text size="xs" c="dimmed">A community-driven project</Text>
                            </div>
                        </Group>
                        <Group gap="lg">
                            <Anchor href={REPO_URL} target="_blank" rel="noreferrer" c="dimmed" size="sm">
                                <Group gap={4} wrap="nowrap"><IconBrandGithub size={16} /><span>GitHub</span></Group>
                            </Anchor>
                            <Anchor href={`${REPO_URL}/blob/main/LICENSE`} target="_blank" rel="noreferrer" c="dimmed" size="sm">
                                AGPL-3.0 License
                            </Anchor>
                        </Group>
                    </Group>
                    <Divider color="var(--ps-border)" />
                    <Text size="xs" c="dimmed" ta="center" lh={1.6}>
                        © 2025–2026 Kinn Coelho Juliao · Made with ⚡ by the community.
                        <br />
                        Not affiliated with, endorsed by, or officially connected with Polestar, the Polestar brand, Geely, or any of their subsidiaries.
                    </Text>
                </Stack>
            </Container>
        </Box>
    );
}

/**
 * Application shell. Owns the list of loaded sources (files), merges them
 * into one journey, and exposes export / reset / add-files to the header.
 */
function App() {
    const [sources, setSources] = useState([]); // parsed files, in the order they were added
    const [filteredData, setFilteredData] = useState(null);
    const [helpOpened, setHelpOpened] = useState(false);
    const [addOpened, setAddOpened] = useState(false);
    const [level, setLevel] = useExperienceLevel();

    const journey = useMemo(() => (sources.length ? merger.merge(sources) : null), [sources]);

    const addSources = useCallback((incoming) => {
        setSources((current) => {
            const known = new Set(current.map((s) => s.fileName));
            const fresh = incoming.filter((s) => !known.has(s.fileName));
            const skipped = incoming.length - fresh.length;
            if (skipped > 0) {
                notifications.show({ title: `${skipped} file(s) already loaded`, message: 'A file with the same name is already part of this journey.', color: 'yellow' });
            }
            if (fresh.length === 0) return current;
            const next = [...current, ...fresh];
            const merged = merger.merge(next);
            const dupNote = merged.duplicatesRemoved ? ` · ${merged.duplicatesRemoved.toLocaleString()} duplicate trips removed` : '';
            notifications.show({
                title: `${merged.data.length.toLocaleString()} trips across ${next.length} file${next.length > 1 ? 's' : ''}`,
                message: `${fresh.map((s) => s.fileName).join(', ')}${dupNote}`,
                color: 'polestar',
            });
            return next;
        });
        setAddOpened(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    const handleLoadSample = useCallback(() => {
        const sample = buildSampleJourneyLog();
        setSources([{ ...sample, fileName: 'Sample journey log (synthetic)' }]);
        notifications.show({
            title: 'Sample data loaded',
            message: 'A synthetic year of driving around Gothenburg. Drop your own exports any time.',
            color: 'polestar',
        });
    }, []);

    const handleReset = useCallback(() => {
        setSources([]);
        setFilteredData(null);
    }, []);

    const handleExport = useCallback(() => {
        if (!journey || !filteredData) return;
        const csvContent = tableExporter.exportToCSV(filteredData, getColumns(journey.distanceUnit));
        const filename = `polestar-journey-export-${new Date().toISOString().slice(0, 10)}.csv`;
        tableExporter.downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
        notifications.show({ title: 'Export ready', message: `${filteredData.length} trips written to ${filename}`, color: 'polestar' });
    }, [journey, filteredData]);

    return (
        <Box style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <AppHeader
                hasData={Boolean(journey)}
                onReset={handleReset}
                onExport={handleExport}
                onAddFiles={() => setAddOpened(true)}
                exportCount={filteredData?.length}
                onHelp={() => setHelpOpened(true)}
                level={level}
                onChangeLevel={setLevel}
            />

            <Box component="main" style={{ flex: 1 }}>
                {!journey ? (
                    <Landing onSourcesLoaded={addSources} onLoadSample={handleLoadSample} />
                ) : (
                    <Container size="xl" px={{ base: 'sm', sm: 'md' }} py="lg" className="ps-fade">
                        <Dashboard
                            key={sources.map((s) => s.fileName).join('|')}
                            data={journey.data}
                            distanceUnit={journey.distanceUnit}
                            sources={journey.sources}
                            duplicatesRemoved={journey.duplicatesRemoved}
                            onFilteredChange={setFilteredData}
                            onAddFiles={() => setAddOpened(true)}
                            level={level}
                            onChangeLevel={setLevel}
                        />
                    </Container>
                )}
            </Box>

            <Footer />
            <HelpModal opened={helpOpened} onClose={() => setHelpOpened(false)} />
            <Modal opened={addOpened} onClose={() => setAddOpened(false)} title="Add more exports" size="md">
                <Stack gap="sm">
                    <Text size="sm" c="dimmed">
                        Overlapping date ranges are fine: trips that appear in more than one file are counted once.
                    </Text>
                    <FileDropzone onSourcesLoaded={addSources} compact />
                </Stack>
            </Modal>
        </Box>
    );
}

export default App;
