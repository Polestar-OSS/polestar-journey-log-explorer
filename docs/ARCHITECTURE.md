# Architecture

Polestar Journey Log Explorer is a single-page web application that turns the
CSV/XLSX export of the Polestar Journey Log app into a dashboard. Everything
runs in the browser. There is no backend, no account, no telemetry beyond the
site-level analytics declared in `index.html`, and the user's file never leaves
their machine.

This document describes the system as it is. Decisions and their reasoning are
recorded separately in [`docs/adr/`](./adr/README.md).

## 1. Repository as a BusinessRepo

The repository owns the whole capability end to end: application, tests,
infrastructure (GitHub Pages via Actions), CI, and documentation.

```
polestar-journey-log-explorer/
├── app/                 # React application (Vite)
│   ├── src/
│   │   ├── components/  # Presentation only
│   │   ├── services/    # Pure domain logic, unit-tested
│   │   ├── utils/       # Parsing, dates, formatting, preferences
│   │   ├── hooks/       # React glue over utils/services
│   │   └── theme/       # Design tokens, Mantine theme, global CSS
│   ├── public/          # Static assets (logos)
│   └── vitest.config.js
├── tests/
│   ├── unit/            # Vitest suites over app/src/services and app/src/utils
│   └── fixtures/        # Synthetic export rows (no real data)
├── docs/                # This directory; ADRs under docs/adr
├── .github/workflows/   # ci.yml (lint · test · build · audit), deploy.yml (Pages)
├── .github/dependabot.yml
└── Makefile             # Every entry point CI and contributors use
```

Rules that follow from this layout:

- CI never calls `npm` directly. It calls `make install`, `make lint`,
  `make test`, `make build`, `make audit`. A contributor runs the same targets.
- Tests live outside `app/` so the application package does not ship them and
  so the test layer can later grow e2e suites without touching the app.
- Documentation is versioned with the code. A change to a formula changes
  [`ANALYTICS.md`](./ANALYTICS.md) in the same pull request.

## 2. Layers

```
┌────────────────────────────────────────────────────────────────┐
│  Presentation   components/*  (React + Mantine + Recharts + OL) │
│  - owns state that is only about the UI (tabs, toggles)         │
│  - never computes a metric                                      │
├────────────────────────────────────────────────────────────────┤
│  Application    hooks/*, App.jsx, Dashboard.jsx                 │
│  - composes services, holds the loaded sources and filters      │
├────────────────────────────────────────────────────────────────┤
│  Domain         services/*  (pure classes and functions)        │
│  - ingest, merge, statistics, insights, charts, story, pivot    │
│  - unit-aware (km / mi), no React, no DOM                       │
├────────────────────────────────────────────────────────────────┤
│  Data           utils/dataParser.js, utils/journeyDate.js       │
│  - file → trip model; strict date parsing; derived fields       │
└────────────────────────────────────────────────────────────────┘
```

Dependencies point downward only. A component may import a service; a service
never imports a component or a hook. This is what makes the domain layer
testable in Node with no browser.

## 3. The trip model

`utils/dataParser.js` turns each export row into one `Trip`. Zero-distance rows
are dropped. Rows are re-ordered chronologically (the app exports newest
first) and given a sequential `id`.

| Field | Source | Notes |
|---|---|---|
| `startDate`, `endDate` | as exported | canonical string `YYYY-MM-DD, HH:MM` |
| `startTs`, `endTs` | parsed | epoch ms, `null` if the date failed to parse |
| `distanceKm` | `Distance in KM` or `Distance in Mile` | in the file's unit despite the name |
| `consumptionKwh` | `Consumption in Kwh` | |
| `efficiency` | derived | kWh per 100 units, number, 2 dp |
| `socSource`, `socDestination`, `socDrop` | `SOC Source/Destination` | percent |
| `durationMin`, `avgSpeed` | derived | `null` when timestamps are missing |
| `hour`, `weekday`, `dayKey`, `weekKey`, `monthKey` | derived | weekday is Monday-based (0..6) |
| `startLat/Lng`, `endLat/Lng`, `startOdometer`, `endOdometer`, `tripType`, `category`, `comments` | as exported | |
| `sourceFile`, `sourceIndex` | merger | which upload the trip came from |

The full table with types is in [`DATA_MODEL.md`](./DATA_MODEL.md).

## 4. Services

Each service has one job, takes plain data, and returns plain data.

| Service | Responsibility |
|---|---|
| `ingest/JourneyMerger` | Set-union of several exports keyed on start time, end time and rounded distance; km↔mi normalisation; per-file added/duplicate/conflict counts |
| `filters/FilterService` | Apply date, range, category and tag filters; state manager; metadata (ranges, categories, date span) |
| `stats` (in `dataParser.calculateStatistics`) | Headline totals, averages, carbon and fuel equivalents, odometer span, active days, longest trip |
| `charts/ChartDataProcessor` | Chart-ready series: calendar-filled aggregates, rolling-median efficiency trend, histograms, weekday×hour grid, SOC timeline, scatter, sparklines |
| `insights/InsightsCalculator` | Narrative findings: seasonality, places (clustered), charging sessions, battery estimate, odometer coverage, short trips, rhythm, records, period deltas |
| `analytics/StatsService` | Expert layer: percentiles, consumption model (OLS), efficiency drivers, battery fit, charge histogram, data quality |
| `analytics/PivotService` | Group-by/aggregate over registered dimensions and metrics; CSV |
| `export/JourneyLogWriter` | Trips back to the Journey Log export columns (rows and CSV), unit in the distance header |
| `persistence/JourneyStore` | The de-duplicated journey in `localStorage` as export-format rows; injected storage, quota-safe |
| `persistence/SettingsPort` | Settings and trip notes as a JSON file, out and in, with validation |
| `units/UnitSystem` | Metric/imperial: distance and fuel-price conversion, cents helpers, and `convertJourney`, applied once at the App boundary so nothing below knows about the preference |
| `comparison/Vehicles` | Loads and validates the per-make vehicle files under `src/data/vehicles` (EPA provenance required) |
| `comparison/VehicleComparison` | Fuel, tailpipe CO₂ and money for the same trips in a chosen petrol or plug-in hybrid car; nightly-charge model for hybrids |
| `story/StoryBuilder` | Plain-language cards for the Simple level |
| `table/TableDataProcessor` | Search, sort, paginate, format, export |
| `cost/TariffModel` | Tariff shape (modes, seasons, per-season tiers), defaults, `normalizeTariff` (the only way a tariff enters the domain) and the currency display helper |
| `cost/TariffPresets` | Loads and validates the provider JSON files under `src/data/tariffs`; flattens them for the picker |
| `cost/TariffEngine` | Which period and price applies at a moment; tiered pricing of a month; average price of a window |
| `cost/ChargingSessionAllocator` | Places a charging session's energy into hourly slots by strategy (plug-in, cheapest, window) and charger power |
| `cost/CostCalculator` | Orchestrates the above over a trip set: session inference from SOC, public share, losses, monthly/period breakdown |
| `map/MapService`, `map/FeatureBuilder`, `map/ColorCalculator` | OpenLayers layers and styles: glow routes, flow animation, heat, places, clusters, pulse; hover/popup |
| `map/MapDataProcessor` | Trips with coordinates, newest first, grouped by day, plus the centre to open on |
| `map/RouteSnapper` | Opt-in OSRM road routing per unique start/end pair with a browser cache |
| `map/ReplayService` | Day-by-day frames with cumulative totals, plus per-day timelines (legs, lengths, position at a fraction, heading) for the animated replay |
| `strategies/map/LayerStrategy` | Basemap catalogue (Esri imagery, OpenStreetMap, Humanitarian); no keyed providers |

Every formula these services implement is written down in
[`ANALYTICS.md`](./ANALYTICS.md).

## 5. Data flow

```
 files ──▶ parseJourneyFile ──▶ [sources] ──▶ JourneyMerger.merge ──▶ journey.data
                                                                          │
                                   FilterBar (one row, scopes everything) │
                                                                          ▼
                        filteredData ──┬─▶ calculateStatistics ──▶ StatsCards
                                       ├─▶ InsightsCalculator  ──▶ InsightsView, StoryView
                                       ├─▶ ChartDataProcessor  ──▶ ChartsView
                                       ├─▶ StatsService, PivotService ──▶ ExploreView
                                       ├─▶ MapService          ──▶ MapView (lazy)
                                       └─▶ TableDataProcessor  ──▶ TableView
```

- `App` owns `sources` (the parsed files). `journey` is a memo of the merge.
- `Dashboard` owns the filter result and computes statistics and insights
  once per filter change; every tab reads the same objects.
- Period deltas compare the filtered range with the equally long range before
  it, taken from the unfiltered journey.

## 6. Experience levels

The header carries a persisted **Simple / Detailed / Expert** switch. It does
not change the data; it changes which tabs and how many tiles render.

| Level | Tabs | Tiles |
|---|---|---|
| Simple | Your driving (story), Map, Trips, Guide | Hero + 4 |
| Detailed | Overview, Insights, Map, Trips, Guide | Hero + 8 |
| Expert | Overview, Insights, Explore, Map, Trips (extra columns), Guide | Hero + 8 |

See [ADR-0005](./adr/0005-experience-levels.md).

## 7. Presentation

- **Design system**: tokens in `theme/tokens.js` mirrored by CSS custom
  properties in `theme/global.css`; a Mantine theme in `theme/mantineTheme.js`.
  Charts and the map read the JS tokens through `useTokens()`. Form
  controls are 16 px on coarse pointers so phones do not zoom on focus. See
  [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md).
- **Charts**: Recharts, styled by the dataviz rules in the design system
  (single axis, thin marks, hairline grid, table twin for every chart).
- **Map**: OpenLayers, loaded lazily on first open. Basemaps are Esri
  imagery (default under the dark UI), OpenStreetMap (default under the
  light UI) and Humanitarian; CARTO was dropped when it started requiring
  an API key. Four modes
  (routes, heat, places, replay) over one `MapService`; animation runs in an
  OpenLayers `postrender` hook and stops under reduced motion.
- **Motion**: CSS keyframes and a count-up hook, all gated on
  `prefers-reduced-motion`.

## 8. Build and deployment

- Vite 8 (Rolldown), React 19, Mantine 9, Recharts 3, Vitest 4, Node ≥ 20.19 / ≥ 22.12 (`engines` in `app/package.json`).
- ESLint stays on 9 until `eslint-plugin-react` declares support for 10; Dependabot is told to skip that major.
- ExcelJS and the map chunk are dynamic imports; the main bundle stays under
  1.2 MB minified (≈ 340 kB gzipped).
- `deploy.yml` builds on release (or manually) and publishes `app/dist` to
  GitHub Pages under `/polestar-journey-log-explorer/`.
- `ci.yml` runs lint (zero warnings), the unit suite, the build and a
  dependency audit on every pull request and push to `main`.

## 9. Privacy and security posture

- No network calls with user data by default. The outbound requests are tile
  images, Google Analytics and the cookie-consent script. Tariff presets are
  bundled JSON and searched locally.
- Road snapping on the map is opt-in behind an explicit consent dialog. It
  sends start/end coordinates rounded to four decimals to the public OSRM
  demo server, one request per unique pair, and caches responses in
  `localStorage` ([ADR-0008](./adr/0008-opt-in-road-snapping.md)).
- The electricity tariff is stored in `localStorage` and never leaves the
  browser ([ADR-0009](./adr/0009-tariff-model.md)).
- Popup HTML on the map is built with an escaping helper; every other user
  string is rendered through React text nodes.
- Notes, tags, preferences and (by default) the de-duplicated journey live
  in `localStorage` only; the user can switch the journey saving off, export
  everything, or delete it ([ADR-0013](./adr/0013-journey-persistence.md)).
- Dependencies are audited in CI and by Dependabot (npm and GitHub Actions).

## 10. Extension points

| Want to… | Do this |
|---|---|
| Add a pivot dimension or metric | Add an entry in `PivotService.buildDimensions` / `buildMetrics`; add a test |
| Add an insight card | Add a method to `InsightsCalculator`, wire it in `compute`, render in `InsightsView` |
| Add a story card | Push a card object in `StoryBuilder.build`; keep one idea per card |
| Add a chart | Compute the series in `ChartDataProcessor`, render inside `ChartCard` with a table twin |
| Add a basemap | Register a strategy in `strategies/map/LayerStrategy.js` |
| Support a new column in the export | Extend `buildMapping` in `dataParser.js` and the fixture in `tests/fixtures/rows.js` |
