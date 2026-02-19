import { Stack, Title, Text, Paper, Divider, List, Accordion, Badge, Code, Group } from '@mantine/core';
import { IconChartBar, IconMap, IconCalculator, IconInfoCircle } from '@tabler/icons-react';

// Reusable Paper with colored left border
function BorderedPaper({ borderColor, style, ...props }) {
  return (
    <Paper
      {...props}
      style={{
        borderLeft: `3px solid var(--mantine-color-${borderColor})`,
        ...style
      }}
    />
  );
}

function DataGuide({ distanceUnit = 'km' }) {
  const isMi = distanceUnit === 'mi';
  const dist = isMi ? 'mi' : 'km';
  const effUnit = `kWh/100${dist}`;
  const speedUnit = isMi ? 'mph' : 'km/h';
  const speedThreshold = Math.round(110 / (isMi ? 1.60934 : 1));

  // Examples vary by unit
  const effExample = isMi
    ? 'If you consumed 150 kWh over 470 mi: (150 / 470) \u00d7 100 = 31.9 kWh/100mi'
    : 'If you consumed 150 kWh over 750 km: (150 / 750) \u00d7 100 = 20 kWh/100km';

  const co2Formula = isMi
    ? `CO\u2082 Saved = Total Distance (mi) \u00d7 ICE Emissions per mi\nDefault: 0.19 kg CO\u2082/mi (based on avg US ICE vehicle)`
    : `CO\u2082 Saved = Total Distance (km) \u00d7 ICE Emissions per km\nDefault: 0.12 kg CO\u2082/km (120g CO\u2082/km)`;

  const co2Example = isMi
    ? 'For 620 mi traveled: 620 \u00d7 0.19 = 117.8 kg CO\u2082 saved'
    : 'For 1,000 km traveled: 1,000 \u00d7 0.12 = 120 kg CO\u2082 saved';

  const co2Assumption = isMi
    ? 'Based on average US ICE vehicle emissions of ~190g CO\u2082/mi (typical for mid-size sedans)'
    : 'Based on average ICE vehicle emissions of 120g CO\u2082/km (typical for mid-size sedans)';

  const costDefaults = isMi
    ? `Defaults:\n- Electricity: $0.13/kWh\n- Gasoline: $3.50/gal\n- ICE Efficiency: 4.2 gal/100mi (~23.8 mpg)`
    : `Defaults:\n- Electricity: $0.13/kWh\n- Gasoline: $1.50/L\n- ICE Efficiency: 8.5 L/100km`;

  const costExampleTitle = isMi
    ? 'Example: 150 kWh used over 470 mi'
    : 'Example: 150 kWh used over 750 km';

  const costExampleItems = isMi
    ? [
        'EV cost: 150 \u00d7 $0.13 = $19.50',
        'ICE cost: (470 / 100) \u00d7 4.2 \u00d7 $3.50 = $69.09',
        'Savings: $69.09 - $19.50 = $49.59',
      ]
    : [
        'EV cost: 150 \u00d7 $0.13 = $19.50',
        'ICE cost: (750 / 100) \u00d7 8.5 \u00d7 $1.50 = $95.63',
        'Savings: $95.63 - $19.50 = $76.13',
      ];

  // Efficiency thresholds scaled to distance unit
  // km thresholds: 15, 20, 25
  const multiplier = isMi ? 1.60934 : 1;
  const t1 = Math.round(15 * multiplier);
  const t2 = Math.round(20 * multiplier);
  const t3 = Math.round(25 * multiplier);
  const effExcellent = `Below ${t1} ${effUnit}`;
  const effGood = `${t1}-${t2} ${effUnit}`;
  const effAverage = `${t2}-${t3} ${effUnit}`;
  const effHigh = `Above ${t3} ${effUnit}`;

  // Distance range examples
  const shortTrips = `0-${Math.round(20 / multiplier)} ${dist}`;
  const longTrips = `${Math.round(100 / multiplier)}+ ${dist}`;

  return (
    <Stack gap="lg">
      <Paper p="xl" radius="md" withBorder>
        <Group gap="xs" mb="md">
          <IconInfoCircle size={24} />
          <Title order={2}>Understanding Your Journey Data</Title>
        </Group>
        <Text c="dimmed">
          This guide will help you interpret the various charts, maps, statistics, and calculations 
          presented in the Journey Log Explorer.
        </Text>
      </Paper>

      <Accordion defaultValue="statistics" variant="separated">
        {/* Statistics Cards Section */}
        <Accordion.Item value="statistics">
          <Accordion.Control icon={<IconCalculator size={20} />}>
            Statistics Cards - What Each Metric Means
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="md">
              <div>
                <Text fw={600} size="sm" mb="xs">📊 Total Trips</Text>
                <Text size="sm" c="dimmed">
                  The total number of journeys recorded in your data. Each trip represents a journey 
                  from when you shift into drive mode until you park your vehicle.
                </Text>
              </div>

              <Divider />

              <div>
                <Text fw={600} size="sm" mb="xs">🛣️ Total Distance</Text>
                <Text size="sm" c="dimmed">
                  The cumulative distance traveled across all your trips, displayed in {isMi ? 'miles' : 'kilometers'}. 
                  This includes all journeys regardless of category (Business, Private, Commute).
                </Text>
              </div>

              <Divider />

              <div>
                <Text fw={600} size="sm" mb="xs">⚡ Total Energy Consumed</Text>
                <Text size="sm" c="dimmed">
                  The total electrical energy consumed by your vehicle across all trips, measured in 
                  kilowatt-hours (kWh). This represents the actual energy drawn from the battery.
                </Text>
              </div>

              <Divider />

              <div>
                <Text fw={600} size="sm" mb="xs">📈 Average Efficiency</Text>
                <Text size="sm" c="dimmed" mb="xs">
                  Your average energy consumption expressed as kWh per 100 {isMi ? 'miles' : 'kilometers'} ({effUnit}). 
                  This is the key metric for understanding your vehicle's efficiency.
                </Text>
                <BorderedPaper p="sm" withBorder bg="gray.0" borderColor="blue-6">
                  <Text size="xs" fw={600} mb={4}>How it's calculated:</Text>
                  <Code block size="xs">
                    Average Efficiency = (Total Energy / Total Distance) × 100
                  </Code>
                  <Text size="xs" c="dimmed" mt="xs">
                    <strong>Example:</strong> {effExample}
                  </Text>
                </BorderedPaper>
                <div>
                  <Text size="xs" c="dimmed" mt="xs" fw={600}>What's considered efficient?</Text>
                  <List size="xs" mt={4}>
                    <List.Item><Badge color="green" size="xs">Excellent</Badge> {effExcellent} - Ideal conditions, gentle driving, optimal temperature</List.Item>
                    <List.Item><Badge color="blue" size="xs">Good</Badge> {effGood} - Normal efficient driving</List.Item>
                    <List.Item><Badge color="yellow" size="xs">Average</Badge> {effAverage} - Mixed conditions or moderate highway speeds</List.Item>
                    <List.Item><Badge color="red" size="xs">High</Badge> {effHigh} - High speeds, cold weather, aggressive driving, or heavy climate control use</List.Item>
                  </List>
                </div>
              </div>

              <Divider />

              <div>
                <Text fw={600} size="sm" mb="xs">🌱 CO₂ Saved vs ICE Vehicle</Text>
                <Text size="sm" c="dimmed" mb="xs">
                  The estimated carbon dioxide emissions you avoided by driving an electric vehicle 
                  instead of a comparable internal combustion engine (ICE) vehicle.
                </Text>
                <BorderedPaper p="sm" withBorder bg="gray.0" borderColor="green-6">
                  <Text size="xs" fw={600} mb={4}>How it's calculated:</Text>
                  <Code block size="xs">
                    {co2Formula}
                  </Code>
                  <Text size="xs" c="dimmed" mt="xs">
                    <strong>Example:</strong> {co2Example}
                  </Text>
                </BorderedPaper>
                <div>
                  <Text size="xs" c="dimmed" mt="xs" fw={600}>Assumptions:</Text>
                  <List size="xs" mt={4}>
                    <List.Item>
                      {co2Assumption}
                    </List.Item>
                    <List.Item>
                      Does not account for electricity generation emissions (assumes renewable energy or average grid mix)
                    </List.Item>
                    <List.Item>
                      Your actual environmental impact may vary based on your electricity source
                    </List.Item>
                  </List>
                </div>
              </div>

              <Divider />

              <div>
                <Text fw={600} size="sm" mb="xs">💰 Cost Savings</Text>
                <Text size="sm" c="dimmed" mb="xs">
                  An estimate of money saved by using electricity instead of gasoline, comparing 
                  your EV's energy costs to a comparable ICE vehicle's fuel costs.
                </Text>
                <BorderedPaper p="sm" withBorder bg="gray.0" borderColor="teal-6">
                  <Text size="xs" fw={600} mb={4}>How it's calculated:</Text>
                  <Code block size="xs">
                    {`EV Cost = Total Energy (kWh) × Electricity Rate\nICE Cost = (Total Distance / 100) × Fuel Efficiency × Gas Price\nSavings = ICE Cost - EV Cost\n\n${costDefaults}`}
                  </Code>
                  <div>
                    <Text size="xs" c="dimmed" mt="xs" fw={600}>{costExampleTitle}</Text>
                    <List size="xs" mt={4}>
                      {costExampleItems.map((item, i) => (
                        <List.Item key={i}>{item}</List.Item>
                      ))}
                    </List>
                  </div>
                </BorderedPaper>
              </div>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Charts Section */}
        <Accordion.Item value="charts">
          <Accordion.Control icon={<IconChartBar size={20} />}>
            Understanding the Charts
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="md">
              <div>
                <Text fw={600} mb="xs">📊 Distance & Consumption Over Time</Text>
                <Text size="sm" c="dimmed" mb="xs">
                  A line chart showing your daily driving patterns over the selected time period.
                </Text>
                <List size="sm">
                  <List.Item>
                    <strong>Blue line (Distance):</strong> Shows {isMi ? 'miles' : 'kilometers'} driven each day. Peaks indicate 
                    days with longer trips.
                  </List.Item>
                  <List.Item>
                    <strong>Green line (Consumption):</strong> Shows kWh consumed each day. Should generally 
                    correlate with distance.
                  </List.Item>
                  <List.Item>
                    <strong>What to look for:</strong> If consumption is high relative to distance, it may 
                    indicate inefficient driving conditions (cold weather, highway speeds, aggressive acceleration).
                  </List.Item>
                </List>
              </div>

              <Divider />

              <div>
                <Text fw={600} mb="xs">🎯 Efficiency Distribution</Text>
                <Text size="sm" c="dimmed" mb="xs">
                  A pie chart breaking down your trips into efficiency categories.
                </Text>
                <List size="sm">
                  <List.Item>
                    <Badge color="green" size="sm">Excellent</Badge> {effExcellent} - Ideal conditions, 
                    gentle driving, optimal temperature
                  </List.Item>
                  <List.Item>
                    <Badge color="blue" size="sm">Good</Badge> {effGood} - Normal efficient driving
                  </List.Item>
                  <List.Item>
                    <Badge color="yellow" size="sm">Average</Badge> {effAverage} - Mixed conditions or 
                    moderate highway speeds
                  </List.Item>
                  <List.Item>
                    <Badge color="red" size="sm">High</Badge> {effHigh} - High speeds, cold weather, 
                    aggressive driving, or heavy climate control use
                  </List.Item>
                </List>
              </div>

              <Divider />

              <div>
                <Text fw={600} mb="xs">📏 Distance Range Distribution</Text>
                <Text size="sm" c="dimmed" mb="xs">
                  A bar chart showing how your trips are distributed by distance.
                </Text>
                <List size="sm">
                  <List.Item>
                    Helps you understand your typical trip patterns (short city trips vs. longer journeys)
                  </List.Item>
                  <List.Item>
                    Most EV owners have a high percentage of short trips ({shortTrips}), which is ideal for EVs
                  </List.Item>
                  <List.Item>
                    Long trips ({longTrips}) may require charging planning
                  </List.Item>
                </List>
              </div>

              <Divider />

              <div>
                <Text fw={600} mb="xs">🔋 State of Charge (SOC) Analysis</Text>
                <Text size="sm" c="dimmed" mb="xs">
                  A bar chart showing the most common starting battery charge levels.
                </Text>
                <List size="sm">
                  <List.Item>
                    <strong>High SOC starts (80-100%):</strong> You typically charge to full - good for 
                    maximizing range but may reduce battery longevity if done daily
                  </List.Item>
                  <List.Item>
                    <strong>Mid SOC starts (40-80%):</strong> Optimal for daily driving and battery health
                  </List.Item>
                  <List.Item>
                    <strong>Low SOC starts (0-40%):</strong> May indicate range anxiety or insufficient 
                    charging opportunities
                  </List.Item>
                </List>
              </div>

              <Divider />

              <div>
                <Text fw={600} mb="xs">🕐 Consumption by Time of Day</Text>
                <Text size="sm" c="dimmed" mb="xs">
                  A composed chart showing when you drive and how much energy you consume.
                </Text>
                <List size="sm">
                  <List.Item>
                    <strong>Bars (Trips):</strong> Number of trips started during each hour
                  </List.Item>
                  <List.Item>
                    <strong>Line (Energy):</strong> Average energy consumed per trip during that hour
                  </List.Item>
                  <List.Item>
                    <strong>Insights:</strong> Morning/evening peaks indicate commuting patterns. Higher 
                    consumption at certain times may correlate with temperature (cold mornings) or traffic conditions.
                  </List.Item>
                </List>
              </div>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Map Section */}
        <Accordion.Item value="map">
          <Accordion.Control icon={<IconMap size={20} />}>
            Understanding the Map
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="md">
              <div>
                <Text fw={600} mb="xs">🗺️ Journey Visualization</Text>
                <Text size="sm" c="dimmed">
                  The map displays your journeys with color-coded markers and route lines to help you 
                  visualize your driving patterns geographically.
                </Text>
              </div>

              <Divider />

              <div>
                <Text fw={600} mb="xs">📍 Marker Types</Text>
                <List size="sm">
                  <List.Item>
                    <Badge color="green" size="sm">Start Points</Badge> Green markers show where journeys began
                  </List.Item>
                  <List.Item>
                    <Badge color="red" size="sm">End Points</Badge> Red markers show where journeys ended
                  </List.Item>
                  <List.Item>
                    Click any marker to see detailed information: address, date/time, SOC, and trip statistics
                  </List.Item>
                </List>
              </div>

              <Divider />

              <div>
                <Text fw={600} mb="xs">🎨 Route Line Colors</Text>
                <Text size="sm" c="dimmed" mb="xs">
                  Route lines connecting start and end points are color-coded by efficiency:
                </Text>
                <List size="sm">
                  <List.Item>
                    <span style={{ color: '#22c55e', fontWeight: 600 }}>■</span> <strong>Green</strong> 
                    {` - Excellent efficiency (<${t1} ${effUnit})`}
                  </List.Item>
                  <List.Item>
                    <span style={{ color: '#3b82f6', fontWeight: 600 }}>■</span> <strong>Blue</strong> 
                    {` - Good efficiency (${t1}-${t2} ${effUnit})`}
                  </List.Item>
                  <List.Item>
                    <span style={{ color: '#eab308', fontWeight: 600 }}>■</span> <strong>Yellow</strong> 
                    {` - Average efficiency (${t2}-${t3} ${effUnit})`}
                  </List.Item>
                  <List.Item>
                    <span style={{ color: '#ef4444', fontWeight: 600 }}>■</span> <strong>Red</strong> 
                    {` - High consumption (>${t3} ${effUnit})`}
                  </List.Item>
                </List>
              </div>

              <Divider />

              <div>
                <Text fw={600} mb="xs">🎛️ Map Controls</Text>
                <List size="sm">
                  <List.Item>
                    <strong>Zoom:</strong> Use +/- buttons or scroll wheel to zoom in/out
                  </List.Item>
                  <List.Item>
                    <strong>Pan:</strong> Click and drag to move around the map
                  </List.Item>
                  <List.Item>
                    <strong>Layer Toggle:</strong> Switch between street view and satellite imagery
                  </List.Item>
                  <List.Item>
                    <strong>Clustering:</strong> When zoomed out, nearby markers cluster together showing 
                    the number of trips in that area
                  </List.Item>
                </List>
              </div>

              <Divider />

              <div>
                <Text fw={600} mb="xs">💡 Map Insights</Text>
                <List size="sm">
                  <List.Item>
                    <strong>Frequent locations:</strong> Areas with many markers indicate your common destinations
                  </List.Item>
                  <List.Item>
                    <strong>Route patterns:</strong> Identify your most traveled routes and corridors
                  </List.Item>
                  <List.Item>
                    <strong>Efficiency patterns:</strong> Notice if certain routes consistently show 
                    better/worse efficiency (may indicate elevation changes, traffic patterns, or speed limits)
                  </List.Item>
                </List>
              </div>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Data Table Section */}
        <Accordion.Item value="table">
          <Accordion.Control>Understanding the Data Table</Accordion.Control>
          <Accordion.Panel>
            <Stack gap="md">
              <Text size="sm" c="dimmed">
                The data table provides a detailed view of every individual journey with sortable and 
                searchable columns.
              </Text>

              <div>
                <Text fw={600} size="sm" mb="xs">Column Explanations:</Text>
                <Stack gap="xs">
                  <Paper p="xs" withBorder>
                    <Text size="xs" fw={600}>Start/End Date & Time</Text>
                    <Text size="xs" c="dimmed">
                      When the journey began and ended. Useful for identifying specific trips.
                    </Text>
                  </Paper>

                  <Paper p="xs" withBorder>
                    <Text size="xs" fw={600}>Start/End Address</Text>
                    <Text size="xs" c="dimmed">
                      Approximate addresses for the starting and ending locations based on GPS coordinates.
                    </Text>
                  </Paper>

                   <Paper p="xs" withBorder>
                    <Text size="xs" fw={600}>Distance ({dist})</Text>
                    <Text size="xs" c="dimmed">
                      The total distance traveled during this specific journey, in {isMi ? 'miles' : 'kilometers'}.
                    </Text>
                  </Paper>

                  <Paper p="xs" withBorder>
                    <Text size="xs" fw={600}>Consumption (kWh)</Text>
                    <Text size="xs" c="dimmed">
                      Energy consumed from the battery during this journey.
                    </Text>
                  </Paper>

                  <Paper p="xs" withBorder>
                    <Text size="xs" fw={600}>Efficiency ({effUnit})</Text>
                    <Text size="xs" c="dimmed">
                      The efficiency rating for this specific trip, color-coded for quick assessment.
                    </Text>
                  </Paper>

                  <Paper p="xs" withBorder>
                    <Text size="xs" fw={600}>SOC Range</Text>
                    <Text size="xs" c="dimmed">
                      Battery State of Charge at the start and end of the trip. The drop indicates 
                      how much battery was used. Format: "Start% → End% (Drop%)"
                    </Text>
                  </Paper>

                  <Paper p="xs" withBorder>
                    <Text size="xs" fw={600}>Category</Text>
                    <Text size="xs" c="dimmed">
                      Trip classification: Business, Private, or Commute (set in the Journey Log app).
                    </Text>
                  </Paper>

                  <Paper p="xs" withBorder>
                    <Text size="xs" fw={600}>Odometer ({dist})</Text>
                    <Text size="xs" c="dimmed">
                      Vehicle's odometer reading at the start of the trip (total lifetime {isMi ? 'miles' : 'kilometers'}).
                    </Text>
                  </Paper>
                </Stack>
              </div>

              <Divider />

              <div>
                <Text fw={600} size="sm" mb="xs">Table Features:</Text>
                <List size="sm">
                  <List.Item>
                    <strong>Search:</strong> Use the search box to filter trips by address, date, or any text field
                  </List.Item>
                  <List.Item>
                    <strong>Sort:</strong> Click column headers to sort by that field (ascending/descending)
                  </List.Item>
                  <List.Item>
                    <strong>Pagination:</strong> Navigate through pages if you have many trips
                  </List.Item>
                  <List.Item>
                    <strong>Export:</strong> Download the filtered data as CSV for further analysis
                  </List.Item>
                </List>
              </div>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Tips Section */}
        <Accordion.Item value="tips">
          <Accordion.Control>Tips for Better Efficiency</Accordion.Control>
          <Accordion.Panel>
            <Stack gap="md">
              <Text size="sm" c="dimmed">
                Based on your journey data, here are tips to improve your EV's efficiency:
              </Text>

              <List size="sm">
                <List.Item>
                  <strong>Moderate speed:</strong> Highway speeds above {speedThreshold} {speedUnit} significantly increase 
                  energy consumption due to air resistance
                </List.Item>
                <List.Item>
                  <strong>Smooth acceleration:</strong> Gentle acceleration and anticipating stops helps 
                  maximize regenerative braking
                </List.Item>
                <List.Item>
                  <strong>Precondition:</strong> Heat or cool the cabin while plugged in before departure 
                  to reduce energy use during the trip
                </List.Item>
                <List.Item>
                  <strong>Tire pressure:</strong> Maintain proper tire pressure - underinflated tires 
                  increase rolling resistance
                </List.Item>
                <List.Item>
                  <strong>Climate control:</strong> Use seat heaters instead of cabin heating when possible 
                  - they're more energy efficient
                </List.Item>
                <List.Item>
                  <strong>Route planning:</strong> Avoid routes with steep climbs when possible, or plan 
                  to recover energy on the descent
                </List.Item>
                <List.Item>
                  <strong>Temperature impact:</strong> Cold weather significantly reduces efficiency - this 
                  is normal for all EVs
                </List.Item>
              </List>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack>
  );
}

export default DataGuide;
