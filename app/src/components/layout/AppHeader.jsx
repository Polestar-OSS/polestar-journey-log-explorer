import { ActionIcon, Box, Button, Container, Group, Image, Menu, Text, Tooltip, useMantineColorScheme, useComputedColorScheme } from '@mantine/core';
import { IconSun, IconMoon, IconBrandGithub, IconDownload, IconHelp, IconFileUpload, IconPlus, IconDotsVertical, IconDatabase } from '@tabler/icons-react';
import Eyebrow from '../ui/Eyebrow';
import { logoFor } from '../../theme/logo';
import LevelSwitch from './LevelSwitch';

const REPO_URL = 'https://github.com/Polestar-OSS/polestar-journey-log-explorer';

function AppHeader({ hasData, onReset, onExport, onAddFiles, exportCount, onHelp, onData, level, onChangeLevel }) {
    const { toggleColorScheme } = useMantineColorScheme();
    const scheme = useComputedColorScheme('dark', { getInitialValueInEffect: false });

    return (
        <Box component="header" className="ps-sticky-header">
            <Container size="xl" px={{ base: 'sm', sm: 'md' }} h={{ base: 60, sm: 68 }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                    <Image src={logoFor(scheme)} alt="Polestar OSS" h={{ base: 34, sm: 40 }} w="auto" fit="contain" />
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
                            <LevelSwitch value={level} onChange={onChangeLevel} />
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
                            <Tooltip label="Add more exports to this journey">
                                <Button size="xs" variant="subtle" color="gray" leftSection={<IconPlus size={14} />} onClick={onAddFiles} visibleFrom="sm">
                                    Add files
                                </Button>
                            </Tooltip>
                            <Tooltip label="Start over with different files">
                                <Button size="xs" variant="subtle" color="gray" leftSection={<IconFileUpload size={14} />} onClick={onReset} visibleFrom="sm">
                                    Start over
                                </Button>
                            </Tooltip>
                        </>
                    )}
                    {onData && (
                        <Tooltip label="Your data and settings: what is kept in this browser, exports, deletion">
                            <ActionIcon size="lg" variant="subtle" color="gray" onClick={onData} aria-label="Your data and settings" visibleFrom="sm">
                                <IconDatabase size={18} />
                            </ActionIcon>
                        </Tooltip>
                    )}
                    {onHelp && (
                        <Tooltip label="Help: levels, features, getting your data">
                            <ActionIcon size="lg" variant="subtle" color="gray" onClick={onHelp} aria-label="Help" visibleFrom={hasData ? 'sm' : 'xs'}>
                                <IconHelp size={18} />
                            </ActionIcon>
                        </Tooltip>
                    )}
                    <Tooltip label="Source on GitHub">
                        <ActionIcon size="lg" variant="subtle" color="gray" component="a" href={REPO_URL} target="_blank" rel="noreferrer" aria-label="GitHub" visibleFrom="sm">
                            <IconBrandGithub size={18} />
                        </ActionIcon>
                    </Tooltip>
                    <Menu position="bottom-end" shadow="md" width={220}>
                        <Menu.Target>
                            <ActionIcon size="lg" variant="subtle" color="gray" aria-label="More actions" hiddenFrom="sm">
                                <IconDotsVertical size={18} />
                            </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                            {hasData && <Menu.Item leftSection={<IconPlus size={14} />} onClick={onAddFiles}>Add exports</Menu.Item>}
                            {hasData && <Menu.Item leftSection={<IconFileUpload size={14} />} onClick={onReset}>Start over</Menu.Item>}
                            {onData && <Menu.Item leftSection={<IconDatabase size={14} />} onClick={onData}>Your data and settings</Menu.Item>}
                            {onHelp && <Menu.Item leftSection={<IconHelp size={14} />} onClick={onHelp}>Help: levels, features, getting data</Menu.Item>}
                            <Menu.Item leftSection={<IconBrandGithub size={14} />} component="a" href={REPO_URL} target="_blank" rel="noreferrer">Source on GitHub</Menu.Item>
                        </Menu.Dropdown>
                    </Menu>
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
