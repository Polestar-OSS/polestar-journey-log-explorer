import { useState } from 'react';
import { AppShell, Container, Title, Text, ActionIcon, Group, Tooltip, useMantineColorScheme } from '@mantine/core';
import { IconSun, IconMoon } from '@tabler/icons-react';
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
      padding="md"
    >
      <AppShell.Header>
        <Container size="xl" h="100%" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <Title order={2}>⚡ Polestar Journey Log Explorer</Title>
            <Text size="sm" c="dimmed">Analyze your electric vehicle journey data</Text>
          </div>
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
    </AppShell>
  );
}

export default App;
