import { useMemo } from "react";
import { Paper, Title, Grid } from "@mantine/core";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ChartDataProcessor } from "../../services/charts/ChartDataProcessor";

function ChartsView({ data }) {
  // Initialize service using useMemo (Dependency Injection)
  const chartDataProcessor = useMemo(() => new ChartDataProcessor(), []);

  // Process chart data using service
  const chartData = useMemo(() => {
    return {
      timeSeriesData: chartDataProcessor.processTimeSeriesData(data, 30),
      efficiencyData: chartDataProcessor.processEfficiencyData(data, 0, 50),
      distanceRanges: chartDataProcessor.processDistanceRanges(data),
      socData: chartDataProcessor.processSOCData(data, 20),
    };
  }, [data, chartDataProcessor]);

  const COLORS = ["#228be6", "#12b886", "#fab005", "#fa5252", "#be4bdb"];

  return (
    <Grid gutter="md">
      <Grid.Col span={12}>
        <Paper p={{ base: "xs", sm: "md" }} withBorder>
          <Title order={4} mb="md" size={{ base: "h5", sm: "h4" }}>
            Daily Distance & Consumption
          </Title>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData.timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{ fontSize: 11 }}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Line
                type="monotone"
                dataKey="distance"
                stroke="#228be6"
                name="Distance (km)"
              />
              <Line
                type="monotone"
                dataKey="consumption"
                stroke="#fab005"
                name="Consumption (kWh)"
              />
            </LineChart>
          </ResponsiveContainer>
        </Paper>
      </Grid.Col>

      <Grid.Col span={12}>
        <Paper p={{ base: "xs", sm: "md" }} withBorder>
          <Title order={4} mb="md" size={{ base: "h5", sm: "h4" }}>
            Trip Distance Distribution
          </Title>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={chartData.distanceRanges}
                dataKey="count"
                nameKey="range"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={({ range, count }) => `${range}: ${count}`}
              >
                {chartData.distanceRanges.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Paper>
      </Grid.Col>

      <Grid.Col span={12}>
        <Paper p={{ base: "xs", sm: "md" }} withBorder>
          <Title order={4} mb="md" size={{ base: "h5", sm: "h4" }}>
            Efficiency per Trip
          </Title>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData.efficiencyData.slice(0, 30)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="distance"
                label={{
                  value: "Distance (km)",
                  position: "insideBottom",
                  offset: -5,
                  fontSize: 11,
                }}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                label={{
                  value: "Efficiency (kWh/100km)",
                  angle: -90,
                  position: "insideLeft",
                  fontSize: 11,
                }}
                tick={{ fontSize: 11 }}
              />
              <Tooltip />
              <Bar dataKey="efficiency" fill="#12b886" />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      </Grid.Col>

      <Grid.Col span={12}>
        <Paper p={{ base: "xs", sm: "md" }} withBorder>
          <Title order={4} mb="md" size={{ base: "h5", sm: "h4" }}>
            Battery SOC Changes (Last 20 Trips)
          </Title>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData.socData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="trip"
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                domain={[0, 100]}
                label={{
                  value: "SOC (%)",
                  angle: -90,
                  position: "insideLeft",
                  fontSize: 11,
                }}
                tick={{ fontSize: 11 }}
              />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Line
                type="monotone"
                dataKey="startSOC"
                stroke="#228be6"
                name="Start SOC"
              />
              <Line
                type="monotone"
                dataKey="endSOC"
                stroke="#fa5252"
                name="End SOC"
              />
            </LineChart>
          </ResponsiveContainer>
        </Paper>
      </Grid.Col>

      <Grid.Col span={12}>
        <Paper p={{ base: "xs", sm: "md" }} withBorder>
          <Title order={4} mb="md" size={{ base: "h5", sm: "h4" }}>
            Daily Trip Count
          </Title>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData.timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{ fontSize: { base: 10, sm: 12 } }}
              />
              <YAxis tick={{ fontSize: { base: 10, sm: 12 } }} />
              <Tooltip />
              <Bar dataKey="trips" fill="#be4bdb" name="Number of Trips" />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      </Grid.Col>
    </Grid>
  );
}

export default ChartsView;
