import { useEffect, useRef, useMemo, useState } from 'react';
import { Paper, Select, Text, Badge, Group, Stack, Switch } from '@mantine/core';
import { TileLayerFactory } from '../strategies/LayerStrategy';
import { MarkerFactory } from '../strategies/MarkerStrategy';
import { ColorCalculator } from '../services/ColorCalculator';
import { FeatureBuilder } from '../services/FeatureBuilder';
import { MapService } from '../services/MapService';
import { Feature } from 'ol';
import { Point, LineString } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import 'ol/ol.css';

function MapView({ data }) {
  const mapRef = useRef(null);
  const mapServiceRef = useRef(null);
  
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [linkTripsByDay, setLinkTripsByDay] = useState(false);
  const [tripsToShow, setTripsToShow] = useState('100');
  const [selectedTileLayer, setSelectedTileLayer] = useState('osm');
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showMarkers, setShowMarkers] = useState(true);

  // Initialize services (Dependency Injection)
  const colorCalculator = useMemo(() => new ColorCalculator(), []);
  const tileLayerFactory = useMemo(() => new TileLayerFactory(), []);
  const featureBuilder = useMemo(() => new FeatureBuilder(colorCalculator), [colorCalculator]);
  const markerFactory = useMemo(() => new MarkerFactory(colorCalculator), [colorCalculator]);

  const tileLayerOptions = tileLayerFactory.getAvailableLayers();

  const { center, allTrips, tripsByDay } = useMemo(() => {
    const validTrips = data.filter(
      trip => trip.startLat !== 0 && trip.startLng !== 0 && trip.endLat !== 0 && trip.endLng !== 0
    );

    if (validTrips.length === 0) {
      return { center: [-75.6972, 45.4215], allTrips: [], tripsByDay: {} }; // Ottawa default (lon, lat)
    }

    const avgLat = validTrips.reduce((sum, trip) => sum + trip.startLat, 0) / validTrips.length;
    const avgLng = validTrips.reduce((sum, trip) => sum + trip.startLng, 0) / validTrips.length;

    const validCenter = [
      isFinite(avgLng) ? avgLng : -75.6972,
      isFinite(avgLat) ? avgLat : 45.4215
    ];

    const grouped = validTrips.reduce((acc, trip) => {
      const day = trip.startDate.split(',')[0].trim();
      if (!acc[day]) acc[day] = [];
      acc[day].push(trip);
      return acc;
    }, {});

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

  const displayTrips = selectedTrip !== null 
    ? [allTrips[parseInt(selectedTrip)]] 
    : (tripsToShow === 'ALL' ? allTrips : allTrips.slice(0, parseInt(tripsToShow)));

  // Initialize map service
  useEffect(() => {
    if (!mapRef.current || mapServiceRef.current) return;

    const mapService = new MapService(tileLayerFactory, featureBuilder, markerFactory);
    mapService.initializeMap(mapRef.current, center, selectedTileLayer);
    mapServiceRef.current = mapService;

    return () => {
      if (mapServiceRef.current) {
        mapServiceRef.current.destroy();
        mapServiceRef.current = null;
      }
    };
  }, []);

  // Handle tile layer changes
  useEffect(() => {
    if (!mapServiceRef.current) return;
    mapServiceRef.current.changeTileLayer(selectedTileLayer);
  }, [selectedTileLayer]);

  // Handle heatmap visibility
  useEffect(() => {
    if (!mapServiceRef.current) return;
    mapServiceRef.current.setHeatmapVisibility(showHeatmap);
  }, [showHeatmap]);

  // Update map view and features when data changes
  useEffect(() => {
    if (!mapServiceRef.current) return;

    const features = [];
    const heatmapFeatures = [];

    // Generate trip features using FeatureBuilder and MarkerFactory
    displayTrips.forEach((trip, tripIdx) => {
      // Route line
      const routeLine = featureBuilder.createRouteLine(trip, tripIdx);
      features.push(routeLine);

      // Add markers if enabled
      if (showMarkers) {
        const startMarker = markerFactory.createMarker(trip, 'start', tripIdx);
        const endMarker = markerFactory.createMarker(trip, 'end', tripIdx);
        features.push(startMarker, endMarker);
      }

      // Heatmap points
      heatmapFeatures.push(
        featureBuilder.createHeatmapPoint(trip.startLng, trip.startLat),
        featureBuilder.createHeatmapPoint(trip.endLng, trip.endLat)
      );
    });

    // Add day connection lines if enabled
    if (linkTripsByDay) {
      Object.entries(tripsByDay).forEach(([day, trips], dayIdx) => {
        trips.forEach((trip, idx) => {
          if (idx < trips.length - 1) {
            const nextTrip = trips[idx + 1];
            const connectionLine = featureBuilder.createDayConnectionLine(trip, nextTrip, dayIdx);
            features.push(connectionLine);
          }
        });
      });
    }

    // Update map view and features
    mapServiceRef.current.updateView(center, selectedTrip !== null ? 12 : 11);
    mapServiceRef.current.updateFeatures(features, heatmapFeatures);
  }, [displayTrips, linkTripsByDay, center, selectedTrip, tripsByDay, showMarkers]);

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
            
            <Select
              label="Map tile layer"
              value={selectedTileLayer}
              onChange={setSelectedTileLayer}
              data={tileLayerOptions}
            />
            
            <Switch
              label="Link trips by day"
              description="Shows daily journey chains"
              checked={linkTripsByDay}
              onChange={(event) => setLinkTripsByDay(event.currentTarget.checked)}
              disabled={selectedTrip !== null}
            />
            
            <Switch
              label="Show heatmap"
              description="Display density heatmap"
              checked={showHeatmap}
              onChange={(event) => setShowHeatmap(event.currentTarget.checked)}
            />
            
            <Switch
              label="Show markers"
              description="Display trip start/end pins"
              checked={showMarkers}
              onChange={(event) => setShowMarkers(event.currentTarget.checked)}
            />
          </Group>
        </Stack>
      </Paper>

      <Paper p="md" withBorder style={{ height: '600px', position: 'relative', zIndex: 1 }}>
        {allTrips.length > 0 ? (
          <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
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
