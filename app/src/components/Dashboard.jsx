import { useMemo, useState } from "react";
import {
  Button,
  Stack,
  Tabs,
  Group,
  ActionIcon,
  Tooltip,
  Text,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconChartBar,
  IconMap,
  IconList,
  IconDownload,
  IconHelp,
  IconBook,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import StatsCards from "./stats/StatsCards";
import ChartsView from "./charts/ChartsView";
import MapView from "./map/MapView";
import TableView from "./table/TableView";
import DataGuide from "./DataGuide";
import Filters from "./filters/Filters";
import { calculateStatistics } from "../utils/dataParser";
import { TableExporter } from "../services/table/TableDataProcessor";
import HelpModal from "./HelpModal";

// Columns to be used for CSV export and potentially other components.
const COLUMNS = [
  { key: "startDate", label: "Start Date" },
  { key: "endDate", label: "End Date" },
  { key: "startAddress", label: "Start Address" },
  { key: "endAddress", label: "End Address" },
  { key: "distanceKm", label: "Distance (km)" },
  { key: "consumptionKwh", label: "Consumption (kWh)" },
  { key: "efficiency", label: "Efficiency (kWh/100km)" },
  { key: "category", label: "Category" },
  { key: "socSource", label: "SOC Start" },
  { key: "socDestination", label: "SOC End" },
  { key: "socDrop", label: "SOC Drop" },
  { key: "startOdometer", label: "Start Odometer" },
  { key: "endOdometer", label: "End Odometer" },
];

// Initialize the stateless TableExporter once outside the component
const tableExporter = new TableExporter();

function Dashboard({ data, onReset }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [filteredData, setFilteredData] = useState(data);
  const [helpOpened, setHelpOpened] = useState(false);

  const statistics = useMemo(
    () => calculateStatistics(filteredData),
    [filteredData]
  );

  const handleFilterChange = (filtered) => {
    setFilteredData(filtered);
  };

  const exportToCSV = () => {
    const csvContent = tableExporter.exportToCSV(filteredData, COLUMNS);
    const filename = `polestar-journey-export-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    tableExporter.downloadFile(csvContent, filename, "text/csv;charset=utf-8;");

    notifications.show({
      title: "Export successful",
      message: `Exported ${filteredData.length} trips to CSV`,
      color: "green",
    });
  };

  return (
    <Stack gap="md">
      <Stack gap="xs">
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <Button
            leftSection={<IconArrowLeft size={16} />}
            variant="subtle"
            onClick={onReset}
            size="sm"
          >
            Upload New File
          </Button>
          <Group gap="xs">
            <Button
              leftSection={<IconDownload size={16} />}
              variant="light"
              onClick={exportToCSV}
              size="sm"
            >
              <Text visibleFrom="sm">
                Export to CSV ({filteredData.length} trips)
              </Text>
              <Text hiddenFrom="sm">Export ({filteredData.length})</Text>
            </Button>
            <Tooltip label="How to get your journey data">
              <ActionIcon
                variant="light"
                size="lg"
                onClick={() => setHelpOpened(true)}
              >
                <IconHelp size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      </Stack>

      <Filters data={data} onFilterChange={handleFilterChange} />

      <StatsCards statistics={statistics} />

      <Tabs
        value={activeTab}
        onChange={setActiveTab}
        orientation={{ base: "horizontal", sm: "horizontal" }}
        keepMounted={false}
      >
        <Tabs.List grow={{ base: true, sm: false }}>
          <Tabs.Tab value="overview" leftSection={<IconChartBar size={16} />}>
            <Text visibleFrom="sm">Charts</Text>
            <Text hiddenFrom="sm" size="xs">
              Charts
            </Text>
          </Tabs.Tab>
          <Tabs.Tab value="map" leftSection={<IconMap size={16} />}>
            <Text visibleFrom="sm">Map</Text>
            <Text hiddenFrom="sm" size="xs">
              Map
            </Text>
          </Tabs.Tab>
          <Tabs.Tab value="table" leftSection={<IconList size={16} />}>
            <Text visibleFrom="sm">Data Table</Text>
            <Text hiddenFrom="sm" size="xs">
              Table
            </Text>
          </Tabs.Tab>
          <Tabs.Tab value="guide" leftSection={<IconBook size={16} />}>
            <Text visibleFrom="sm">Understand your data</Text>
            <Text hiddenFrom="sm" size="xs">
              Guide
            </Text>
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

        <Tabs.Panel value="guide" pt="md">
          <DataGuide />
        </Tabs.Panel>
      </Tabs>

      <HelpModal opened={helpOpened} onClose={() => setHelpOpened(false)} />
    </Stack>
  );
}

export default Dashboard;
