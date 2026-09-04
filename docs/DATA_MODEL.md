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
worstEfficiency, avgTripDistance, odometerStart, odometerEnd, carbonSaved,
treesEquivalent, gasSaved, fuelUnit, distanceUnit, totalDurationMin, avgSpeed,
activeDays, longestTrip, firstTs, lastTs`.

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

## Preferences (`localStorage`)

Key `polestar-journey-explorer:prefs`:
```ts
{
  experienceLevel: 'simple' | 'detailed' | 'expert';
  tariff: Tariff | null;            // see below; null until first saved
  // legacy (pre-tariff) keys, read once to seed a flat tariff:
  electricityRate?: number; currency?: string; homeChargingPercent?: number;
}
```

### Tariff (`services/cost/TariffModel.js`)

Always passed through `normalizeTariff`, which fills defaults, clamps ranges
and forces the last tier open-ended, so consumers never see a partial object.

```ts
interface Tariff {
  version: 1;
  currency: string;                 // ISO code; symbol from CURRENCY_SYMBOLS
  mode: 'flat' | 'tou' | 'tiered';
  flat:   { rate: number };                                   // per kWh
  tou:    { defaultRate: number; periods: TouPeriod[] };      // ≤ 8 periods
  tiered: { householdBaselineKwh: number; tiers: Tier[] };    // last upToKwh null
  fixedMonthlyFee: number;
  publicCharging: { enabled: boolean; sharePct: number; rate: number };
  chargingLossPct: number;          // 0–50, wall → battery
  homeCharger: { powerKw: number; strategy: 'plugin' | 'cheapest' | 'window' };
  homeChargingWindow: { from: 'HH:MM'; to: 'HH:MM' };
  batteryUsableKwh: number | null;  // null → estimate from the data
}
interface TouPeriod { id; label; rate; days: 'all'|'weekday'|'weekend'; from: 'HH:MM'; to: 'HH:MM' }
interface Tier { upToKwh: number | null; rate: number }
```

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
