import { useMemo, useState } from 'react';
import { Button, Grid, Stack, Tabs, Group } from '@mantine/core';
import { IconArrowLeft, IconChartBar, IconMap, IconList, IconDownload } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import StatsCards from './StatsCards';
import ChartsView from './ChartsView';
import MapView from './MapView';
import TableView from './TableView';
import Filters from './Filters';
import { calculateStatistics } from '../utils/dataParser';

function Dashboard({ data, onReset }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [filteredData, setFilteredData] = useState(data);
  
  const statistics = useMemo(() => calculateStatistics(filteredData), [filteredData]);

  const handleFilterChange = (filtered) => {
    setFilteredData(filtered);
  };

  const exportToCSV = () => {
    const headers = [
      'Start Date', 'End Date', 'Start Address', 'End Address',
      'Distance (km)', 'Consumption (kWh)', 'Efficiency (kWh/100km)',
      'Category', 'SOC Start', 'SOC End', 'SOC Drop',
      'Start Odometer', 'End Odometer'
    ];

    const rows = filteredData.map(trip => [
      trip.startDate,
      trip.endDate,
      trip.startAddress,
      trip.endAddress,
      trip.distanceKm,
      trip.consumptionKwh,
      trip.efficiency,
      trip.category,
      trip.socSource,
      trip.socDestination,
      trip.socDrop,
      trip.startOdometer,
      trip.endOdometer
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `polestar-journey-export-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    notifications.show({
      title: 'Export successful',
      message: `Exported ${filteredData.length} trips to CSV`,
      color: 'green',
    });
  };

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Button 
          leftSection={<IconArrowLeft size={16} />}
          variant="subtle"
          onClick={onReset}
        >
          Upload New File
        </Button>
        <Button
          leftSection={<IconDownload size={16} />}
          variant="light"
          onClick={exportToCSV}
        >
          Export to CSV ({filteredData.length} trips)
        </Button>
      </Group>

      <Filters data={data} onFilterChange={handleFilterChange} />

      <StatsCards statistics={statistics} />

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="overview" leftSection={<IconChartBar size={16} />}>
            Charts
          </Tabs.Tab>
          <Tabs.Tab value="map" leftSection={<IconMap size={16} />}>
            Map
          </Tabs.Tab>
          <Tabs.Tab value="table" leftSection={<IconList size={16} />}>
            Data Table
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview" pt="md">
          <ChartsView data={filteredData} />
        </Tabs.Panel>

        <Tabs.Panel value="map" pt="md">
          <MapView data={filteredData} />
        </Tabs.Panel>

        <Tabs.Panel value="table" pt="md">
          <TableView data={filteredData} />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}

export default Dashboard;
