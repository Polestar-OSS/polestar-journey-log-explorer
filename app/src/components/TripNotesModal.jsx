import { useState } from 'react';
import { Modal, Textarea, Button, Group, TagsInput, Stack, Text, Box } from '@mantine/core';
import { IconTag, IconNote } from '@tabler/icons-react';
import { saveTripAnnotation, deleteTripAnnotation, getAllTags, getTripAnnotation } from '../utils/tripAnnotations';
import Eyebrow from './ui/Eyebrow';

function TripNotesModal({ opened, onClose, trip, tripId, distanceUnit = 'km', onSave }) {
    // The parent keys this modal by trip, so a fresh mount loads the stored annotation
    const [notes, setNotes] = useState(() => (tripId ? getTripAnnotation(tripId).notes || '' : ''));
    const [tags, setTags] = useState(() => (tripId ? getTripAnnotation(tripId).tags || [] : []));
    const [availableTags] = useState(() => getAllTags());

    const handleSave = () => {
        const cleanTags = tags.map((t) => t.trim()).filter(Boolean);
        if (!notes.trim() && cleanTags.length === 0) deleteTripAnnotation(tripId);
        else saveTripAnnotation(tripId, { notes: notes.trim(), tags: cleanTags });
        onSave?.();
        onClose();
    };

    const unit = distanceUnit === 'mi' ? 'mi' : 'km';

    return (
        <Modal opened={opened} onClose={onClose} title="Trip notes & tags" size="lg">
            <Stack gap="md">
                {trip && (
                    <Box style={{ borderLeft: '3px solid var(--ps-accent)', paddingLeft: 12 }}>
                        <Eyebrow>{trip.startDate}</Eyebrow>
                        <Text size="sm" mt={4}>{trip.startAddress}</Text>
                        <Text size="sm" c="dimmed">→ {trip.endAddress}</Text>
                        <Text size="xs" c="dimmed" mt={4} className="ps-tabular">
                            {trip.distanceKm} {unit} · {trip.consumptionKwh} kWh · {trip.efficiency} kWh/100{unit}
                        </Text>
                    </Box>
                )}

                <Textarea label="Notes" placeholder="Why was this trip unusual? Weather, load, detour…" leftSection={<IconNote size={16} />} value={notes} onChange={(e) => setNotes(e.currentTarget.value)} minRows={4} maxRows={8} autosize />

                <TagsInput label="Tags" description="Press Enter to add a tag; tags can be used in the filter bar" placeholder="e.g. commute, winter, road-trip" leftSection={<IconTag size={16} />} data={availableTags} value={tags} onChange={setTags} clearable />

                <Text size="xs" c="dimmed">Notes and tags are stored in this browser only.</Text>

                <Group justify="flex-end" mt="xs">
                    <Button variant="subtle" color="gray" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave}>Save</Button>
                </Group>
            </Stack>
        </Modal>
    );
}

export default TripNotesModal;
