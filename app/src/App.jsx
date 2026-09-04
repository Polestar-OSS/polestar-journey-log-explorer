import { useCallback, useState } from 'react';
import { Anchor, Box, Container, Divider, Group, Image, Stack, Text, useComputedColorScheme } from '@mantine/core';
import { IconBrandGithub } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import AppHeader from './components/layout/AppHeader';
import { logoFor } from './theme/logo';
import Landing from './components/landing/Landing';
import Dashboard from './components/Dashboard';
import HelpModal from './components/HelpModal';
import { TableExporter } from './services/table/TableDataProcessor';
import { buildSampleJourneyLog } from './utils/sampleData';

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
    ];
};

const tableExporter = new TableExporter();

function Footer() {
    const scheme = useComputedColorScheme('dark', { getInitialValueInEffect: false });
    return (
        <Box component="footer" mt={64} pt="xl" pb="xl" style={{ borderTop: '1px solid var(--ps-border)' }} className="ps-no-print">
            <Container size="xl" px={{ base: 'sm', sm: 'md' }}>
                <Stack gap="md">
                    <Group justify="space-between" align="center" wrap="wrap" gap="md">
                        <Group gap="sm">
                            <Image src={logoFor(scheme)} alt="Polestar OSS" h={24} w="auto" fit="contain" />
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

function App() {
    const [journey, setJourney] = useState(null); // { data, distanceUnit, fileName }
    const [filteredData, setFilteredData] = useState(null);
    const [helpOpened, setHelpOpened] = useState(false);

    const handleDataLoaded = useCallback((loaded) => {
        setJourney(loaded);
        setFilteredData(loaded.data);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    const handleLoadSample = useCallback(() => {
        const sample = buildSampleJourneyLog();
        handleDataLoaded({ ...sample, fileName: 'Sample journey log (synthetic)' });
        notifications.show({
            title: 'Sample data loaded',
            message: 'A synthetic year of driving around Gothenburg. Drop your own export any time.',
            color: 'polestar',
        });
    }, [handleDataLoaded]);

    const handleReset = useCallback(() => {
        setJourney(null);
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
                exportCount={filteredData?.length}
                onHelp={() => setHelpOpened(true)}
            />

            <Box component="main" style={{ flex: 1 }}>
                {!journey ? (
                    <Landing onDataLoaded={handleDataLoaded} onLoadSample={handleLoadSample} />
                ) : (
                    <Container size="xl" px={{ base: 'sm', sm: 'md' }} py="lg" className="ps-fade">
                        <Dashboard key={journey.fileName} data={journey.data} distanceUnit={journey.distanceUnit} onFilteredChange={setFilteredData} />
                    </Container>
                )}
            </Box>

            <Footer />
            <HelpModal opened={helpOpened} onClose={() => setHelpOpened(false)} />
        </Box>
    );
}

export default App;
