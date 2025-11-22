import { useState } from 'react';
import { AppShell, Container, Title, Text, ActionIcon, Group, Tooltip, useMantineColorScheme, Image, Anchor, Divider, Stack, Box } from '@mantine/core';
import { IconSun, IconMoon, IconBrandGithub } from '@tabler/icons-react';
import FileUploader from './components/FileUploader';
import Dashboard from './components/Dashboard';

function App() {
  const [journeyData, setJourneyData] = useState(null);
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();

  const handleDataLoaded = (data) => {
    setJourneyData(data);
  };

  return (
    <AppShell
      header={{ height: 70 }}
      footer={{ height: 150 }}
      padding="md"
    >
      <AppShell.Header>
        <Container size="xl" h="100%" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Group gap="md">
            <Image
              src={colorScheme === 'dark' ? '/polestar-journey-log-explorer/logo-white.png' : '/polestar-journey-log-explorer/logo-black.png'}
              alt="Polestar OSS Logo"
              h={40}
              w="auto"
              fit="contain"
            />
            <div>
              <Title order={2}>Polestar Journey Log Explorer</Title>
              <Text size="sm" c="dimmed">Analyze your electric vehicle journey data</Text>
            </div>
          </Group>
          <Group>
            <Tooltip label={`Switch to ${colorScheme === 'dark' ? 'light' : 'dark'} mode`}>
              <ActionIcon
                variant="subtle"
                size="lg"
                onClick={() => toggleColorScheme()}
              >
                {colorScheme === 'dark' ? <IconSun size={20} /> : <IconMoon size={20} />}
              </ActionIcon>
            </Tooltip>
          </Group>
        </Container>
      </AppShell.Header>

      <AppShell.Main>
        <Container size="xl">
          {!journeyData ? (
            <FileUploader onDataLoaded={handleDataLoaded} />
          ) : (
            <Dashboard data={journeyData} onReset={() => setJourneyData(null)} />
          )}
        </Container>
      </AppShell.Main>

      <AppShell.Footer p="md" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
        <Container size="xl">
          <Stack gap="sm">
            <Group justify="space-between" align="center">
              <Group gap="md">
                <Image
                  src={colorScheme === 'dark' ? '/polestar-journey-log-explorer/logo-white.png' : '/polestar-journey-log-explorer/logo-black.png'}
                  alt="Polestar OSS Logo"
                  h={30}
                  w="auto"
                  fit="contain"
                />
                <div>
                  <Text size="sm" fw={500}>Polestar Journey Log Explorer</Text>
                  <Text size="xs" c="dimmed">A community-driven project</Text>
                </div>
              </Group>
              <Group gap="md">
                <Anchor
                  href="https://github.com/Polestar-OSS/polestar-journey-log-explorer"
                  target="_blank"
                  c="dimmed"
                  size="sm"
                >
                  <Group gap={4}>
                    <IconBrandGithub size={16} />
                    <span>GitHub</span>
                  </Group>
                </Anchor>
                <Anchor
                  href="https://github.com/Polestar-OSS/polestar-journey-log-explorer/blob/main/LICENSE"
                  target="_blank"
                  c="dimmed"
                  size="sm"
                >
                  MIT License
                </Anchor>
              </Group>
            </Group>
            <Divider />
            <Box>
              <Text size="xs" c="dimmed" ta="center">
                © 2025 Kinn Coelho Juliao &lt;kinncj@gmail.com&gt; • Made with ⚡ by the community
              </Text>
              <Text size="xs" c="dimmed" ta="center" mt={4}>
                This project is not affiliated with, endorsed by, or in any way officially connected with Polestar, the Polestar brand, Geely, or any of their subsidiaries.
              </Text>
            </Box>
          </Stack>
        </Container>
      </AppShell.Footer>
    </AppShell>
  );
}

export default App;
