import { useState } from 'react';
import { Box, Group, Loader, Stack, Text } from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import { IconUpload, IconX, IconFileSpreadsheet } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { parseJourneyFile } from '../../utils/dataParser';
import Eyebrow from '../ui/Eyebrow';

const ACCEPTED = ['.csv', '.xlsx', '.xls'];
const MAX_FILES = 12;

/**
 * Drop target for one or more Journey Log exports. Validates by extension
 * (spreadsheet MIME types are unreliable across platforms), parses each file
 * in the browser and hands the parsed sources up for merging.
 */
function FileDropzone({ onSourcesLoaded, compact = false }) {
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState('');

    const handleFiles = async (files) => {
        const accepted = files.filter((f) => ACCEPTED.some((ext) => f.name.toLowerCase().endsWith(ext)));
        const rejected = files.length - accepted.length;
        if (rejected > 0) {
            notifications.show({ title: rejected === files.length ? 'Unsupported file' : `${rejected} file(s) skipped`, message: 'Only CSV and XLSX exports from the Journey Log app are supported.', color: 'red' });
        }
        if (accepted.length === 0) return;

        setLoading(true);
        const sources = [];
        const failures = [];
        try {
            for (let i = 0; i < accepted.length; i++) {
                const file = accepted[i];
                setProgress(accepted.length > 1 ? `Reading ${i + 1} of ${accepted.length}: ${file.name}` : `Reading ${file.name}…`);
                try {
                    const parsed = await parseJourneyFile(file);
                    if (parsed.data.length === 0) failures.push(`${file.name}: no trips with a distance above zero`);
                    else sources.push(parsed);
                } catch (error) {
                    failures.push(`${file.name}: ${error.message}`);
                }
            }
            if (failures.length) {
                notifications.show({ title: failures.length === accepted.length ? 'Could not read the file' : 'Some files were skipped', message: failures.join(' · '), color: 'red', autoClose: 8000 });
            }
            if (sources.length) onSourcesLoaded(sources);
        } finally {
            setLoading(false);
            setProgress('');
        }
    };

    return (
        <Dropzone
            onDrop={handleFiles}
            onReject={() => notifications.show({ title: 'Unsupported file', message: `Drop up to ${MAX_FILES} CSV or XLSX exports.`, color: 'red' })}
            loading={loading}
            maxFiles={MAX_FILES}
            multiple
            className="ps-dropzone"
            p={compact ? 'lg' : 'xl'}
            aria-label="Upload your journey log exports"
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
                        {loading ? progress : compact ? 'Drop more exports here' : 'Drop your Journey Log exports here'}
                    </Text>
                    <Text size="sm" c="dimmed" mt={4}>
                        or click to browse · CSV and XLSX · several files at once
                    </Text>
                </div>
                {!compact && (
                    <Group gap={6} mt="xs" justify="center" wrap="wrap">
                        {['Processed locally', 'Overlaps de-duplicated', 'Nothing is uploaded'].map((label) => (
                            <Box key={label} px={8} py={3} style={{ border: '1px solid var(--ps-border)', borderRadius: 2 }}>
                                <Eyebrow style={{ fontSize: 10 }}>{label}</Eyebrow>
                            </Box>
                        ))}
                    </Group>
                )}
            </Stack>
        </Dropzone>
    );
}

export default FileDropzone;
