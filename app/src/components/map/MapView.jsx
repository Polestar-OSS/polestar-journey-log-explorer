import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActionIcon, Box, Button, Drawer, Group, Modal, Progress, ScrollArea, SegmentedControl, Select, Slider, Stack, Switch, Text, Tooltip, UnstyledButton, useComputedColorScheme } from '@mantine/core';
import { useMediaQuery, useReducedMotion } from '@mantine/hooks';
import { IconMapPin, IconFocus2, IconPlayerPlay, IconPlayerPause, IconPlayerSkipBack, IconAdjustments, IconRoute, IconFlame, IconBuildingCommunity, IconHistory, IconRoad } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { TileLayerFactory } from '../../strategies/map/LayerStrategy';
import { MarkerFactory } from '../../strategies/map/MarkerStrategy';
import { ColorCalculator } from '../../services/map/ColorCalculator';
import { FeatureBuilder } from '../../services/map/FeatureBuilder';
import { MapService } from '../../services/map/MapService';
import { RouteSnapper } from '../../services/map/RouteSnapper';
import { ReplayService } from '../../services/map/ReplayService';
import { MapDataProcessor } from '../../services/map/MapDataProcessor';
import { useTokens } from '../../theme/useTokens';
import { formatNumber } from '../../utils/format';
import Eyebrow from '../ui/Eyebrow';
import 'ol/ol.css';

const EFFICIENCY_BANDS = [
    { key: 'good', label: '< 15', color: 'rgb(18, 184, 134)', name: 'efficient' },
    { key: 'ok', label: '15–20', color: 'rgb(250, 176, 5)', name: 'typical' },
    { key: 'poor', label: '20–25', color: 'rgb(253, 126, 20)', name: 'high' },
    { key: 'bad', label: '25+', color: 'rgb(250, 82, 82)', name: 'very high' },
];

const MODES = [
    { value: 'routes', label: 'Routes', icon: IconRoute },
    { value: 'heat', label: 'Heat', icon: IconFlame },
    { value: 'places', label: 'Places', icon: IconBuildingCommunity },
    { value: 'replay', label: 'Replay', icon: IconHistory },
];

const snapper = new RouteSnapper();
const replayService = new ReplayService();
const mapDataProcessor = new MapDataProcessor();

function Glass({ children, style, ...props }) {
    return (
        <Box className="ps-glass" style={style} {...props}>
            {children}
        </Box>
    );
}

/**
 * The map. Four modes over one feature pipeline:
 *  routes  - glow routes with directional flow, clustered pins, day chains
 *  heat    - density of starts and ends
 *  places  - bubbles for the most visited places
 *  replay  - the journey replayed day by day with a scrubber
 */
function MapView({ data, distanceUnit = 'km', places }) {
    const mapRef = useRef(null);
    const mapServiceRef = useRef(null);
    const t = useTokens();
    const scheme = useComputedColorScheme('dark', { getInitialValueInEffect: false });
    const reducedMotion = useReducedMotion();
    const isMobile = useMediaQuery('(max-width: 48em)');
    const unit = distanceUnit === 'mi' ? 'mi' : 'km';
    const multiplier = distanceUnit === 'mi' ? 1.60934 : 1;

    const [mode, setMode] = useState('routes');
    const [selectedTrip, setSelectedTrip] = useState(null);
    const [tripsToShow, setTripsToShow] = useState('150');
    const [showMarkers, setShowMarkers] = useState(true);
    const [linkTripsByDay, setLinkTripsByDay] = useState(false);
    const [flow, setFlow] = useState(!reducedMotion);
    const [snapRoads, setSnapRoads] = useState(false);
    const [snapConsent, setSnapConsent] = useState(false);
    const [snapProgress, setSnapProgress] = useState(null); // { done, total }
    const [snapVersion, setSnapVersion] = useState(0);
    const [drawerOpened, setDrawerOpened] = useState(false);
    const [hoverTrip, setHoverTrip] = useState(null);
    const [inView, setInView] = useState(null);

    // Replay
    const [cursor, setCursor] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [speed, setSpeed] = useState('2');

    // Services (Dependency Injection)
    const colorCalculator = useMemo(() => new ColorCalculator(distanceUnit), [distanceUnit]);
    const tileLayerFactory = useMemo(() => new TileLayerFactory(), []);
    const featureBuilder = useMemo(() => new FeatureBuilder(colorCalculator), [colorCalculator]);
    const markerFactory = useMemo(() => new MarkerFactory(colorCalculator), [colorCalculator]);

    const [basemap, setBasemap] = useState(() => tileLayerFactory.defaultFor(scheme));
    const userPickedBasemap = useRef(false);
    useEffect(() => {
        if (!userPickedBasemap.current) setBasemap(tileLayerFactory.defaultFor(scheme));
    }, [scheme, tileLayerFactory]);

    const { center, allTrips, tripsByDay } = useMemo(() => mapDataProcessor.prepare(data), [data]);

    const replay = useMemo(() => replayService.build([...allTrips].reverse()), [allTrips]);

    const tripOptions = useMemo(
        () => allTrips.map((trip, idx) => ({ value: String(idx), label: `${trip.startDate} · ${trip.startAddress.substring(0, 26)} → ${trip.endAddress.substring(0, 26)} · ${trip.distanceKm} ${unit}` })),
        [allTrips, unit]
    );

    const displayTrips = useMemo(() => {
        if (selectedTrip !== null) return [allTrips[parseInt(selectedTrip)]].filter(Boolean);
        if (mode === 'replay') return allTrips;
        return tripsToShow === 'ALL' ? allTrips : allTrips.slice(0, parseInt(tripsToShow));
    }, [allTrips, selectedTrip, tripsToShow, mode]);

    // ------------------------------------------------------------------
    // Map lifecycle
    // ------------------------------------------------------------------

    useEffect(() => {
        if (!mapRef.current || mapServiceRef.current) return undefined;
        const service = new MapService(tileLayerFactory, featureBuilder, markerFactory);
        service.setDistanceUnit(distanceUnit);
        service.setReducedMotion(reducedMotion);
        service.setTheme({ accent: t.accent, surface: t.surface, ink: t.ink, ink2: t.ink2, flow: scheme === 'dark' ? 'rgba(255,255,255,0.8)' : 'rgba(16,16,16,0.7)' });
        service.onHover = setHoverTrip;
        service.initializeMap(mapRef.current, center, basemap);
        service.onMoveEnd(() => setInView(service.tripsInView().length));
        mapServiceRef.current = service;
        return () => {
            service.destroy();
            mapServiceRef.current = null;
        };
        // Created once per mount; later changes flow through the effects below
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        mapServiceRef.current?.changeTileLayer(basemap);
        mapServiceRef.current?.setTheme({ flow: tileLayerFactory.isDark(basemap) ? 'rgba(255,255,255,0.8)' : 'rgba(16,16,16,0.7)' });
    }, [basemap, tileLayerFactory]);

    useEffect(() => {
        mapServiceRef.current?.setTheme({ accent: t.accent, surface: t.surface, ink: t.ink, ink2: t.ink2 });
    }, [t]);

    useEffect(() => {
        mapServiceRef.current?.setMode(mode);
        mapServiceRef.current?.setFlowAnimation(mode === 'routes' && flow);
    }, [mode, flow]);

    useEffect(() => {
        mapServiceRef.current?.setReducedMotion(reducedMotion);
    }, [reducedMotion]);

    // Build features for the current mode
    useEffect(() => {
        const service = mapServiceRef.current;
        if (!service) return;
        const pathFor = (trip) => (snapRoads ? snapper.cached(trip) : null);

        if (mode === 'replay') {
            const { current, recent, older, frame } = replayService.visibleAt(replay.frames, cursor, 10);
            // While playing, the current day is drawn progressively by the replay layer (see the playback effect)
            const routes = [
                ...older.map((trip, i) => featureBuilder.createRouteLine(trip, i, { path: pathFor(trip), emphasis: 'dim' })),
                ...recent.map((trip, i) => featureBuilder.createRouteLine(trip, 1000 + i, { path: pathFor(trip) })),
                ...(playing ? [] : current.map((trip, i) => featureBuilder.createRouteLine(trip, 2000 + i, { path: pathFor(trip), emphasis: 'current' }))),
            ];
            service.updateRoutes(routes);
            service.updateFlow([]);
            service.updateChains([]);
            service.updateMarkers(playing ? [] : current.flatMap((trip, i) => [markerFactory.createMarker(trip, 'start', i), markerFactory.createMarker(trip, 'end', i)]));
            const last = current[current.length - 1];
            service.setPulse(!playing && last ? featureBuilder.createPulse(last.endLng, last.endLat) : null);
            if (!playing) service.setReplayFrame([]);
            if (frame && cursor === 0 && routes.length) service.fitToFeatures(routes);
            return;
        }

        const routes = displayTrips.map((trip, i) => featureBuilder.createRouteLine(trip, i, { path: pathFor(trip) }));
        service.updateRoutes(routes);
        service.updateFlow(mode === 'routes' && flow ? displayTrips.slice(0, 250).map((trip) => featureBuilder.createFlowLine(trip, pathFor(trip))) : []);
        service.updateMarkers(mode === 'routes' && showMarkers ? displayTrips.flatMap((trip, i) => [markerFactory.createMarker(trip, 'start', i), markerFactory.createMarker(trip, 'end', i)]) : []);
        service.updateHeat(displayTrips.flatMap((trip) => [featureBuilder.createHeatmapPoint(trip.startLng, trip.startLat), featureBuilder.createHeatmapPoint(trip.endLng, trip.endLat)]));
        service.setPulse(null);

        if (mode === 'routes' && linkTripsByDay && selectedTrip === null) {
            const shown = new Set(displayTrips.map((x) => x.id));
            const chains = [];
            Object.values(tripsByDay).forEach((trips, dayIdx) => {
                trips.forEach((trip, idx) => {
                    const next = trips[idx + 1];
                    if (next && shown.has(trip.id) && shown.has(next.id)) chains.push(featureBuilder.createDayConnectionLine(trip, next, dayIdx));
                });
            });
            service.updateChains(chains);
        } else {
            service.updateChains([]);
        }

        if (mode === 'places') {
            const ranked = places?.ranked ?? places?.top ?? [];
            const max = ranked[0]?.visits ?? 1;
            service.updatePlaces(ranked.slice(0, 30).map((p, rank) => featureBuilder.createPlaceBubble(p, rank, max, { accent: t.accent, ink: tileLayerFactory.isDark(basemap) ? '#f5f5f3' : '#101010', surface: tileLayerFactory.isDark(basemap) ? '#0b0b0b' : '#ffffff', labelColor: tileLayerFactory.isDark(basemap) ? '#f5f5f3' : '#101010' })));
        }

        // fitToFeatures ends in a moveend, which refreshes the in-view count
        service.fitToFeatures(routes, isMobile ? [40, 24, 140, 24] : [56, 56, 56, 320]);
    }, [displayTrips, mode, flow, showMarkers, linkTripsByDay, selectedTrip, tripsByDay, featureBuilder, markerFactory, places, t.accent, basemap, tileLayerFactory, snapRoads, snapVersion, replay, cursor, playing, isMobile]);

    // Replay playback: the car drives each of the day's trips in order, the
    // route drawing behind it, then the next day starts. Time per day grows
    // with distance, bounded, and divides by the speed setting. Reduced
    // motion steps day by day instead.
    useEffect(() => {
        const service = mapServiceRef.current;
        if (!playing || mode !== 'replay' || !service) return undefined;
        const frame = replay.frames[cursor];
        if (!frame) return undefined;
        const rate = parseInt(speed) || 1;
        const advance = () => { if (cursor >= replay.totalDays - 1) setPlaying(false); else setCursor(cursor + 1); };
        const timeline = ReplayService.timeline(frame.trips, (trip) => (snapRoads ? snapper.cached(trip) : null));
        const km = frame.trips.reduce((s, x) => s + x.distanceKm, 0);
        const duration = reducedMotion ? 0 : Math.min(9000, Math.max(1600, 400 + km * 35)) / rate;
        if (duration <= 0 || timeline.total <= 0) {
            const id = setTimeout(advance, Math.max(120, 400 / rate));
            return () => clearTimeout(id);
        }
        let raf = 0;
        let last = performance.now();
        let progress = 0;
        const tick = (now) => {
            progress = Math.min(1, progress + (now - last) / duration);
            last = now;
            const pos = ReplayService.positionAt(timeline, progress);
            const features = [
                ...pos.completed.map((coords, i) => featureBuilder.createProgressLine(timeline.legs[i].trip, coords, 3000 + i)),
                pos.legIndex >= 0 ? featureBuilder.createProgressLine(timeline.legs[pos.legIndex].trip, pos.drawing, 3100) : null,
                pos.position ? featureBuilder.createCar(pos.position[0], pos.position[1], pos.heading, t.accent) : null,
            ].filter(Boolean);
            service.setReplayFrame(features);
            if (pos.position) service.keepInView(pos.position);
            if (pos.done) { advance(); return; }
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [playing, cursor, speed, mode, replay, snapRoads, snapVersion, featureBuilder, t.accent, reducedMotion]);

    // Road snapping
    const startSnapping = useCallback(async () => {
        setSnapRoads(true);
        const controller = new AbortController();
        setSnapProgress({ done: 0, total: 0 });
        const stats = await snapper.snapAll(allTrips, { onProgress: (done, total) => setSnapProgress({ done, total }), signal: controller.signal });
        setSnapProgress(null);
        setSnapVersion((v) => v + 1);
        if (stats.failed && !stats.fetched) {
            notifications.show({ title: 'Router unavailable', message: 'The public OSRM server did not answer. Straight lines are shown; try again later.', color: 'yellow' });
        } else if (stats.fetched) {
            notifications.show({ title: 'Routes snapped to roads', message: `${stats.fetched} new road paths fetched, ${stats.cached} already cached${stats.failed ? `, ${stats.failed} without a route` : ''}.`, color: 'polestar' });
        }
    }, [allTrips]);

    const toggleSnap = (checked) => {
        if (!checked) {
            setSnapRoads(false);
            return;
        }
        if (snapper.cacheSize() > 0 && RouteSnapper.uniquePairs(allTrips).every((p) => snapper.cached(p.trip))) {
            setSnapRoads(true);
            return;
        }
        setSnapConsent(true);
    };

    const focusPlace = (place) => {
        setSelectedTrip(null);
        mapServiceRef.current?.updateView([place.lng, place.lat], 14);
    };

    const frame = replay.frames[Math.min(cursor, Math.max(0, replay.totalDays - 1))];
    const shownCount = mode === 'replay' ? (frame?.cumulative.trips ?? 0) : displayTrips.length;
    const shownDistance = mode === 'replay' ? (frame?.cumulative.distance ?? 0) : displayTrips.reduce((s, x) => s + x.distanceKm, 0);

    const panel = (
        <Stack gap="md">
            <div>
                <Eyebrow>Mode</Eyebrow>
                <SegmentedControl
                    fullWidth
                    mt={6}
                    size="xs"
                    radius="xs"
                    value={mode}
                    onChange={(m) => {
                        setMode(m);
                        setPlaying(false);
                        if (m === 'replay') {
                            setSelectedTrip(null);
                            setCursor(0);
                        }
                    }}
                    data={MODES.map((m) => ({ value: m.value, label: (<Group gap={4} wrap="nowrap" justify="center"><m.icon size={13} /><span>{m.label}</span></Group>) }))}
                />
            </div>

            {mode !== 'replay' && (
                <>
                    <Select size="xs" label="Single trip" placeholder="All recent trips" data={tripOptions} value={selectedTrip} onChange={setSelectedTrip} searchable clearable maxDropdownHeight={280} nothingFoundMessage="No trip matches" />
                    <Select size="xs" label="Trips on the map" value={tripsToShow} onChange={setTripsToShow} disabled={selectedTrip !== null} data={[{ value: '50', label: 'Last 50 trips' }, { value: '150', label: 'Last 150 trips' }, { value: '400', label: 'Last 400 trips' }, { value: 'ALL', label: `All trips (${allTrips.length})` }]} />
                </>
            )}

            <Select size="xs" label="Basemap" value={basemap} onChange={(v) => { userPickedBasemap.current = true; setBasemap(v); }} data={tileLayerFactory.getAvailableLayers()} />

            {mode === 'routes' && (
                <Stack gap={8}>
                    <Switch size="sm" color="polestar" label="Direction of travel" description="Animated flow along each route" checked={flow} onChange={(e) => setFlow(e.currentTarget.checked)} disabled={reducedMotion} />
                    <Switch size="sm" color="polestar" label="Start / end pins" description="Clustered when they crowd" checked={showMarkers} onChange={(e) => setShowMarkers(e.currentTarget.checked)} />
                    <Switch size="sm" color="polestar" label="Link trips by day" description="Dotted chains between consecutive trips" checked={linkTripsByDay} onChange={(e) => setLinkTripsByDay(e.currentTarget.checked)} disabled={selectedTrip !== null} />
                </Stack>
            )}

            <Stack gap={6}>
                <Switch size="sm" color="polestar" label="Snap routes to roads" description="Uses the public OSRM router; sends start/end coordinates only" checked={snapRoads} onChange={(e) => toggleSnap(e.currentTarget.checked)} thumbIcon={<IconRoad size={10} />} />
                {snapProgress && (
                    <Progress value={snapProgress.total ? (snapProgress.done / snapProgress.total) * 100 : 100} size="xs" color="polestar" animated aria-label="Snapping progress" />
                )}
                {snapProgress && <Text size="xs" c="dimmed" className="ps-tabular">{snapProgress.total ? `${snapProgress.done} of ${snapProgress.total} unique routes` : 'Checking cache…'}</Text>}
            </Stack>

            {mode === 'places' && places?.ranked?.length > 0 && (
                <div>
                    <Eyebrow>Most visited</Eyebrow>
                    <ScrollArea.Autosize mah={220} mt={6} type="auto">
                        <Stack gap={2}>
                            {places.ranked.slice(0, 12).map((p, idx) => (
                                <UnstyledButton key={`${p.lat},${p.lng}`} onClick={() => focusPlace(p)}>
                                    <Group gap="sm" wrap="nowrap" py={3}>
                                        <IconMapPin size={13} style={{ color: idx === 0 ? 'var(--ps-accent)' : 'var(--ps-muted)', flexShrink: 0 }} />
                                        <Text size="xs" style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.address}>{p.address}</Text>
                                        <Text size="xs" c="dimmed" className="ps-tabular" style={{ whiteSpace: 'nowrap' }}>{p.visits}</Text>
                                        <IconFocus2 size={12} style={{ color: 'var(--ps-muted)', flexShrink: 0 }} />
                                    </Group>
                                </UnstyledButton>
                            ))}
                        </Stack>
                    </ScrollArea.Autosize>
                </div>
            )}
        </Stack>
    );

    return (
        <Box className="ps-card ps-rise" style={{ position: 'relative', overflow: 'hidden', height: 'min(78vh, 860px)', minHeight: 480 }}>
            {allTrips.length > 0 ? (
                <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
            ) : (
                <Stack align="center" justify="center" h="100%" gap="xs">
                    <IconMapPin size={28} stroke={1.5} style={{ color: 'var(--ps-muted)' }} />
                    <Text c="dimmed" ta="center">No trips with coordinates in this selection.</Text>
                </Stack>
            )}

            {/* Floating controls: panel on desktop, drawer on mobile */}
            {!isMobile && (
                <Glass style={{ position: 'absolute', top: 12, left: 12, width: 290, maxHeight: 'calc(100% - 24px)', overflow: 'auto', zIndex: 5 }} className="ps-glass ps-no-print">
                    {panel}
                </Glass>
            )}
            {isMobile && (
                <>
                    <Button size="xs" variant="default" leftSection={<IconAdjustments size={14} />} onClick={() => setDrawerOpened(true)} style={{ position: 'absolute', top: 12, left: 56, zIndex: 5 }} className="ps-no-print">
                        {MODES.find((m) => m.value === mode)?.label}
                    </Button>
                    <Drawer opened={drawerOpened} onClose={() => setDrawerOpened(false)} position="bottom" size="70%" title="Map" radius={0}>
                        {panel}
                    </Drawer>
                </>
            )}

            {/* Stats chip */}
            <Glass style={isMobile ? { position: 'absolute', right: 12, bottom: mode === 'replay' ? 92 : 36, zIndex: 5, padding: '6px 10px' } : { position: 'absolute', top: 12, right: 52, zIndex: 5, padding: '6px 10px' }} className="ps-glass ps-no-print">
                <Text size="xs" className="ps-tabular" style={{ whiteSpace: 'nowrap' }}>
                    {hoverTrip ? (
                        <>{hoverTrip.startDate} · {formatNumber(hoverTrip.distanceKm, 1)} {unit}</>
                    ) : isMobile ? (
                        <>{shownCount.toLocaleString()}/{allTrips.length.toLocaleString()} · {formatNumber(shownDistance, 0)} {unit}</>
                    ) : (
                        <>
                            {shownCount.toLocaleString()} of {allTrips.length.toLocaleString()} trips · {formatNumber(shownDistance, 0)} {unit}
                            {inView !== null && mode !== 'replay' && inView < displayTrips.length ? ` · ${inView} in view` : ''}
                        </>
                    )}
                </Text>
            </Glass>

            {/* Legend */}
            {!(isMobile && mode === 'replay') && (
            <Glass style={{ position: 'absolute', left: 12, bottom: mode === 'replay' ? 92 : 36, zIndex: 5, padding: '8px 10px' }} className="ps-glass ps-no-print">
                <Eyebrow style={{ fontSize: 10 }}>kWh/100{unit}</Eyebrow>
                <Group gap={10} mt={4} wrap="nowrap">
                    {EFFICIENCY_BANDS.map((b) => (
                        <Group key={b.key} gap={4} wrap="nowrap">
                            <Box style={{ width: 14, height: 3, background: b.color, borderRadius: 2 }} />
                            <Text size="10px" className="ps-tabular">{b.label.replace(/(\d+)/g, (n) => Math.round(parseInt(n) * multiplier))}</Text>
                        </Group>
                    ))}
                </Group>
            </Glass>
            )}

            {/* Replay bar */}
            {mode === 'replay' && replay.totalDays > 0 && (
                <Glass style={{ position: 'absolute', left: 12, right: 12, bottom: 12, zIndex: 6, padding: '10px 14px' }} className="ps-glass ps-no-print">
                    <Group gap="sm" wrap="nowrap" align="center">
                        <Tooltip label="Restart">
                            <ActionIcon variant="subtle" color="gray" size="md" onClick={() => { setCursor(0); setPlaying(false); }} aria-label="Restart replay">
                                <IconPlayerSkipBack size={16} />
                            </ActionIcon>
                        </Tooltip>
                        <ActionIcon variant="filled" color="polestar" size="lg" radius="xl" onClick={() => { if (cursor >= replay.totalDays - 1) setCursor(0); setPlaying((p) => !p); }} aria-label={playing ? 'Pause' : 'Play'}>
                            {playing ? <IconPlayerPause size={18} /> : <IconPlayerPlay size={18} />}
                        </ActionIcon>
                        <SegmentedControl size="xs" radius="xs" value={speed} onChange={setSpeed} data={[{ value: '1', label: '1×' }, { value: '2', label: '2×' }, { value: '4', label: '4×' }, { value: '8', label: '8×' }]} />
                        <Box style={{ flex: 1, minWidth: 80 }}>
                            <Slider size="sm" color="polestar" min={0} max={Math.max(0, replay.totalDays - 1)} value={cursor} onChange={(v) => { setPlaying(false); setCursor(v); }} label={(v) => replay.frames[v]?.label ?? ''} />
                        </Box>
                        <Box style={{ minWidth: isMobile ? 90 : 220, textAlign: 'right' }}>
                            <Text size="sm" fw={500} className="ps-tabular" style={{ whiteSpace: 'nowrap' }}>{frame?.label ?? ''}</Text>
                            {!isMobile && (
                                <Text size="xs" c="dimmed" className="ps-tabular" style={{ whiteSpace: 'nowrap' }}>
                                    day {cursor + 1} of {replay.totalDays} · {frame?.cumulative.trips ?? 0} trips · {formatNumber(frame?.cumulative.distance ?? 0, 0)} {unit} · {formatNumber(frame?.cumulative.energy ?? 0, 0)} kWh
                                </Text>
                            )}
                        </Box>
                    </Group>
                </Glass>
            )}

            {/* Snap consent */}
            <Modal opened={snapConsent} onClose={() => setSnapConsent(false)} title="Snap routes to roads" size="md" zIndex={1000} fullScreen={isMobile} radius={0}>
                <Stack gap="sm">
                    <Text size="sm">
                        Routes are drawn as straight lines because the export only has a start and an end. Snapping asks the public <b>OSRM</b> router (router.project-osrm.org) for the road path between each unique start/end pair.
                    </Text>
                    <Text size="sm" c="dimmed">
                        What leaves your browser: the rounded coordinates of each unique pair ({RouteSnapper.uniquePairs(allTrips).length} pairs for this selection). Never addresses, dates, energy or battery figures. Results are cached in this browser so each pair is fetched once. The demo router is shared and rate-limited; large files can take a minute.
                    </Text>
                    <Group justify="flex-end" mt="xs">
                        <Button variant="subtle" color="gray" onClick={() => setSnapConsent(false)}>Keep straight lines</Button>
                        <Button onClick={() => { setSnapConsent(false); startSnapping(); }}>Snap to roads</Button>
                    </Group>
                </Stack>
            </Modal>
        </Box>
    );
}

export default MapView;
