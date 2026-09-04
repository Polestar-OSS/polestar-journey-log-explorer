import { ActionIcon, Box, Button, Container, Group, Image, Text, Tooltip, useMantineColorScheme, useComputedColorScheme } from '@mantine/core';
import { IconSun, IconMoon, IconBrandGithub, IconDownload, IconHelp, IconFileUpload } from '@tabler/icons-react';
import Eyebrow from '../ui/Eyebrow';
import { logoFor } from '../../theme/logo';

const REPO_URL = 'https://github.com/Polestar-OSS/polestar-journey-log-explorer';

function AppHeader({ hasData, onReset, onExport, exportCount, onHelp }) {
    const { toggleColorScheme } = useMantineColorScheme();
    const scheme = useComputedColorScheme('dark', { getInitialValueInEffect: false });

    return (
        <Box component="header" className="ps-sticky-header">
            <Container size="xl" px={{ base: 'sm', sm: 'md' }} h={{ base: 56, sm: 64 }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                    <Image src={logoFor(scheme)} alt="Polestar OSS" h={{ base: 26, sm: 30 }} w="auto" fit="contain" />
                    <Box visibleFrom="xs" style={{ minWidth: 0 }}>
                        <Text fw={500} fz={{ base: 'sm', sm: 'md' }} lh={1.1} style={{ letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
                            Journey Log Explorer
                        </Text>
                        <Eyebrow style={{ fontSize: 10 }}>Community · not affiliated with Polestar</Eyebrow>
                    </Box>
                </Group>

                <Group gap={6} wrap="nowrap">
                    {hasData && (
                        <>
                            <Tooltip label="Export the filtered trips as CSV">
                                <Button size="xs" variant="default" leftSection={<IconDownload size={14} />} onClick={onExport} visibleFrom="sm">
                                    Export {exportCount !== undefined ? `(${exportCount})` : ''}
                                </Button>
                            </Tooltip>
                            <Tooltip label="Export CSV">
                                <ActionIcon size="lg" variant="default" onClick={onExport} hiddenFrom="sm" aria-label="Export CSV">
                                    <IconDownload size={16} />
                                </ActionIcon>
                            </Tooltip>
                            <Tooltip label="Load a different file">
                                <Button size="xs" variant="subtle" color="gray" leftSection={<IconFileUpload size={14} />} onClick={onReset} visibleFrom="sm">
                                    New file
                                </Button>
                            </Tooltip>
                            <Tooltip label="Load a different file">
                                <ActionIcon size="lg" variant="subtle" color="gray" onClick={onReset} hiddenFrom="sm" aria-label="Load a different file">
                                    <IconFileUpload size={16} />
                                </ActionIcon>
                            </Tooltip>
                        </>
                    )}
                    {onHelp && (
                        <Tooltip label="How to get your journey data">
                            <ActionIcon size="lg" variant="subtle" color="gray" onClick={onHelp} aria-label="Help">
                                <IconHelp size={18} />
                            </ActionIcon>
                        </Tooltip>
                    )}
                    <Tooltip label="Source on GitHub">
                        <ActionIcon size="lg" variant="subtle" color="gray" component="a" href={REPO_URL} target="_blank" rel="noreferrer" aria-label="GitHub" visibleFrom="xs">
                            <IconBrandGithub size={18} />
                        </ActionIcon>
                    </Tooltip>
                    <Tooltip label={`Switch to ${scheme === 'dark' ? 'light' : 'dark'} theme`}>
                        <ActionIcon size="lg" variant="default" onClick={() => toggleColorScheme()} aria-label="Toggle colour scheme">
                            {scheme === 'dark' ? <IconSun size={17} /> : <IconMoon size={17} />}
                        </ActionIcon>
                    </Tooltip>
                </Group>
            </Container>
        </Box>
    );
}

export default AppHeader;
