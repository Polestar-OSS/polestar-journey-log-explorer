import { Modal, Text, Stack, List, Anchor, Divider, Button, Group, Tabs, Table, Badge } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconExternalLink, IconInfoCircle, IconDownload, IconLayoutList } from '@tabler/icons-react';
import { EXPERIENCE_LEVELS } from '../utils/preferences';

/** What each level shows. Kept next to the switch's own descriptions so the two never drift. */
const LEVEL_ROWS = [
  { level: 'simple', who: 'Anyone', tabs: 'Your driving · Map · Trips · Guide', tiles: 'Distance, trips, energy, efficiency, CO₂', extra: 'One page in plain words: how far, what it cost, range in summer and winter, how you charge, where you go, compared with a real petrol car, three tips.' },
  { level: 'detailed', who: 'Curious owners', tabs: 'Overview · Insights · Map · Trips · Guide', tiles: 'All eight, with change versus the previous period', extra: 'Charts with a table view each, an Insights page with the evidence behind every finding, the full map.' },
  { level: 'expert', who: 'Enthusiasts and analysts', tabs: 'Overview · Insights · Explore · Map · Trips · Guide', tiles: 'All eight', extra: 'Adds Explore: a pivot builder, percentile tables, a fitted consumption model, efficiency by speed, hour and battery level, a charging profile and a data-quality report. Trips gains more columns.' },
];

const FEATURES = [
  { name: 'Your driving (Simple)', use: 'Read top to bottom. Every card is one idea with one number and a comparison you can picture.', read: 'Numbers are the same as in the other levels, just worded. "Compared with" uses the car chosen in the settings.' },
  { name: 'Filter row', use: 'Presets count back from your newest trip. Custom opens a date range; More adds distance, efficiency, category, tag and source-file filters.', read: 'Everything on the page follows the filter, including costs and comparisons. The tiles show change versus the equal-length period before the one you picked.' },
  { name: 'Overview charts', use: 'Switch metric and granularity in the chart header; the ⊞ icon shows the same data as a table.', read: 'Gaps in a bar chart are days or months with no trips, shown honestly. The efficiency line is a rolling median, so one cold short hop does not swing it.' },
  { name: 'Insights', use: 'Each card states a finding, the numbers behind it and what it was derived from.', read: 'Seasonality is stated only with enough winter and summer trips over enough weeks; otherwise the card says what is missing. Charging, battery size and "home" are inferences from battery level and endpoints, not readings from the car.' },
  { name: 'Explore (Expert)', use: 'Pick a dimension and a metric to pivot; export the table as CSV. Scroll for distributions, the consumption model and data quality.', read: 'The consumption model splits energy into a fixed cost per trip (cabin, battery warm-up) and a per-km rate; the intercept is what short hops pay. Percentiles are more honest than averages for skewed things like trip length.' },
  { name: 'Map', use: 'Four modes: Routes, Heat, Places, Replay. On phones, tap the button showing the current mode to open the drawer with basemap, day chains, single-trip focus and road snapping.', read: 'Routes are coloured by efficiency (legend bottom-left). Straight lines are what the export has; road snapping is opt-in and sends only rounded start and end coordinates to the public OSRM router after you agree. Replay drives each day trip by trip; 0.2× is a watchable pace.' },
  { name: 'Trips', use: 'Search, sort, page; the note icon adds notes and tags kept in your browser. Expert shows every column.', read: 'Efficiency on trips under a few kilometres is dominated by the cold start and reads high; that is the car, not a data error.' },
  { name: 'Electricity, charging and comparison settings', use: 'Pick a tariff preset (search "ottawa", "texas", "sweden"…) or build your own: flat, time of use with seasons, or tiered. Set charging habits, the car to compare against and your fuel price.', read: 'The cost tile, the story and the Insights table all use the same result. Time-of-use pricing places inferred charging sessions in time; the assumptions list says exactly what was inferred. Money for the petrol comparison appears only after you enter a fuel price.' },
  { name: 'Export', use: 'The header button downloads the filtered trips as CSV with the derived columns.', read: 'Duplicates across several uploaded files are already removed; the sources bar shows what each file added.' },
];

function LevelsAndFeatures({ compact }) {
  return (
    <Stack gap="md">
      <Text size="sm">
        The three levels show the same data at three depths. Switch any time from the header; the choice is remembered.
      </Text>
      {compact ? (
        <Stack gap="sm">
          {LEVEL_ROWS.map((r) => {
            const meta = EXPERIENCE_LEVELS.find((l) => l.value === r.level);
            return (
              <div key={r.level}>
                <Group gap={6}><Text size="sm" fw={600}>{meta.label}</Text><Badge size="xs" variant="light" color="gray">{r.who}</Badge></Group>
                <Text size="xs" c="dimmed">Tabs: {r.tabs}</Text>
                <Text size="xs" c="dimmed">Tiles: {r.tiles}</Text>
                <Text size="xs" mt={2}>{r.extra}</Text>
              </div>
            );
          })}
        </Stack>
      ) : (
        <Table fz="xs" verticalSpacing={6} withRowBorders>
          <Table.Thead>
            <Table.Tr>{['Level', 'For', 'Tabs', 'KPI tiles', 'What it adds'].map((h) => <Table.Th key={h}>{h}</Table.Th>)}</Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {LEVEL_ROWS.map((r) => (
              <Table.Tr key={r.level}>
                <Table.Td fw={600}>{EXPERIENCE_LEVELS.find((l) => l.value === r.level).label}</Table.Td>
                <Table.Td c="dimmed">{r.who}</Table.Td>
                <Table.Td>{r.tabs}</Table.Td>
                <Table.Td>{r.tiles}</Table.Td>
                <Table.Td>{r.extra}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      <Divider />

      <Text size="sm" fw={600}>How to use and read each feature</Text>
      <Stack gap="sm">
        {FEATURES.map((f) => (
          <div key={f.name}>
            <Text size="sm" fw={600}>{f.name}</Text>
            <Text size="xs"><b>Use it:</b> {f.use}</Text>
            <Text size="xs" c="dimmed"><b>Read it:</b> {f.read}</Text>
          </div>
        ))}
      </Stack>

      <Text size="xs" c="dimmed">
        Formulas for every number are in the Guide tab; the same text is in the repository under docs/ANALYTICS.md.
      </Text>
    </Stack>
  );
}

function GettingData() {
  return (
    <Stack gap="md">
      <Group gap="xs">
        <IconInfoCircle size={20} />
        <Text size="sm" fw={600}>Getting Your Journey Data</Text>
      </Group>

      <Text size="sm">
        To use this explorer, you need to export your journey data from the official Polestar Journey Log app.
      </Text>

      <Stack gap="sm">
        <Text size="sm" fw={600}>Step 1: Install the Journey Log App</Text>
        <Text size="sm">
          Download and install the Journey Log app from the Google Play Store in your vehicle:
        </Text>
        <Anchor
          href="https://play.google.com/store/apps/details?id=com.polestar.driver.journey.log.production.android&hl=en_CA"
          target="_blank"
          size="sm"
        >
          <Group gap={4}>
            <span>Polestar Journey Log on Google Play</span>
            <IconExternalLink size={14} />
          </Group>
        </Anchor>
      </Stack>

      <Divider />

      <Stack gap="sm">
        <Text size="sm" fw={600}>Step 2: Sign In and Record Journeys</Text>
        <List size="sm" spacing="xs">
          <List.Item>Sign in with your Polestar ID</List.Item>
          <List.Item>Grant the necessary permissions for journey recording</List.Item>
          <List.Item>The app will automatically track journeys when you drive</List.Item>
          <List.Item>Journey recording starts when you shift to drive mode and stops when parked</List.Item>
        </List>
      </Stack>

      <Divider />

      <Stack gap="sm">
        <Text size="sm" fw={600}>Step 3: Export Your Data</Text>
        <List size="sm" spacing="xs">
          <List.Item>Open the Journey Log app</List.Item>
          <List.Item>Filter your journeys by date range or category (Business, Private, Commute)</List.Item>
          <List.Item>Tap the export button</List.Item>
          <List.Item>Export will be sent to your email</List.Item>
        </List>
      </Stack>

      <Divider />

      <Stack gap="sm">
        <Text size="sm" fw={600}>Step 4: Upload to Explorer</Text>
        <List size="sm" spacing="xs">
          <List.Item>Download the exported file from your email</List.Item>
          <List.Item>Click "Browse files" or drag and drop the file here; several files at once are merged and de-duplicated</List.Item>
          <List.Item>The explorer will analyze your data and display insights</List.Item>
        </List>
      </Stack>

      <Divider />

      <Stack gap="xs">
        <Text size="xs" fw={600} c="dimmed">What Data is Recorded?</Text>
        <List size="xs" spacing={4}>
          <List.Item>Distance driven</List.Item>
          <List.Item>Energy consumption</List.Item>
          <List.Item>Odometer readings</List.Item>
          <List.Item>Start and end timestamps</List.Item>
          <List.Item>Start and end addresses</List.Item>
          <List.Item>Battery State of Charge (SOC)</List.Item>
          <List.Item>Journey category (Business/Private/Commute)</List.Item>
        </List>
      </Stack>

      <Divider />

      <Stack gap="xs">
        <Text size="xs" fw={600} c="dimmed">Privacy & Data</Text>
        <Text size="xs" c="dimmed">
          All data processing happens locally in your browser. Your journey data never leaves your device unless you
          turn on road snapping on the map, which sends rounded start and end coordinates to a public router after asking you.
          This is a community-driven tool not affiliated with Polestar.
        </Text>
      </Stack>
    </Stack>
  );
}

/**
 * Help: two pages, reachable from the header at any time. "Get your data"
 * is the export walkthrough; "Levels & features" explains what each level
 * shows and how to use and read every view.
 */
function HelpModal({ opened, onClose, initialTab = 'data' }) {
  const isMobile = useMediaQuery('(max-width: 48em)');
  return (
    <Modal opened={opened} onClose={onClose} title="Help" size="xl" centered fullScreen={isMobile} radius={0}>
      <Tabs defaultValue={initialTab} keepMounted={false}>
        <Tabs.List mb="md">
          <Tabs.Tab value="data" leftSection={<IconDownload size={14} />}>Get your data</Tabs.Tab>
          <Tabs.Tab value="levels" leftSection={<IconLayoutList size={14} />}>Levels & features</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="data"><GettingData /></Tabs.Panel>
        <Tabs.Panel value="levels"><LevelsAndFeatures compact={isMobile} /></Tabs.Panel>
      </Tabs>
      <Button onClick={onClose} fullWidth mt="md">
        Got it!
      </Button>
    </Modal>
  );
}

export default HelpModal;
