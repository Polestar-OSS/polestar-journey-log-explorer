import { useMemo, useState } from 'react';
import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { Paper, Select, Text, Badge, Group, Stack, Switch } from '@mantine/core';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapView({ data }) {
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [linkTripsByDay, setLinkTripsByDay] = useState(false);
  const [tripsToShow, setTripsToShow] = useState('100');

  const { center, allTrips, tripsByDay } = useMemo(() => {
    const validTrips = data.filter(
      trip => trip.startLat !== 0 && trip.startLng !== 0 && trip.endLat !== 0 && trip.endLng !== 0
    );

    if (validTrips.length === 0) {
      return { center: [45.4215, -75.6972], allTrips: [], tripsByDay: {} }; // Ottawa default
    }

    // Calculate center with better validation
    const avgLat = validTrips.reduce((sum, trip) => sum + trip.startLat, 0) / validTrips.length;
    const avgLng = validTrips.reduce((sum, trip) => sum + trip.startLng, 0) / validTrips.length;

    // Ensure valid coordinates
    const validCenter = [
      isFinite(avgLat) ? avgLat : 45.4215,
      isFinite(avgLng) ? avgLng : -75.6972
    ];

    // Group trips by day
    const grouped = validTrips.reduce((acc, trip) => {
      const day = trip.startDate.split(',')[0].trim();
      if (!acc[day]) acc[day] = [];
      acc[day].push(trip);
      return acc;
    }, {});

    // Sort trips within each day chronologically
    Object.keys(grouped).forEach(day => {
      grouped[day].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    });

    return {
      center: validCenter,
      allTrips: validTrips,
      tripsByDay: grouped,
    };
  }, [data]);

  const tripOptions = allTrips.map((trip, idx) => ({
    value: String(idx),
    label: `${trip.startDate} - ${trip.startAddress.substring(0, 30)}... → ${trip.endAddress.substring(0, 30)}...`,
  }));

  // Generate options for trips to show dropdown
  const tripsToShowOptions = [
    { value: '10', label: '10 trips' },
    { value: '20', label: '20 trips' },
    { value: '30', label: '30 trips' },
    { value: '40', label: '40 trips' },
    { value: '50', label: '50 trips' },
    { value: '60', label: '60 trips' },
    { value: '70', label: '70 trips' },
    { value: '80', label: '80 trips' },
    { value: '90', label: '90 trips' },
    { value: '100', label: '100 trips' },
    { value: 'ALL', label: `All trips (${allTrips.length})` },
  ];

  // Show selected trip or limited/all trips based on dropdown
  const displayTrips = selectedTrip !== null 
    ? [allTrips[parseInt(selectedTrip)]] 
    : (tripsToShow === 'ALL' ? allTrips : allTrips.slice(0, parseInt(tripsToShow)));

  const getEfficiencyColor = (efficiency) => {
    const eff = parseFloat(efficiency);
    if (eff < 15) return 'green';
    if (eff < 20) return 'yellow';
    if (eff < 25) return 'orange';
    return 'red';
  };

  // Generate colors for different days
  const dayColors = ['#12b886', '#15aabf', '#4c6ef5', '#7950f2', '#e64980', '#fd7e14', '#fab005'];
  const getDayColor = (dayIndex) => dayColors[dayIndex % dayColors.length];

  return (
    <Stack gap="md">
      <Paper p="md" withBorder style={{ position: 'relative', zIndex: 1000 }}>
        <Stack gap="md">
          <Select
            label="Select a specific trip (or leave empty to show all recent trips)"
            placeholder="Show all trips"
            data={tripOptions}
            value={selectedTrip}
            onChange={setSelectedTrip}
            searchable
            clearable
            maxDropdownHeight={400}
          />
          
          <Group grow align="flex-end">
            <Select
              label="How many trips to show"
              value={tripsToShow}
              onChange={setTripsToShow}
              data={tripsToShowOptions}
              disabled={selectedTrip !== null}
            />
            
            <Switch
              label="Link trips by day"
              description="Shows daily journey chains"
              checked={linkTripsByDay}
              onChange={(event) => setLinkTripsByDay(event.currentTarget.checked)}
              disabled={selectedTrip !== null}
            />
          </Group>
        </Stack>
      </Paper>

      <Paper p="md" withBorder style={{ height: '600px', position: 'relative', zIndex: 1 }}>
        {allTrips.length > 0 ? (
          <MapContainer
            center={center}
            zoom={selectedTrip !== null ? 12 : 11}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
              minZoom={3}
            />

          {/* Always show individual trip markers and routes */}
          {displayTrips.map((trip, idx) => {
            const positions = [
              [trip.startLat, trip.startLng],
              [trip.endLat, trip.endLng],
            ];

            // Get day for color coding when linking is enabled
            const tripDay = trip.startDate.split(',')[0].trim();
            const dayKeys = Object.keys(tripsByDay).sort();
            const dayIndex = dayKeys.indexOf(tripDay);
            const dayColor = linkTripsByDay ? getDayColor(dayIndex) : null;

            return (
              <React.Fragment key={trip.id}>
                <Polyline 
                  positions={positions} 
                  color={getEfficiencyColor(trip.efficiency) === 'green' ? '#12b886' : 
                         getEfficiencyColor(trip.efficiency) === 'yellow' ? '#fab005' :
                         getEfficiencyColor(trip.efficiency) === 'orange' ? '#fd7e14' : '#fa5252'}
                  weight={3}
                  opacity={0.7}
                />
                
                <Marker position={[trip.startLat, trip.startLng]}>
                  <Popup>
                    <Stack gap="xs">
                      <Text size="sm" fw={700}>Trip Start</Text>
                      <Text size="xs">{trip.startDate}</Text>
                      <Text size="xs">{trip.startAddress}</Text>
                      <Badge color="blue" size="sm">SOC: {trip.socSource}%</Badge>
                      {linkTripsByDay && <Badge style={{ backgroundColor: dayColor }} size="sm">Day: {tripDay}</Badge>}
                    </Stack>
                  </Popup>
                </Marker>

                <Marker position={[trip.endLat, trip.endLng]}>
                  <Popup>
                    <Stack gap="xs">
                      <Text size="sm" fw={700}>Trip End</Text>
                      <Text size="xs">{trip.endDate}</Text>
                      <Text size="xs">{trip.endAddress}</Text>
                      <Group gap="xs">
                        <Badge color="blue" size="sm">SOC: {trip.socDestination}%</Badge>
                        <Badge color={getEfficiencyColor(trip.efficiency)} size="sm">
                          {trip.efficiency} kWh/100km
                        </Badge>
                      </Group>
                      <Text size="xs">Distance: {trip.distanceKm} km</Text>
                      <Text size="xs">Consumption: {trip.consumptionKwh} kWh</Text>
                      {linkTripsByDay && <Badge style={{ backgroundColor: dayColor }} size="sm">Day: {tripDay}</Badge>}
                    </Stack>
                  </Popup>
                </Marker>
              </React.Fragment>
            );
          })}

          {/* Add day linking polylines when toggle is on */}
          {linkTripsByDay && Object.entries(tripsByDay).map(([day, trips], dayIdx) => {
            const color = getDayColor(dayIdx);

            return trips.map((trip, idx) => {
              // Draw connection line from this trip's end to next trip's start
              if (idx < trips.length - 1) {
                const nextTrip = trips[idx + 1];
                return (
                  <Polyline
                    key={`connection-${trip.id}-${nextTrip.id}`}
                    positions={[
                      [trip.endLat, trip.endLng],
                      [nextTrip.startLat, nextTrip.startLng]
                    ]}
                    color={color}
                    weight={4}
                    opacity={0.5}
                    dashArray="10, 5"
                  />
                );
              }
              return null;
            });
          })}
          </MapContainer>
        ) : (
          <Text c="dimmed" ta="center" p="xl">
            No valid trip data to display on map
          </Text>
        )}
      </Paper>
    </Stack>
  );
}

export default MapView;
