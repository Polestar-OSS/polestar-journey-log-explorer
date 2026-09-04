import { useState } from 'react';
import { Box, Group, Loader, Stack, Text } from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import { IconUpload, IconX, IconFileSpreadsheet } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { parseCSV, parseXLSX } from '../../utils/dataParser';
import Eyebrow from '../ui/Eyebrow';

const ACCEPTED = ['.csv', '.xlsx', '.xls'];

/**
 * Drop target for the Journey Log export. Validates by extension (MIME types
 * for spreadsheets are unreliable across platforms) and parses in-browser.
 */
function FileDropzone({ onDataLoaded, compact = false }) {
    const [loading, setLoading] = useState(false);
    const [fileName, setFileName] = useState(null);

    const handleFiles = async (files) => {
        const file = files[0];
        if (!file) return;
        const name = file.name.toLowerCase();
        if (!ACCEPTED.some((ext) => name.endsWith(ext))) {
            notifications.show({ title: 'Unsupported file', message: 'Please drop a CSV or XLSX export from the Journey Log app.', color: 'red' });
            return;
        }

        setLoading(true);
        setFileName(file.name);
        try {
            const result = name.endsWith('.csv') ? await parseCSV(file) : await parseXLSX(file);
            if (!result.data.length) {
                throw new Error('No trips with a distance greater than zero were found in this file.');
            }
            notifications.show({
                title: `${result.data.length.toLocaleString()} trips loaded`,
                message: `${file.name} · distances in ${result.distanceUnit}`,
                color: 'polestar',
            });
            onDataLoaded({ ...result, fileName: file.name });
        } catch (error) {
            notifications.show({ title: 'Could not read the file', message: error.message || 'Failed to parse file', color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dropzone
            onDrop={handleFiles}
            onReject={() => notifications.show({ title: 'Unsupported file', message: 'Please drop a single CSV or XLSX file.', color: 'red' })}
            loading={loading}
            maxFiles={1}
            multiple={false}
            className="ps-dropzone"
            p={compact ? 'lg' : 'xl'}
            aria-label="Upload your journey log"
        >
            <Stack align="center" justify="center" gap="sm" style={{ minHeight: compact ? 120 : 220, pointerEvents: 'none', textAlign: 'center' }}>
                <Box
                    style={{
                        width: 56,
                        height: 56,
                        display: 'grid',
                        placeItems: 'center',
                        border: '1px solid var(--ps-border-strong)',
                        borderRadius: 2,
                        color: 'var(--ps-accent)',
                    }}
                >
                    <Dropzone.Accept><IconUpload size={26} stroke={1.5} /></Dropzone.Accept>
                    <Dropzone.Reject><IconX size={26} stroke={1.5} /></Dropzone.Reject>
                    <Dropzone.Idle>{loading ? <Loader size="sm" color="polestar" /> : <IconFileSpreadsheet size={26} stroke={1.5} />}</Dropzone.Idle>
                </Box>
                <div>
                    <Text fw={500} fz={compact ? 'sm' : 'lg'} style={{ letterSpacing: '-0.01em' }}>
                        {loading ? `Reading ${fileName}…` : 'Drop your Journey Log export here'}
                    </Text>
                    <Text size="sm" c="dimmed" mt={4}>
                        or click to browse · CSV and XLSX
                    </Text>
                </div>
                {!compact && (
                    <Group gap="xs" mt="xs">
                        <Eyebrow>Processed locally</Eyebrow>
                        <Text size="xs" c="dimmed">·</Text>
                        <Eyebrow>Nothing is uploaded</Eyebrow>
                    </Group>
                )}
            </Stack>
        </Dropzone>
    );
}

export default FileDropzone;
