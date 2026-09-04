# Development guide

## Prerequisites

- Node.js 20.19+ or 22.12+ (Vite 7 requirement; CI uses 22)
- npm 10+
- `make`

## First run

```bash
git clone https://github.com/Polestar-OSS/polestar-journey-log-explorer.git
cd polestar-journey-log-explorer
make install      # npm ci in ./app
make dev          # http://localhost:5173/polestar-journey-log-explorer/
```

Click **Explore with sample data** to load a synthetic year of driving; no
file needed.

## Everyday targets

| Target | What it does |
|---|---|
| `make dev` | Vite dev server with HMR |
| `make lint` | ESLint, warnings fail (`--max-warnings=0`) |
| `make test` | Vitest, `tests/unit/**` |
| `make test-watch` | Vitest in watch mode |
| `make coverage` | Vitest with v8 coverage over `services/` and `utils/` |
| `make build` | Production build to `app/dist` |
| `make preview` | Serve the production build on :4173 |
| `make audit` | `npm audit` over the whole tree, high and above (the `--omit=dev` variant hits a retired registry endpoint) |
| `make check` | lint + test + build: what a pull request must pass |

All targets run from the repository root and delegate to `app/`.

## Project layout

See [ARCHITECTURE.md](./ARCHITECTURE.md) §1 for the tree. The short version:

- `app/src/services/` is where logic goes. Pure, unit-aware, tested.
- `app/src/components/` renders. No formulas.
- `app/src/utils/` parses files and dates, formats numbers, stores
  preferences.
- `app/src/theme/` holds tokens, the Mantine theme and global CSS.
- `tests/unit/` mirrors `services/` and `utils/` one suite per module;
  `tests/fixtures/rows.js` is a synthetic export used by every suite.

## Coding conventions

- Files: `PascalCase.jsx` for components, `PascalCase.js` for service
  classes, `camelCase.js` for utilities and hooks.
- Components take data as props and compute nothing beyond layout. If you
  reach for `reduce` in a component, move it to a service.
- Every service method that estimates something states its guard (minimum
  sample size) and returns `null` under it. The UI shows a sentence, not a
  wrong number.
- Every service change comes with a test that uses `tests/fixtures/rows.js`
  (extend the fixture rather than inventing inline rows).
- Every user-facing number has a formula in [ANALYTICS.md](./ANALYTICS.md).
- Distances are in the file's unit throughout; thresholds quoted in km are
  scaled with `UNIT_MULTIPLIER`.
- No `new Date(string)` on export values; use `parseJourneyDate`
  ([ADR-0007](./adr/0007-strict-date-parsing.md)).
- Strings from the file are rendered as React text or passed through the
  escaping helper in `MapService`; never string-concatenated into HTML.

## Adding things

### A metric or dimension to the pivot
Add an entry to `buildMetrics` / `buildDimensions` in
`services/analytics/PivotService.js`. Add a case to
`tests/unit/PivotService.test.js`. The UI picks it up automatically.

### An insight
1. Add a method to `InsightsCalculator` returning plain data with guards.
2. Call it from `compute()`.
3. Render it in `InsightsView` (and, if it deserves a sentence, add a card in
   `StoryBuilder`).
4. Test both the method and the story card.
5. Document the formula in ANALYTICS.md.

### A chart
Compute the series in `ChartDataProcessor` (or `StatsService` for the Expert
tab). Render inside `ChartCard` with `ChartTooltip`, shared axis props and a
`DataTable` twin behind `TableToggle`. Follow the rules in
[DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md).

### A basemap
Add a strategy class in `strategies/map/LayerStrategy.js` and register it in
`TileLayerFactory`.

### A supported export column
Extend `buildMapping` in `utils/dataParser.js`, add the column to the fixture
header in `tests/fixtures/rows.js`, and add it to the export columns in
`App.jsx` if it should round-trip.

## Debugging tips

- The dev server serves under `/polestar-journey-log-explorer/`; the root URL
  404s by design (`base` in `vite.config.js`).
- Chart tooltips log nothing; open the table twin (⊞) to read exact values.
- `localStorage` keys: `polestar-journey-explorer:prefs` (level, tariff),
  `polestar-trip-annotations` (notes and tags). Clear them to reset.
- To reproduce cross-browser date issues run the unit suite; the parser tests
  cover the export format independent of the engine.

## Screenshots

`tests/e2e/screenshots.mjs` (see [TESTING.md](./TESTING.md)) drives the
production build with Playwright, loads the sample or a given file, walks the
three levels and every tab, and writes PNGs. It is how the mobile layout was
verified.

## Releasing

Publishing a GitHub release (or running the workflow manually) triggers
`deploy.yml`: `make install`, `make lint test`, `make build`, upload
`app/dist` to GitHub Pages.
