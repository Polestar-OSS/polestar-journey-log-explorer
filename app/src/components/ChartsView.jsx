import { useMemo } from 'react';
import { Paper, Title, Grid } from '@mantine/core';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function ChartsView({ data, distanceUnit = 'km' }) {
  const distLabel = distanceUnit === 'mi' ? 'mi' : 'km';

  const chartData = useMemo(() => {
    const multiplier = distanceUnit === 'mi' ? 1.60934 : 1;
    // Distance over time
    const distanceByDate = data.reduce((acc, trip) => {
      const date = trip.startDate.split(',')[0];
      if (!acc[date]) {
        acc[date] = { date, distance: 0, consumption: 0, trips: 0 };
      }
      acc[date].distance += trip.distanceKm;
      acc[date].consumption += trip.consumptionKwh;
      acc[date].trips += 1;
      return acc;
    }, {});

    const timeSeriesData = Object.values(distanceByDate)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-30); // Last 30 days

    // Efficiency distribution
    const efficiencyData = data
      .filter(trip => trip.efficiency > 0 && trip.efficiency < Math.round(50 * multiplier))
      .map(trip => ({
        efficiency: parseFloat(trip.efficiency),
        distance: trip.distanceKm,
      }))
      .sort((a, b) => a.efficiency - b.efficiency);

    // Trip distance distribution
    const u = distanceUnit === 'mi' ? 'mi' : 'km';
    const r1 = Math.round(5 / multiplier);
    const r2 = Math.round(10 / multiplier);
    const r3 = Math.round(20 / multiplier);
    const r4 = Math.round(50 / multiplier);
    const distanceRanges = [
      { range: `0-${r1} ${u}`, min: 0, max: r1, count: 0 },
      { range: `${r1}-${r2} ${u}`, min: r1, max: r2, count: 0 },
      { range: `${r2}-${r3} ${u}`, min: r2, max: r3, count: 0 },
      { range: `${r3}-${r4} ${u}`, min: r3, max: r4, count: 0 },
      { range: `${r4}+ ${u}`, min: r4, max: Infinity, count: 0 },
    ];

    data.forEach(trip => {
      const range = distanceRanges.find(r => trip.distanceKm >= r.min && trip.distanceKm < r.max);
      if (range) range.count++;
    });

    // SOC analysis
    const socData = data
      .slice(-20)
      .map((trip, idx) => ({
        trip: `Trip ${idx + 1}`,
        startSOC: trip.socSource,
        endSOC: trip.socDestination,
        drop: trip.socDrop,
      }));

    return {
      timeSeriesData,
      efficiencyData,
      distanceRanges,
      socData,
    };
  }, [data, distanceUnit]);

  const COLORS = ['#228be6', '#12b886', '#fab005', '#fa5252', '#be4bdb'];

  return (
    <Grid gutter="md">
      <Grid.Col span={{ base: 12, md: 6 }}>
        <Paper p="md" withBorder>
          <Title order={4} mb="md">Daily Distance & Consumption</Title>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData.timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{ fontSize: 12 }}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="distance" stroke="#228be6" name={`Distance (${distLabel})`} />
              <Line type="monotone" dataKey="consumption" stroke="#fab005" name="Consumption (kWh)" />
            </LineChart>
          </ResponsiveContainer>
        </Paper>
      </Grid.Col>

      <Grid.Col span={{ base: 12, md: 6 }}>
        <Paper p="md" withBorder>
          <Title order={4} mb="md">Trip Distance Distribution</Title>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData.distanceRanges}
                dataKey="count"
                nameKey="range"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ range, count }) => `${range}: ${count}`}
              >
                {chartData.distanceRanges.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Paper>
      </Grid.Col>

      <Grid.Col span={{ base: 12, md: 6 }}>
        <Paper p="md" withBorder>
          <Title order={4} mb="md">Efficiency per Trip</Title>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData.efficiencyData.slice(0, 30)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="distance" label={{ value: `Distance (${distLabel})`, position: 'insideBottom', offset: -5 }} />
              <YAxis label={{ value: `Efficiency (kWh/100${distLabel})`, angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Bar dataKey="efficiency" fill="#12b886" />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      </Grid.Col>

      <Grid.Col span={{ base: 12, md: 6 }}>
        <Paper p="md" withBorder>
          <Title order={4} mb="md">Battery SOC Changes (Last 20 Trips)</Title>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData.socData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="trip" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} label={{ value: 'SOC (%)', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="startSOC" stroke="#228be6" name="Start SOC" />
              <Line type="monotone" dataKey="endSOC" stroke="#fa5252" name="End SOC" />
            </LineChart>
          </ResponsiveContainer>
        </Paper>
      </Grid.Col>

      <Grid.Col span={12}>
        <Paper p="md" withBorder>
          <Title order={4} mb="md">Daily Trip Count</Title>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData.timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 12 }} />
              <YAxis />
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
