import { useState } from 'react';
import { Modal, Textarea, Button, Group, MultiSelect, Stack } from '@mantine/core';
import { IconTag, IconNote } from '@tabler/icons-react';
import { saveTripAnnotation, getAllTags } from '../utils/tripAnnotations';

function TripNotesModal({ opened, onClose, trip, tripId, onSave }) {
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState([]);
  const [availableTags, setAvailableTags] = useState(getAllTags());

  const handleSave = () => {
    saveTripAnnotation(tripId, { notes, tags });
    onSave?.();
    onClose();
  };

  const handleClose = () => {
    setNotes('');
    setTags([]);
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Trip Notes & Tags"
      size="lg"
    >
      <Stack gap="md">
        <div>
          <strong>Trip:</strong> {trip?.startAddress?.substring(0, 50)} → {trip?.endAddress?.substring(0, 50)}
        </div>
        <div>
          <strong>Date:</strong> {trip?.startDate} | <strong>Distance:</strong> {trip?.distanceKm} km
        </div>

        <Textarea
          label="Notes"
          placeholder="Add notes about this trip..."
          leftSection={<IconNote size={16} />}
          value={notes}
          onChange={(e) => setNotes(e.currentTarget.value)}
          minRows={4}
          maxRows={8}
        />

        <MultiSelect
          label="Tags"
          placeholder="Add or select tags"
          leftSection={<IconTag size={16} />}
          data={availableTags}
          value={tags}
          onChange={setTags}
          searchable
          creatable
          getCreateLabel={(query) => `+ Create "${query}"`}
          onCreate={(query) => {
            const item = query;
            setAvailableTags((current) => [...current, item]);
            return item;
          }}
        />

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

export default TripNotesModal;
