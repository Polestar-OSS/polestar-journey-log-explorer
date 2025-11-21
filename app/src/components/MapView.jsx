import { useEffect, useRef, useMemo, useState } from 'react';
import { Paper, Select, Text, Badge, Group, Stack, Switch } from '@mantine/core';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import XYZ from 'ol/source/XYZ';
import VectorSource from 'ol/source/Vector';
import { Feature } from 'ol';
import { Point, LineString } from 'ol/geom';
import { Style, Stroke, Circle, Fill, Icon, RegularShape } from 'ol/style';
import { fromLonLat } from 'ol/proj';
import Overlay from 'ol/Overlay';
import { defaults as defaultControls, ScaleLine, ZoomToExtent, FullScreen, MousePosition } from 'ol/control';
import { createStringXY } from 'ol/coordinate';
import 'ol/ol.css';

function MapView({ data }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const overlayRef = useRef(null);
  const overlayElementRef = useRef(null);
  
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [linkTripsByDay, setLinkTripsByDay] = useState(false);
  const [tripsToShow, setTripsToShow] = useState('100');
  const [popupContent, setPopupContent] = useState(null);

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

  const getEfficiencyColor = (efficiency) => {
    const eff = parseFloat(efficiency);
    if (eff < 15) return [18, 184, 134]; // green
    if (eff < 20) return [250, 176, 5]; // yellow
    if (eff < 25) return [253, 126, 20]; // orange
    return [250, 82, 82]; // red
  };

  const dayColors = [
    [18, 184, 134], [21, 170, 191], [76, 110, 245], 
    [121, 80, 242], [230, 73, 128], [253, 126, 20], [250, 176, 5]
  ];
  
  const getDayColor = (dayIndex) => dayColors[dayIndex % dayColors.length];

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Create overlay for popup
    overlayElementRef.current = document.createElement('div');
    overlayElementRef.current.className = 'ol-popup';
    overlayElementRef.current.style.cssText = `
      background: white;
      padding: 12px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      min-width: 200px;
      position: absolute;
      bottom: 12px;
      left: -100px;
    `;

    const overlay = new Overlay({
      element: overlayElementRef.current,
      autoPan: true,
      autoPanAnimation: { duration: 250 }
    });
    overlayRef.current = overlay;

    // Mouse position control
    const mousePositionControl = new MousePosition({
      coordinateFormat: createStringXY(4),
      projection: 'EPSG:4326',
      className: 'custom-mouse-position',
      undefinedHTML: '&nbsp;'
    });

    const map = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new XYZ({
            url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            attributions: '© OpenStreetMap contributors',
            maxZoom: 19
          })
        })
      ],
      view: new View({
        center: fromLonLat(center),
        zoom: 11,
        maxZoom: 19,
        minZoom: 3
      }),
      controls: defaultControls().extend([
        new ScaleLine({
          units: 'metric'
        }),
        new ZoomToExtent({
          extent: fromLonLat([center[0] - 1, center[1] - 1]).concat(
            fromLonLat([center[0] + 1, center[1] + 1])
          )
        }),
        new FullScreen(),
        mousePositionControl
      ]),
      overlays: [overlay]
    });

    mapInstanceRef.current = map;

    // Handle click events for popups
    map.on('click', (evt) => {
      const feature = map.forEachFeatureAtPixel(evt.pixel, (feature) => feature);
      
      if (feature) {
        const properties = feature.getProperties();
        if (properties.tripData) {
          const trip = properties.tripData;
          const type = properties.type;
          
          let content = `
            <div style="font-family: system-ui, -apple-system, sans-serif;">
              <div style="font-weight: 700; margin-bottom: 8px;">${type === 'start' ? 'Trip Start' : 'Trip End'}</div>
              <div style="font-size: 12px; margin-bottom: 4px;">${type === 'start' ? trip.startDate : trip.endDate}</div>
              <div style="font-size: 12px; margin-bottom: 8px;">${type === 'start' ? trip.startAddress : trip.endAddress}</div>
              <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                <span style="background: #228be6; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px;">
                  SOC: ${type === 'start' ? trip.socSource : trip.socDestination}%
                </span>
                ${type === 'end' ? `
                  <span style="background: ${getEfficiencyColor(trip.efficiency)[0] < 200 ? '#12b886' : '#fa5252'}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px;">
                    ${trip.efficiency} kWh/100km
                  </span>
                ` : ''}
              </div>
              ${type === 'end' ? `
                <div style="font-size: 11px; margin-top: 8px; color: #868e96;">
                  Distance: ${trip.distanceKm} km<br/>
                  Consumption: ${trip.consumptionKwh} kWh
                </div>
              ` : ''}
            </div>
          `;
          
          overlayElementRef.current.innerHTML = content;
          overlay.setPosition(evt.coordinate);
        }
      } else {
        overlay.setPosition(undefined);
      }
    });

    // Change cursor on hover
    map.on('pointermove', (evt) => {
      const hit = map.forEachFeatureAtPixel(evt.pixel, () => true);
      map.getTargetElement().style.cursor = hit ? 'pointer' : '';
    });

    return () => {
      map.setTarget(null);
      mapInstanceRef.current = null;
    };
  }, []);

  // Update map view and features when data changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Update view center
    map.getView().setCenter(fromLonLat(center));
    map.getView().setZoom(selectedTrip !== null ? 12 : 11);

    // Remove existing vector layers
    map.getLayers().getArray()
      .filter(layer => layer instanceof VectorLayer)
      .forEach(layer => map.removeLayer(layer));

    const features = [];

    // Add trip routes and markers
    displayTrips.forEach((trip, tripIdx) => {
      const color = getEfficiencyColor(trip.efficiency);
      
      // Route line with arrow
      const routeLine = new Feature({
        geometry: new LineString([
          fromLonLat([trip.startLng, trip.startLat]),
          fromLonLat([trip.endLng, trip.endLat])
        ])
      });
      
      routeLine.setStyle(new Style({
        stroke: new Stroke({
          color: `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.8)`,
          width: 4,
          lineCap: 'round',
          lineJoin: 'round'
        })
      }));
      
      features.push(routeLine);

      // Start marker - filled circle with border
      const startMarker = new Feature({
        geometry: new Point(fromLonLat([trip.startLng, trip.startLat])),
        tripData: trip,
        type: 'start'
      });
      
      startMarker.setStyle(new Style({
        image: new Circle({
          radius: 8,
          fill: new Fill({ color: '#228be6' }),
          stroke: new Stroke({ 
            color: 'white', 
            width: 3 
          })
        }),
        zIndex: 1000 + tripIdx
      }));
      
      features.push(startMarker);

      // End marker - star shape
      const endMarker = new Feature({
        geometry: new Point(fromLonLat([trip.endLng, trip.endLat])),
        tripData: trip,
        type: 'end'
      });
      
      endMarker.setStyle(new Style({
        image: new RegularShape({
          points: 5,
          radius: 10,
          radius2: 4,
          fill: new Fill({ 
            color: `rgb(${color[0]}, ${color[1]}, ${color[2]})` 
          }),
          stroke: new Stroke({ 
            color: 'white', 
            width: 3 
          })
        }),
        zIndex: 1000 + tripIdx
      }));
      
      features.push(endMarker);
    });

    // Add day connection lines
    if (linkTripsByDay) {
      Object.entries(tripsByDay).forEach(([day, trips], dayIdx) => {
        const color = getDayColor(dayIdx);
        
        trips.forEach((trip, idx) => {
          if (idx < trips.length - 1) {
            const nextTrip = trips[idx + 1];
            const connectionLine = new Feature({
              geometry: new LineString([
                fromLonLat([trip.endLng, trip.endLat]),
                fromLonLat([nextTrip.startLng, nextTrip.startLat])
              ])
            });
            
            connectionLine.setStyle(new Style({
              stroke: new Stroke({
                color: `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.6)`,
                width: 5,
                lineDash: [15, 10],
                lineCap: 'round'
              }),
              zIndex: 500
            }));
            
            features.push(connectionLine);
          }
        });
      });
    }

    const vectorLayer = new VectorLayer({
      source: new VectorSource({ features }),
      updateWhileAnimating: true,
      updateWhileInteracting: true
    });
    
    map.addLayer(vectorLayer);
  }, [displayTrips, linkTripsByDay, center, selectedTrip, tripsByDay]);

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
