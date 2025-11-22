import { useState } from 'react';
import { Paper, Text, Group, Button, Stack, Image, useMantineColorScheme, ActionIcon, Tooltip } from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import { IconUpload, IconFile, IconX, IconHelp } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { parseCSV, parseXLSX } from '../utils/dataParser';
import HelpModal from './HelpModal';

function FileUploader({ onDataLoaded }) {
  const [loading, setLoading] = useState(false);
  const [helpOpened, setHelpOpened] = useState(false);
  const { colorScheme } = useMantineColorScheme();

  const handleFileDrop = async (files) => {
    if (files.length === 0) return;

    const file = files[0];
    const fileName = file.name.toLowerCase();

    setLoading(true);

    try {
      let data;
      
      if (fileName.endsWith('.csv')) {
        data = await parseCSV(file);
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        data = await parseXLSX(file);
      } else {
        throw new Error('Unsupported file format. Please upload a CSV or XLSX file.');
      }

      if (data.length === 0) {
        throw new Error('No valid journey data found in the file.');
      }

      notifications.show({
        title: 'Success!',
        message: `Loaded ${data.length} journeys from ${file.name}`,
        color: 'green',
      });

      onDataLoaded(data);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to parse file',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack gap="xl" mt="xl">
      <div style={{ textAlign: 'center' }}>
        <Image
          src={colorScheme === 'dark' ? '/polestar-journey-log-explorer/logo-white.png' : '/polestar-journey-log-explorer/logo-black.png'}
          alt="Polestar OSS Logo"
          h={120}
          w="auto"
          fit="contain"
          style={{ margin: '0 auto' }}
          mb="xl"
        />
        <Group justify="center" gap="xs" mb="sm">
          <Text size="xl" fw={700}>
            Upload Your Journey Log
          </Text>
          <Tooltip label="How to get your journey data">
            <ActionIcon 
              variant="subtle" 
              size="lg"
              onClick={() => setHelpOpened(true)}
            >
              <IconHelp size={20} />
            </ActionIcon>
          </Tooltip>
        </Group>
        <Text size="sm" c="dimmed" mb="xl">
          Upload a CSV or XLSX file containing your Polestar journey data to get started
        </Text>
      </div>

      <Paper shadow="md" p="xl" radius="md" withBorder>
        <Dropzone
          onDrop={handleFileDrop}
          loading={loading}
          accept={[
            'text/csv',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          ]}
          maxFiles={1}
        >
          <Group justify="center" gap="xl" style={{ minHeight: 200, pointerEvents: 'none' }}>
            <Dropzone.Accept>
              <IconUpload size={50} stroke={1.5} />
            </Dropzone.Accept>
            <Dropzone.Reject>
              <IconX size={50} stroke={1.5} />
            </Dropzone.Reject>
            <Dropzone.Idle>
              <IconFile size={50} stroke={1.5} />
            </Dropzone.Idle>

            <div>
              <Text size="xl" inline>
                Drag file here or click to select
              </Text>
              <Text size="sm" c="dimmed" inline mt={7}>
                Accepts CSV and XLSX files
              </Text>
            </div>
          </Group>
        </Dropzone>
      </Paper>

      <Paper p="md" radius="md" withBorder>
        <Text size="sm" fw={600} mb="xs">Expected file format:</Text>
        <Text size="xs" c="dimmed">
          Your file should contain columns like: Start Date, End Date, Distance in KM, 
          Consumption in Kwh, Start Address, End Address, Start/End Latitude/Longitude, etc.
        </Text>
      </Paper>

      <HelpModal opened={helpOpened} onClose={() => setHelpOpened(false)} />
    </Stack>
  );
}

export default FileUploader;
