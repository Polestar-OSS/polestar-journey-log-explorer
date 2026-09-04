import { useEffect, useRef, useMemo, useState } from 'react';
import { Box, Grid, Group, Select, Stack, Switch, Text, UnstyledButton, useComputedColorScheme } from '@mantine/core';
import { IconMapPin, IconFocus2 } from '@tabler/icons-react';
import { TileLayerFactory } from '../../strategies/map/LayerStrategy';
import { MarkerFactory } from '../../strategies/map/MarkerStrategy';
import { ColorCalculator } from '../../services/map/ColorCalculator';
import { FeatureBuilder } from '../../services/map/FeatureBuilder';
import { MapService } from '../../services/map/MapService';
import Eyebrow from '../ui/Eyebrow';
import 'ol/ol.css';

const EFFICIENCY_BANDS = [
    { key: 'good', label: '< 15', color: 'rgb(18, 184, 134)' },
    { key: 'ok', label: '15–20', color: 'rgb(250, 176, 5)' },
    { key: 'poor', label: '20–25', color: 'rgb(253, 126, 20)' },
    { key: 'bad', label: '25+', color: 'rgb(250, 82, 82)' },
];

function MapView({ data, distanceUnit = 'km', places }) {
    const mapRef = useRef(null);
    const mapServiceRef = useRef(null);
    const scheme = useComputedColorScheme('dark', { getInitialValueInEffect: false });
    const unit = distanceUnit === 'mi' ? 'mi' : 'km';
    const multiplier = distanceUnit === 'mi' ? 1.60934 : 1;

    const [selectedTrip, setSelectedTrip] = useState(null);
    const [linkTripsByDay, setLinkTripsByDay] = useState(false);
    const [tripsToShow, setTripsToShow] = useState('100');
    const [showHeatmap, setShowHeatmap] = useState(false);
    const [showMarkers, setShowMarkers] = useState(true);

    // Initialize services (Dependency Injection)
    const colorCalculator = useMemo(() => new ColorCalculator(distanceUnit), [distanceUnit]);
    const tileLayerFactory = useMemo(() => new TileLayerFactory(), []);
    const featureBuilder = useMemo(() => new FeatureBuilder(colorCalculator), [colorCalculator]);
    const markerFactory = useMemo(() => new MarkerFactory(colorCalculator), [colorCalculator]);

    const [selectedTileLayer, setSelectedTileLayer] = useState(() => tileLayerFactory.defaultFor(scheme));
    // Follow the UI theme unless the user has picked a basemap explicitly
    const userPickedLayer = useRef(false);
    useEffect(() => {
        if (!userPickedLayer.current) setSelectedTileLayer(tileLayerFactory.defaultFor(scheme));
    }, [scheme, tileLayerFactory]);

    const tileLayerOptions = tileLayerFactory.getAvailableLayers();

    const { center, allTrips, tripsByDay } = useMemo(() => {
        const validTrips = data.filter((trip) => trip.startLat !== 0 && trip.startLng !== 0 && trip.endLat !== 0 && trip.endLng !== 0);

        if (validTrips.length === 0) {
            return { center: [11.9746, 57.7089], allTrips: [], tripsByDay: {} }; // Gothenburg default (lon, lat)
        }

        const avgLat = validTrips.reduce((sum, trip) => sum + trip.startLat, 0) / validTrips.length;
        const avgLng = validTrips.reduce((sum, trip) => sum + trip.startLng, 0) / validTrips.length;
        const validCenter = [isFinite(avgLng) ? avgLng : 11.9746, isFinite(avgLat) ? avgLat : 57.7089];

        const grouped = validTrips.reduce((acc, trip) => {
            const day = trip.dayKey || trip.startDate.split(',')[0].trim();
            if (!acc[day]) acc[day] = [];
            acc[day].push(trip);
            return acc;
        }, {});
        Object.keys(grouped).forEach((day) => grouped[day].sort((a, b) => (a.startTs ?? 0) - (b.startTs ?? 0)));

        // Newest first so "show 100" means the 100 most recent
        const newestFirst = [...validTrips].sort((a, b) => (b.startTs ?? 0) - (a.startTs ?? 0));
        return { center: validCenter, allTrips: newestFirst, tripsByDay: grouped };
    }, [data]);

    const tripOptions = useMemo(
        () =>
            allTrips.map((trip, idx) => ({
                value: String(idx),
                label: `${trip.startDate} · ${trip.startAddress.substring(0, 28)} → ${trip.endAddress.substring(0, 28)} · ${trip.distanceKm} ${unit}`,
            })),
        [allTrips, unit]
    );

    const tripsToShowOptions = [
        { value: '25', label: 'Last 25 trips' },
        { value: '50', label: 'Last 50 trips' },
        { value: '100', label: 'Last 100 trips' },
        { value: '250', label: 'Last 250 trips' },
        { value: 'ALL', label: `All trips (${allTrips.length})` },
    ];

    const displayTrips = useMemo(
        () => (selectedTrip !== null ? [allTrips[parseInt(selectedTrip)]].filter(Boolean) : tripsToShow === 'ALL' ? allTrips : allTrips.slice(0, parseInt(tripsToShow))),
        [allTrips, selectedTrip, tripsToShow]
    );

    // Initialize map service
    useEffect(() => {
        if (!mapRef.current || mapServiceRef.current) return undefined;

        const mapService = new MapService(tileLayerFactory, featureBuilder, markerFactory);
        mapService.setDistanceUnit(distanceUnit);
        mapService.initializeMap(mapRef.current, center, selectedTileLayer);
        mapServiceRef.current = mapService;

        return () => {
            if (mapServiceRef.current) {
                mapServiceRef.current.destroy();
                mapServiceRef.current = null;
            }
        };
        // The map is created once per mount; later changes go through the effects below
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        mapServiceRef.current?.changeTileLayer(selectedTileLayer);
    }, [selectedTileLayer]);

    useEffect(() => {
        mapServiceRef.current?.setHeatmapVisibility(showHeatmap);
    }, [showHeatmap]);

    // Update features when data or options change
    useEffect(() => {
        if (!mapServiceRef.current) return;

        const features = [];
        const heatmapFeatures = [];

        displayTrips.forEach((trip, tripIdx) => {
            features.push(featureBuilder.createRouteLine(trip, tripIdx));
            if (showMarkers) {
                features.push(markerFactory.createMarker(trip, 'start', tripIdx), markerFactory.createMarker(trip, 'end', tripIdx));
            }
            heatmapFeatures.push(featureBuilder.createHeatmapPoint(trip.startLng, trip.startLat), featureBuilder.createHeatmapPoint(trip.endLng, trip.endLat));
        });

        if (linkTripsByDay && selectedTrip === null) {
            const shown = new Set(displayTrips.map((t) => t.id));
            Object.entries(tripsByDay).forEach(([, trips], dayIdx) => {
                trips.forEach((trip, idx) => {
                    const nextTrip = trips[idx + 1];
                    if (nextTrip && shown.has(trip.id) && shown.has(nextTrip.id)) {
                        features.push(featureBuilder.createDayConnectionLine(trip, nextTrip, dayIdx));
                    }
                });
            });
        }

        mapServiceRef.current.updateFeatures(features, heatmapFeatures);
        mapServiceRef.current.fitToFeatures(features);
    }, [displayTrips, linkTripsByDay, selectedTrip, tripsByDay, showMarkers, featureBuilder, markerFactory]);

    const focusPlace = (place) => {
        setSelectedTrip(null);
        mapServiceRef.current?.updateView([place.lng, place.lat], 14);
    };

    return (
        <Grid gutter="md">
            <Grid.Col span={{ base: 12, md: 4, lg: 3 }}>
                <Stack gap="md">
                    <Box className="ps-card ps-rise" p="md" style={{ position: 'relative', zIndex: 5 }}>
                        <Stack gap="sm">
                            <Eyebrow>What to show</Eyebrow>
                            <Select
                                size="xs"
                                label="Single trip"
                                placeholder="All recent trips"
                                data={tripOptions}
                                value={selectedTrip}
                                onChange={setSelectedTrip}
                                searchable
                                clearable
                                maxDropdownHeight={320}
                                nothingFoundMessage="No trip matches"
                            />
                            <Select size="xs" label="Trips on the map" value={tripsToShow} onChange={setTripsToShow} data={tripsToShowOptions} disabled={selectedTrip !== null} />
                            <Select
                                size="xs"
                                label="Basemap"
                                value={selectedTileLayer}
                                onChange={(v) => {
                                    userPickedLayer.current = true;
                                    setSelectedTileLayer(v);
                                }}
                                data={tileLayerOptions}
                            />
                            <Switch size="sm" color="polestar" label="Link trips by day" description="Dashed chains between consecutive trips" checked={linkTripsByDay} onChange={(e) => setLinkTripsByDay(e.currentTarget.checked)} disabled={selectedTrip !== null} />
                            <Switch size="sm" color="polestar" label="Density heatmap" checked={showHeatmap} onChange={(e) => setShowHeatmap(e.currentTarget.checked)} />
                            <Switch size="sm" color="polestar" label="Start / end pins" checked={showMarkers} onChange={(e) => setShowMarkers(e.currentTarget.checked)} />
                        </Stack>
                    </Box>

                    <Box className="ps-card ps-rise" p="md" style={{ '--i': 1 }}>
                        <Eyebrow>Route colour · kWh/100{unit}</Eyebrow>
                        <Stack gap={6} mt="sm">
                            {EFFICIENCY_BANDS.map((b) => (
                                <Group key={b.key} gap="sm" wrap="nowrap">
                                    <Box style={{ width: 22, height: 3, background: b.color, borderRadius: 2, flexShrink: 0 }} />
                                    <Text size="xs" className="ps-tabular">
                                        {b.label.replace(/(\d+)/g, (n) => Math.round(parseInt(n) * multiplier))}
                                    </Text>
                                    <Text size="xs" c="dimmed" ml="auto" tt="capitalize">{b.key === 'ok' ? 'typical' : b.key}</Text>
                                </Group>
                            ))}
                        </Stack>
                    </Box>

                    {places?.top?.length > 0 && (
                        <Box className="ps-card ps-rise" p="md" style={{ '--i': 2 }}>
                            <Eyebrow>Most visited</Eyebrow>
                            <Stack gap={4} mt="sm">
                                {places.top.slice(0, 5).map((p, idx) => (
                                    <UnstyledButton key={`${p.lat},${p.lng}`} onClick={() => focusPlace(p)} style={{ borderRadius: 2 }} className="ps-place-row">
                                        <Group gap="sm" wrap="nowrap" py={4}>
                                            <IconMapPin size={14} style={{ color: idx === 0 ? 'var(--ps-accent)' : 'var(--ps-muted)', flexShrink: 0 }} />
                                            <Text size="xs" style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.address}>
                                                {p.address}
                                            </Text>
                                            <Text size="xs" c="dimmed" className="ps-tabular" style={{ whiteSpace: 'nowrap' }}>{p.visits}</Text>
                                            <IconFocus2 size={12} style={{ color: 'var(--ps-muted)', flexShrink: 0 }} />
                                        </Group>
                                    </UnstyledButton>
                                ))}
                            </Stack>
                        </Box>
                    )}
                </Stack>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 8, lg: 9 }}>
                <Box className="ps-card ps-rise" style={{ '--i': 1, height: 'min(72vh, 720px)', minHeight: 420, position: 'relative', overflow: 'hidden', zIndex: 1 }}>
                    {allTrips.length > 0 ? (
                        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
                    ) : (
                        <Stack align="center" justify="center" h="100%" gap="xs">
                            <IconMapPin size={28} stroke={1.5} style={{ color: 'var(--ps-muted)' }} />
                            <Text c="dimmed" ta="center">No trips with coordinates in this selection.</Text>
                        </Stack>
                    )}
                    <Box style={{ position: 'absolute', top: 10, right: 52, zIndex: 2 }} className="ps-no-print">
                        <Text size="xs" c="dimmed" style={{ background: 'color-mix(in srgb, var(--ps-surface) 85%, transparent)', padding: '3px 8px', borderRadius: 2, border: '1px solid var(--ps-border)' }} className="ps-tabular">
                            {displayTrips.length} of {allTrips.length} trips
                        </Text>
                    </Box>
                </Box>
            </Grid.Col>
        </Grid>
    );
}

export default MapView;
