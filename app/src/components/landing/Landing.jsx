import { useState } from 'react';
import { Anchor, Box, Button, Container, Grid, Group, List, SimpleGrid, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconChartLine, IconBatteryCharging, IconMapPin, IconShieldLock, IconSparkles, IconArrowRight } from '@tabler/icons-react';
import FileDropzone from './FileDropzone';
import HelpModal from '../HelpModal';
import Eyebrow from '../ui/Eyebrow';

const FEATURES = [
    {
        icon: IconChartLine,
        title: 'Trends that explain themselves',
        body: 'Monthly distance and energy, a rolling efficiency line that ignores cold-start noise, and a winter-vs-summer read-out.',
    },
    {
        icon: IconBatteryCharging,
        title: 'Battery, inferred',
        body: 'Charging sessions, your typical plug-in and target level, and an estimate of usable capacity - all derived from SOC changes.',
    },
    {
        icon: IconMapPin,
        title: 'Places and routes',
        body: 'Routes coloured by efficiency, a density heatmap, and the handful of places that account for most of your driving.',
    },
];

const STEPS = [
    'Install the Polestar Journey Log app in the car and sign in with your Polestar ID.',
    'Drive. Journeys are recorded from drive mode to park.',
    'In the app, pick a date range and tap export - the file arrives by email.',
    'Drop that CSV or XLSX here. Everything is computed in your browser.',
];

/** Decorative animated route line for the hero */
function RouteArt() {
    return (
        <svg viewBox="0 0 520 260" width="100%" height="100%" aria-hidden style={{ position: 'absolute', inset: 0, opacity: 0.9 }}>
            <defs>
                <linearGradient id="ps-route-grad" x1="0" x2="1">
                    <stop offset="0" stopColor="var(--ps-accent)" stopOpacity="0" />
                    <stop offset="0.25" stopColor="var(--ps-accent)" stopOpacity="0.9" />
                    <stop offset="0.75" stopColor="var(--ps-accent)" stopOpacity="0.9" />
                    <stop offset="1" stopColor="var(--ps-accent)" stopOpacity="0" />
                </linearGradient>
            </defs>
            <path
                d="M-10 200 C 60 190, 90 120, 150 130 S 250 200, 310 150 S 400 40, 470 70 S 530 120, 560 90"
                fill="none"
                stroke="url(#ps-route-grad)"
                strokeWidth="2"
                strokeLinecap="round"
                className="ps-route-path"
            />
            <circle r="3" fill="var(--ps-accent)" className="ps-route-dot">
                <animateMotion dur="9s" repeatCount="indefinite" path="M-10 200 C 60 190, 90 120, 150 130 S 250 200, 310 150 S 400 40, 470 70 S 530 120, 560 90" />
            </circle>
        </svg>
    );
}

function Landing({ onDataLoaded, onLoadSample }) {
    const [helpOpened, setHelpOpened] = useState(false);

    return (
        <Container size="xl" px={{ base: 'sm', sm: 'md' }} py={{ base: 'xl', sm: 48 }}>
            <Grid gutter={{ base: 'xl', md: 56 }} align="center">
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <Stack gap="lg" className="ps-rise">
                        <Eyebrow>Polestar Journey Log Explorer</Eyebrow>
                        <Title order={1} className="ps-display" fz={{ base: 40, sm: 56, lg: 64 }}>
                            Your journeys,
                            <br />
                            decoded.
                        </Title>
                        <Text fz={{ base: 'md', sm: 'lg' }} c="dimmed" maw={480} lh={1.5}>
                            Turn the spreadsheet your car emails you into something you actually want to look at: seasonality, charging habits, favourite places, and the trips that cost the most energy.
                        </Text>
                        <List spacing={6} size="sm" icon={<ThemeIcon size={18} radius="xl" variant="light" color="polestar"><IconShieldLock size={11} /></ThemeIcon>}>
                            <List.Item>100 % client-side. Your file never leaves the browser.</List.Item>
                            <List.Item>Works with the CSV and XLSX exports, in km or miles.</List.Item>
                            <List.Item>Free and open source, AGPL-3.0.</List.Item>
                        </List>
                        <Group gap="sm" mt="xs">
                            <Button variant="default" leftSection={<IconSparkles size={16} />} onClick={onLoadSample}>
                                Explore with sample data
                            </Button>
                            <Anchor size="sm" c="dimmed" onClick={() => setHelpOpened(true)} style={{ cursor: 'pointer' }}>
                                <Group gap={4} wrap="nowrap">How do I export my log? <IconArrowRight size={14} /></Group>
                            </Anchor>
                        </Group>
                    </Stack>
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <Box className="ps-rise" style={{ '--i': 2, position: 'relative' }}>
                        <Box className="ps-dotgrid" style={{ position: 'absolute', inset: -40, zIndex: 0, pointerEvents: 'none' }} />
                        <Box style={{ position: 'absolute', inset: '-90px -40px', zIndex: 0, pointerEvents: 'none' }}>
                            <RouteArt />
                        </Box>
                        <Box style={{ position: 'relative', zIndex: 1 }}>
                            <FileDropzone onDataLoaded={onDataLoaded} />
                        </Box>
                    </Box>
                </Grid.Col>
            </Grid>

            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mt={{ base: 48, sm: 72 }}>
                {FEATURES.map((f, i) => (
                    <Box key={f.title} className="ps-card ps-card-hover ps-rise" p="lg" style={{ '--i': 3 + i }}>
                        <ThemeIcon size={36} radius="xs" variant="light" color="polestar" mb="md">
                            <f.icon size={20} stroke={1.5} />
                        </ThemeIcon>
                        <Text fw={500} mb={6} style={{ letterSpacing: '-0.01em' }}>{f.title}</Text>
                        <Text size="sm" c="dimmed" lh={1.5}>{f.body}</Text>
                    </Box>
                ))}
            </SimpleGrid>

            <Grid gutter="xl" mt={{ base: 48, sm: 72 }} className="ps-rise" style={{ '--i': 6 }}>
                <Grid.Col span={{ base: 12, md: 4 }}>
                    <Eyebrow>Getting your data</Eyebrow>
                    <Title order={3} mt="xs" className="ps-display" fz={28}>Four steps, one email.</Title>
                    <Text size="sm" c="dimmed" mt="sm" lh={1.5}>
                        The Journey Log app records every drive. Its export is the only input this tool needs.
                    </Text>
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 8 }}>
                    <Stack gap={0}>
                        {STEPS.map((step, i) => (
                            <Group key={step} gap="md" wrap="nowrap" align="flex-start" py="sm" style={{ borderTop: '1px solid var(--ps-border)' }}>
                                <Text className="ps-tabular" c="polestar" fw={600} fz="sm" w={28}>{String(i + 1).padStart(2, '0')}</Text>
                                <Text size="sm" lh={1.5}>{step}</Text>
                            </Group>
                        ))}
                    </Stack>
                </Grid.Col>
            </Grid>

            <HelpModal opened={helpOpened} onClose={() => setHelpOpened(false)} />
        </Container>
    );
}

export default Landing;
