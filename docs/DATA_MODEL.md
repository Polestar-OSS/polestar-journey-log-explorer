# Data model

## Input: the Journey Log export

One sheet (`Trips`) or CSV, one row per journey, newest first. Header names
are exact; the distance header carries the unit.

| Column | Type | Notes |
|---|---|---|
| `Start Date`, `End Date` | string `YYYY-MM-DD, HH:MM` | car-local time |
| `Start Address`, `End Address` | string | reverse-geocoded by the app |
| `Distance in KM` **or** `Distance in Mile` | number | decides the unit for the whole file |
| `Consumption in Kwh` | number | |
| `Category` | string | `Uncategorized`, `Private`, `Business`, `Commute` |
| `Start Latitude`, `Start Longitude`, `End Latitude`, `End Longitude` | number | WGS-84 |
| `Start Odometer`, `End Odometer` | integer | in the file's unit |
| `Trip Type` | string | `SINGLE` or `MERGED` |
| `SOC Source`, `SOC Destination` | integer | battery percent |
| `Comments` | string | usually empty |

Observed in real exports: roughly a third of rows have zero distance (the car
was on but did not move); these are discarded.

## Trip (internal)

Produced by `utils/dataParser.js`, sorted chronologically, `id` sequential.

```ts
type Trip = {
  id: number;
  startDate: string; endDate: string;        // canonical export strings
  startTs: number | null; endTs: number | null;
  startAddress: string; endAddress: string;
  distanceKm: number;                        // in the file's unit
  consumptionKwh: number;
  efficiency: number;                        // kWh/100 units, 2 dp
  category: string; tripType: 'SINGLE' | 'MERGED'; comments: string;
  startLat: number; startLng: number; endLat: number; endLng: number;
  startOdometer: number; endOdometer: number;
  socSource: number; socDestination: number; socDrop: number;
  durationMin: number | null; avgSpeed: number | null;
  hour: number | null; weekday: number | null;   // weekday 0 = Monday
  dayKey: string | null; weekKey: string | null; monthKey: string | null;
  sourceFile?: string; sourceIndex?: number;     // set by JourneyMerger
};
```

## Journey (after merge)

```ts
type Journey = {
  data: Trip[];
  distanceUnit: 'km' | 'mi';
  sources: Array<{ fileName; distanceUnit; trips; added; duplicates; conflicts; firstTs; lastTs }>;
  duplicatesRemoved: number;
};
```

## Statistics

Output of `calculateStatistics(data, unit)`; totals are numeric strings
(fixed decimals) for display, timestamps are numbers.

`totalTrips, totalDistance, totalConsumption, avgEfficiency, bestEfficiency,
worstEfficiency, avgTripDistance, odometerStart, odometerEnd, distanceUnit,
totalDurationMin, avgSpeed, activeDays, longestTrip, firstTs, lastTs`.
Fuel and CO₂ comparisons are not statistics any more; see the comparison
result below.

## Insights

Output of `InsightsCalculator.compute(data)`:

```
seasonality { winter|spring|summer|autumn: {trips, distance, efficiency}, winterPenaltyPct, months[12] }
places      { uniquePlaces, top[5]: {lat, lng, visits, address, sharePct}, homeSharePct, tripsTouchingHome }
charging    { sessions, significantSessions, totalGainPct, avgGainPct, typicalTargetSoc, typicalPlugInSoc, lowestSoc, medianStartSoc, totalSocUsedPct, fullCyclesEquivalent }
battery     { usableKwh, samples, likelyPack, estimatedRange, rangeAt80 }
coverage    { loggedDistance, odometerSpan, unloggedDistance, coveragePct }
shortTrips  { threshold, count, sharePct, distanceSharePct, efficiency, restEfficiency }
rhythm      { busiestWeekday, peakHour, weekendSharePct, activeDays, spanDays, activeDaySharePct, tripsPerActiveDay, longestStreakDays }
records     { longestTrip, longestDay, mostEfficient, leastEfficient, longestDuration }
```

## Story card

```ts
type StoryCard = {
  id: string; eyebrow: string;
  figure: number | string | null; unit: string;
  headline: string; body: string;
  tone?: 'accent' | 'good' | 'warm';
  action?: 'map' | 'cost';
  list?: string[];
};
```

## Saved journey (`localStorage`)

Key `polestar-journey-explorer:journey` (`services/persistence/JourneyStore`):
`{ version: 1, distanceUnit: 'km', headers: [...export headers], rows: [...export-format rows], sources: [{ fileName, trips }], savedAt }`.
The rows are exactly what `JourneyLogWriter.toRows` produces, so loading
goes through `processRawRows` like an upload. Written after every merge
while the `persistJourney` preference is on, never for the synthetic sample.

## Preferences (`localStorage`)

Key `polestar-journey-explorer:prefs`:
```ts
{
  experienceLevel: 'simple' | 'detailed' | 'expert';
  unitSystem: 'metric' | 'imperial';  // display units; the journey is converted once in App (services/units/UnitSystem)
  persistJourney: boolean;          // keep the merged journey in localStorage (default true)
  tariff: Tariff | null;            // see below; null until first saved
  comparisonVehicleId: string | null; // services/comparison/Vehicles id; null → default (newest XC60 mild hybrid)
  fuelPrice: number | null;         // per litre (km) or US gallon (mi); null → no money comparison
  // legacy (pre-tariff) keys, read once to seed a flat tariff:
  electricityRate?: number; currency?: string; homeChargingPercent?: number;
}
```

### Tariff (`services/cost/TariffModel.js`)

Always passed through `normalizeTariff`, which fills defaults, clamps ranges
and forces the last tier open-ended, so consumers never see a partial object.

```ts
interface Tariff {
  version: 2;
  currency: string;                 // display label only ('', '$', 'EUR'); currencyPrefix() maps known codes to symbols
  mode: 'flat' | 'tou' | 'tiered';
  seasons: Season[];                // ≤ 4; empty = same schedule all year
  flat:   { rate: number };                                   // per kWh
  tou:    { defaultRate: number; periods: TouPeriod[] };      // ≤ 12 periods
  tiered: { householdBaselineKwh: number; tiers: Tier[]; tiersBySeason: Record<string, Tier[]> }; // last upToKwh null
  fixedMonthlyFee: number;
  publicCharging: { enabled: boolean; sharePct: number; rate: number };
  chargingLossPct: number;          // 0–50, wall → battery
  homeCharger: { powerKw: number; strategy: 'plugin' | 'cheapest' | 'window' };
  homeChargingWindow: { from: 'HH:MM'; to: 'HH:MM' };
  batteryUsableKwh: number | null;  // null → estimate from the data
}
interface Season { id: string; label: string; from: 'MM-DD'; to: 'MM-DD' }   // inclusive, may wrap the year end
interface TouPeriod { id; label; rate; days: 'all'|'weekday'|'weekend'; season: 'all' | Season['id']; from: 'HH:MM'; to: 'HH:MM' }
interface Tier { upToKwh: number | null; rate: number }
```

### Settings file (`services/persistence/SettingsPort`)

`{ version: 1, app: 'polestar-journey-log-explorer', exportedAt, preferences: {...}, annotations: { [tripKey]: { notes, tags[] } } }`.
Import writes only preference keys the app knows and merges annotations.

### Tariff preset (`services/cost/TariffPresets.js`)

Flattened from the provider files under `app/src/data/tariffs/` (schema in
[`TARIFF_PRESETS.md`](./TARIFF_PRESETS.md)):
`{ id: '<provider>/<plan>', label, description, group, provider, region, source, effective, notes, tariff: Tariff }`.

### Comparison vehicle (`services/comparison/Vehicles.js`)

From `app/src/data/vehicles/<make>.json` (schema alongside; guide in
[`VEHICLE_DATA.md`](./VEHICLE_DATA.md)):
`{ id, year, make, model, trim, body, powertrain, engine, epaVehicleId, mpg: { city, highway, combined }, lPer100km, co2GPerKm, electric?: { kwhPer100mi, kwhPer100km, rangeMi, rangeKm }, label, shortLabel, powertrainLabel, makeSource, retrieved }`.

### Comparison result (`VehicleComparison.compare`)

`{ vehicle, distanceKm, petrolKm, electricKm, electricSharePct, fuel, fuelUnit: 'L'|'gal', litres, co2Kg, treeYears, electricKwh, fuelCost, electricCost, totalCost, evCost, saving, perTripSaving, priced }`;
money fields are `null` until a fuel price is set.

### Cost result (`CostCalculator.compute`)

```ts
{
  currency; mode; method: 'sessions' | 'proportional' | 'tiered' | 'none'; sessionsUsed;
  energy: { driven, homeBattery, homeWall, public };          // kWh
  cost:   { home, public, total, fixedFees };                 // fixed fees are reported, not added
  effectiveRatePerKwh; costPer100; costPerTrip; costPerMonth;
  byMonth:  { key, label, kwh, cost }[];
  byPeriod: { id, label, rate, kwh, cost, sharePct }[];
  tiers: Tier[] | null; assumptions: string[]; unit: 'km' | 'mi';
}
```

Key `polestar-trip-annotations`: `{ [tripKey]: { notes, tags[] } }` where
`tripKey = startDate-startOdometer-endOdometer`.

## CSV export columns

Start Date, End Date, Start Address, End Address, Distance, Consumption,
Efficiency, Duration (min), Avg Speed, Category, SOC Start, SOC End, SOC Drop,
Start Odometer, End Odometer, Source File.
