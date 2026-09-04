# Analytics reference

Every number the application shows is derived from the columns in the Journey
Log export. This document states each formula, its inputs, its guards, and
where it lives in the code, so a reader can check any figure by hand.

Units: `u` is the file's distance unit (km or mi). Efficiency is always
kWh per 100 u. Where a threshold is quoted in km, it is scaled by 1.60934 for
mile exports.

## 1. Per-trip fields (`utils/dataParser.js`)

| Field | Formula |
|---|---|
| `efficiency` | `consumptionKwh / distanceKm × 100`, 2 dp; `0` when distance is 0 |
| `socDrop` | `socSource − socDestination` (may be negative on regen-heavy trips) |
| `durationMin` | `(endTs − startTs) / 60 000`, rounded, clamped at 0; `null` without both timestamps |
| `avgSpeed` | `distanceKm / (durationMin / 60)`, 1 dp; `null` when duration is 0 |
| `weekday` | `(getDay() + 6) mod 7` so Monday = 0 |
| `weekKey` | ISO-8601 week, Monday-based |

Rows with distance ≤ 0 are discarded before anything else.

## 2. Headline statistics (`calculateStatistics`)

| Statistic | Formula |
|---|---|
| Total distance / energy | sums |
| Average efficiency | `Σ energy / Σ distance × 100` (distance-weighted, not a mean of trips) |
| Best / worst efficiency | min / max over trips with distance ≥ 5 km (3 mi) so cold-start hops do not win |
| Average trip distance | `Σ distance / n` |
| Odometer span | `max(endOdometer) − min(startOdometer)` |
| Active days | distinct `dayKey` |
| Time driving | `Σ durationMin` over trips with duration > 0 |
| Average moving speed | `Σ distance / Σ hours` over the same trips |
| Fuel not used | `distance / 100 × 8.9 L` (km) or `× 4.2 gal` (mi), the US EPA fleet average |
| CO₂ avoided | `fuel × 2.31 kg/L` or `× 8.887 kg/gal` |
| Trees equivalent | `CO₂ / 21 kg` per tree-year |

The carbon figure ignores the electricity's own footprint; it is "what the
same distance would have emitted from a petrol tailpipe".

## 3. Chart series (`ChartDataProcessor`)

- **Period aggregates**: buckets by `dayKey` / `weekKey` / `monthKey`, then
  walks the calendar from the first to the last trip so empty periods are
  emitted as zero rows. Per bucket: trips, distance, energy, SOC used,
  duration, and `efficiency = energy / distance × 100` (null when distance 0).
- **Efficiency trend**: trips with `0 < efficiency < 60 u` in order; the line
  is the **median of the last 10** such trips (median, not mean, so a single
  1-km hop cannot move it).
- **Efficiency histogram**: 2.5 kWh/100 u bins from 0 to 60 u; trips above 60
  are counted as outliers and excluded.
- **Distance histogram**: bands 0–2, 2–5, 5–10, 10–20, 20–50, 50–100,
  100–250, 250+ km (scaled for mi), with share of trips.
- **Weekday × hour heatmap**: count (or Σ distance) per (weekday, hour).
- **SOC timeline**: last N trips; `charged = max(0, socSource − previous socDestination)`.
- **Sparklines**: last 14 weekly (or daily if the span < 120 days) values.

## 4. Insights (`InsightsCalculator`)

### Seasonality
Meteorological seasons: winter = Dec–Feb, spring = Mar–May, summer = Jun–Aug,
autumn = Sep–Nov. Season efficiency is distance-weighted. The **winter
penalty** is `(winter − summer) / summer × 100`, reported only when both
seasons have ≥ 5 trips. Month-of-year folds every year in the file onto one
January–December calendar.

### Places
Trip endpoints are bucketed on a 0.001° grid (≈ 100 m). Cells are then merged
into the busiest neighbour within 0.0025° so a car park that straddles a grid
line is one place. The busiest place is called "home". `homeSharePct` is that
place's share of all endpoints (2 per trip); `tripsTouchingHome` counts trips
that start or end within 0.0015° of it.

### Charging
A session is inferred whenever `socSource(next) > socDestination(previous)` for
consecutive trips. Gain = the difference. "Significant" sessions are ≥ 10 %.
`typicalPlugInSoc` / `typicalTargetSoc` are the medians of `from` / `to` over
significant sessions. `fullCyclesEquivalent = Σ max(0, socDrop) / 100`.

### Battery
`usableKwh = Σ consumption / Σ socDrop × 100` over trips with `socDrop ≥ 5`.
Reported only when ≥ 5 such trips exist and the result is within 30–160 kWh.
The nearest of four known usable pack sizes (67, 79, 94, 107 kWh) is offered as
a label when within 12 kWh. `estimatedRange = usable / avgEfficiency × 100`;
`rangeAt80` is 80 % of that.

### Coverage
`odometerSpan = max(endOdometer) − min(startOdometer)`;
`unlogged = span − Σ distance`; `coveragePct = Σ distance / span`.

### Short trips
Threshold 3 km (≈ 1.9 mi). Share of trips, share of distance, and
distance-weighted efficiency for short trips vs the rest.

### Rhythm
Busiest weekday and hour by trip count; weekend share; active days over the
calendar span; trips per active day; longest run of consecutive driving days.

### Period deltas
When a date filter is active, the previous period is the equally long window
immediately before the filter's start, taken from the unfiltered journey.
Deltas are `(current − previous) / previous × 100` for trips, distance, energy
and efficiency.

## 5. Expert statistics (`StatsService`)

### Percentiles
Linear-interpolated percentiles (p5, p25, p50, p75, p95) plus min, max, mean
and n for: distance, efficiency (≤ 60 u), energy per trip, duration (> 0),
average speed (> 0), battery used (≥ 0).

### Consumption model
Ordinary least squares over trips with `efficiency ≤ 120 u`:

```
energy_trip = overhead + marginal × distance_trip
```

`overheadKwh = max(0, intercept)` is the fixed cost of a trip (cabin, battery
conditioning, systems waking up). `marginalPer100 = slope × 100` is the rolling
consumption. `r²` is reported. Fitted overall and per season (≥ 8 trips).
`breakEvenDistance = overhead / (marginal / 100)`: below it the overhead is more
than half the bill.

### Efficiency drivers
Median (with p25–p75) efficiency by average-speed band (0–20, 20–30, 30–40,
40–50, 50–60, 60–80, 80–100, 100+ km/h, scaled for mi), by hour of day (≥ 3
trips), and by starting SOC band (20 % steps).

### Battery fit
Trips with `socDrop ≥ 3` and energy > 0. `kwhPerPct = Σ(x·y) / Σ(x²)` (a
least-squares line forced through the origin, because 0 % used must be 0 kWh).
`usableKwh = kwhPerPct × 100`. The ordinary r² is shown for the same points.

### Charging sessions
Same inference as §4, plus: a 10-band histogram of where sessions start (plug
in) and end (unplug); median parked time before a charged departure; sessions
per week (≥ 10 % gain) over the journey's calendar span.

### Data quality
- Per month: logged distance, unlogged distance (positive odometer gaps between
  consecutive trips, attributed to the later trip's month), coverage %.
- Issue counts: no coordinates, no elapsed time, efficiency > 60 u, zero
  energy, SOC rose during a trip, `MERGED` trip type, unparsable dates.
- Merge report: duplicates and conflicts from the sources bar.

## 6. Pivot (`PivotService`)

Dimensions: month, week, weekday, hour, season, month of year, year,
category, source file, trip type, distance band, battery-used band, start
place, end place (free-text dimensions rank by value and fold beyond 12 into
"Other (n)").

Metrics: trips, distance, energy, efficiency (energy ÷ distance), median-trip
efficiency, 90th-percentile efficiency, average and median trip length,
battery used, time driving, average speed, driving days, energy per driving
day. Additive metrics also report each bucket's share of the total.

## 7. Multi-file merge (`JourneyMerger`)

Trip identity = `startTs | endTs | round(distance, 1)`. Files are processed in
the order added; the first occurrence wins. A duplicate that disagrees on
energy or SOC by more than 0.01 kWh / 1 % is counted as a **conflict** and
surfaced, but not merged. Distances, odometers, efficiency and speed are
converted to the first file's unit before keying, so a km export and a mile
export of the same drive de-duplicate.

## 8. Story cards (`StoryBuilder`)

Cards restate §2 and §4 in words. Two helpers deserve a note:

- `describeDistance(km)`: picks the reference distance (marathon, London–Paris,
  …, once around the equator) whose log-ratio to the journey is smallest, and
  phrases it as "about X", "N × X" or "P % of X".
- Cost: the `CostCalculator` result for the current selection (§9) when the
  caller passes one; otherwise `energy × electricityRate` at a flat rate.

Tips are rule-based on the same insights (winter penalty ≥ 20 %, short-hop share
≥ 25 %, charging to ≥ 95 %, a dip below 10 %, coverage < 85 %, average
efficiency above 22 kWh/100 km).

## 9. Electricity cost (`CostCalculator`)

Inputs: the trips in view, the saved tariff (`TariffModel`), and the usable
battery estimate from §4 Battery (overridable in the tariff).

Energy accounting, in kWh:

```
driven      = Σ consumptionKwh
public      = driven × publicShare            (0 when public charging is off)
homeBattery = driven − public
homeWall    = homeBattery ÷ (1 − loss)        what the meter sees
publicCost  = public × publicRate             operators bill per kWh delivered
```

Home cost by tariff mode:

- **Flat**: `homeWall × rate`.
- **Tiered**: for each calendar month, `wall = homeWall share of that month's
  driving`; the month is priced through the tiers after the household
  baseline has consumed the first blocks (`TariffEngine.tieredMonthCost`).
- **Time of use**, two methods:
  - *Sessions* (needs ≥ 3 sessions): a session is a rise in SOC between
    consecutive trips, `kwh = Δsoc% × usableKwh`, parked window = previous
    end → next start. `ChargingSessionAllocator` splits the window into
    hourly slots, each tagged with its period and price, and fills them by
    strategy: `plugin` in order at charger power, `cheapest` lowest price
    first, `window` inside the preferred window first (cheapest within it),
    then the rest. Energy the charger could not deliver in the window is
    spread across all slots. Session energy is then scaled so all sessions
    sum to `homeWall` (SOC is 1 % coarse; consumption is not).
  - *Proportional* (fallback): `homeWall × averageRateInWindow(from, to)`,
    the mean price of the preferred charging window over a full week.

Period resolution (`TariffEngine.periodAt`): the season in force on the
calendar day is found first (`seasons[]`, `MM-DD` inclusive ranges that may
wrap the year end; none → no season). Periods are then tested in order; one
matches when its season is `all` or the current one, the day rule fits
(`all`, `weekday`, `weekend`) and the minute of day is inside `[from, to)`,
with `to ≤ from` meaning the window wraps midnight. No match → `defaultRate`.

Tier tables (`TariffEngine.tiersFor`): a month uses `tiersBySeason[season]`
when the season of its 15th has an entry, else `tiers`.

Window average (`averageRateInWindow`): mean of `rateAt` over every hour of
the window across seven weekdays in each of twelve months, so seasonal and
weekend rules are both weighted in.

Derived: `effectiveRatePerKwh = total ÷ driven`, `costPer100 = total ÷
distance × 100`, `costPerTrip`, `costPerMonth = total ÷ months present`.
Fixed monthly fees are reported (`fees × months`) but not added to the total,
because they are paid regardless of the car. Every non-obvious input is
echoed in `assumptions[]` and shown in the settings panel.
