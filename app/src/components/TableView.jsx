import { useMemo, useState } from 'react';
import { Paper, Table, TextInput, Select, Badge, ScrollArea, Text, ActionIcon, Tooltip, Group } from '@mantine/core';
import { IconSearch, IconNote, IconTag } from '@tabler/icons-react';
import TripNotesModal from './TripNotesModal';
import { generateTripId, getTripAnnotation } from '../utils/tripAnnotations';

function TableView({ data }) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('startDate');
  const [sortOrder, setSortOrder] = useState('desc');
  const [modalOpened, setModalOpened] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [selectedTripId, setSelectedTripId] = useState(null);

  const filteredAndSortedData = useMemo(() => {
    let filtered = data.filter(trip => 
      trip.startAddress.toLowerCase().includes(search.toLowerCase()) ||
      trip.endAddress.toLowerCase().includes(search.toLowerCase()) ||
      trip.startDate.includes(search)
    );

    filtered.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (sortBy === 'startDate') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      } else if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }, [data, search, sortBy, sortOrder]);

  const getEfficiencyColor = (efficiency) => {
    const eff = parseFloat(efficiency);
    if (eff < 15) return 'green';
    if (eff < 20) return 'yellow';
    if (eff < 25) return 'orange';
    return 'red';
  };

  const handleOpenModal = (trip) => {
    setSelectedTrip(trip);
    setSelectedTripId(generateTripId(trip));
    setModalOpened(true);
  };

  const handleSaveAnnotation = () => {
    // Refresh handled by modal close
  };

  const rows = filteredAndSortedData.map((trip) => {
    const tripId = generateTripId(trip);
    const annotation = getTripAnnotation(tripId);
    const hasNotes = annotation.notes?.length > 0;
    const hasTags = annotation.tags?.length > 0;

    return (
    <Table.Tr key={trip.id}>
      <Table.Td>{trip.startDate}</Table.Td>
      <Table.Td>{trip.startAddress.substring(0, 40)}...</Table.Td>
      <Table.Td>{trip.endAddress.substring(0, 40)}...</Table.Td>
      <Table.Td>{trip.distanceKm}</Table.Td>
      <Table.Td>{trip.consumptionKwh}</Table.Td>
      <Table.Td>
        <Badge color={getEfficiencyColor(trip.efficiency)} size="sm">
          {trip.efficiency}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Badge color="blue" size="sm">
          {trip.socSource}% → {trip.socDestination}%
        </Badge>
      </Table.Td>
      <Table.Td>{trip.socDrop}%</Table.Td>
      <Table.Td>
        <Group gap="xs">
          {hasTags && (
            <Tooltip label={annotation.tags.join(', ')} withArrow>
              <Badge size="sm" variant="dot" color="blue">
                <IconTag size={12} /> {annotation.tags.length}
              </Badge>
            </Tooltip>
          )}
          {hasNotes && (
            <Tooltip label={annotation.notes.substring(0, 100)} withArrow>
              <Badge size="sm" variant="dot" color="green">
                <IconNote size={12} />
              </Badge>
            </Tooltip>
          )}
        </Group>
      </Table.Td>
      <Table.Td>
        <Tooltip label="Add notes/tags" withArrow>
          <ActionIcon
            variant={hasNotes || hasTags ? 'filled' : 'subtle'}
            color={hasNotes || hasTags ? 'blue' : 'gray'}
            onClick={() => handleOpenModal(trip)}
            size="sm"
          >
            <IconNote size={16} />
          </ActionIcon>
        </Tooltip>
      </Table.Td>
    </Table.Tr>
    );
  });

  return (
    <Paper p="md" withBorder>
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <TextInput
          placeholder="Search by address or date..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          style={{ flex: '1 1 300px' }}
        />
        <Select
          placeholder="Sort by"
          value={sortBy}
          onChange={setSortBy}
          data={[
            { value: 'startDate', label: 'Date' },
            { value: 'distanceKm', label: 'Distance' },
            { value: 'consumptionKwh', label: 'Consumption' },
            { value: 'efficiency', label: 'Efficiency' },
            { value: 'socDrop', label: 'SOC Drop' },
          ]}
          style={{ width: '150px' }}
        />
        <Select
          placeholder="Order"
          value={sortOrder}
          onChange={setSortOrder}
          data={[
            { value: 'asc', label: 'Ascending' },
            { value: 'desc', label: 'Descending' },
          ]}
          style={{ width: '130px' }}
        />
      </div>

      <Text size="sm" c="dimmed" mb="sm">
        Showing {filteredAndSortedData.length} of {data.length} trips
      </Text>

      <ScrollArea>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Date</Table.Th>
              <Table.Th>Start Address</Table.Th>
              <Table.Th>End Address</Table.Th>
              <Table.Th>Distance (km)</Table.Th>
              <Table.Th>Consumption (kWh)</Table.Th>
              <Table.Th>Efficiency (kWh/100km)</Table.Th>
              <Table.Th>SOC Change</Table.Th>
              <Table.Th>SOC Drop (%)</Table.Th>
              <Table.Th>Notes/Tags</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>
      </ScrollArea>

      <TripNotesModal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        trip={selectedTrip}
        tripId={selectedTripId}
        onSave={handleSaveAnnotation}
      />
    </Paper>
  );
}

export default TableView;
