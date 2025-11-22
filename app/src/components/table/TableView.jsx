import { useMemo, useState } from 'react';
import { Paper, Table, TextInput, Select, Badge, ScrollArea, Text, ActionIcon, Tooltip, Group } from '@mantine/core';
import { IconSearch, IconNote, IconTag } from '@tabler/icons-react';
import TripNotesModal from '../TripNotesModal';
import { generateTripId, getTripAnnotation } from '../../utils/tripAnnotations';
import { TableDataProcessor, TableRowFormatter } from '../../services/table/TableDataProcessor';

function TableView({ data }) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('startDate');
  const [sortOrder, setSortOrder] = useState('desc');
  const [modalOpened, setModalOpened] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [selectedTripId, setSelectedTripId] = useState(null);

  // Initialize services (Dependency Injection)
  const dataProcessor = useMemo(() => new TableDataProcessor(), []);
  const rowFormatter = useMemo(() => new TableRowFormatter(), []);

  // Process data using services
  const filteredAndSortedData = useMemo(() => {
    let processed = data;
    
    // Apply search filter using service
    processed = dataProcessor.filterData(processed, search, ['startAddress', 'endAddress', 'startDate']);
    
    // Apply sorting using service
    processed = dataProcessor.sortData(processed, sortBy, sortOrder);
    
    return processed;
  }, [data, search, sortBy, sortOrder, dataProcessor]);

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

    // Use formatter service for consistent formatting
    const efficiency = rowFormatter.formatEfficiency(trip.efficiency);
    const socRange = rowFormatter.formatSOCRange(trip.socSource, trip.socDestination);

    return (
      <Table.Tr key={trip.id}>
        <Table.Td>{trip.startDate}</Table.Td>
        <Table.Td>{rowFormatter.truncateAddress(trip.startAddress, 40)}</Table.Td>
        <Table.Td>{rowFormatter.truncateAddress(trip.endAddress, 40)}</Table.Td>
        <Table.Td>{trip.distanceKm}</Table.Td>
        <Table.Td>{trip.consumptionKwh}</Table.Td>
        <Table.Td>
          <Badge color={efficiency.color} size="sm">
            {efficiency.value}
          </Badge>
        </Table.Td>
        <Table.Td>
          <Badge color={socRange.color} size="sm">
            {socRange.label}
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
