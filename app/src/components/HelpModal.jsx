import { Modal, Text, Stack, List, Anchor, Divider, Button, Group } from '@mantine/core';
import { IconExternalLink, IconInfoCircle } from '@tabler/icons-react';

function HelpModal({ opened, onClose }) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="How to Use Journey Log Explorer"
      size="lg"
      centered
    >
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
            <List.Item>Click "Browse files" or drag and drop the file here</List.Item>
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
            All data processing happens locally in your browser. Your journey data never leaves your device.
            This is a community-driven tool not affiliated with Polestar.
          </Text>
        </Stack>

        <Button onClick={onClose} fullWidth>
          Got it!
        </Button>
      </Stack>
    </Modal>
  );
}

export default HelpModal;
