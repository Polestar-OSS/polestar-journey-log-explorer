# Testing

## Unit tests

- Runner: Vitest, configured in `app/vitest.config.js`, run from the root
  with `make test` (or `make test-watch`, `make coverage`).
- Location: `tests/unit/*.test.js`, one suite per service or utility module.
- Fixture: `tests/fixtures/rows.js` builds rows shaped exactly like the
  Journey Log export (same header names, newest-first order, one zero-distance
  row). Addresses and coordinates are fictional.

| Suite | Covers |
|---|---|
| `journeyDate` | strict parsing, formatting, day/week/month keys, ISO week edge, durations, seasons |
| `dataParser` | unit detection, chronological re-ordering, derived fields, CSV path, statistics |
| `JourneyMerger` | set union, idempotence, order, conflicts, km↔mi normalisation, cross-unit duplicates |
| `ChartDataProcessor` | calendar gap filling, rolling median, histograms, heatmap, SOC timeline, sparklines |
| `InsightsCalculator` | seasonality guards, place clustering and merging, charging inference, battery estimate, coverage, rhythm, records, period deltas |
| `StatsService` | percentiles, OLS regression, consumption model recovery on synthetic data, drivers, battery fit, charge histogram, data quality |
| `PivotService` | every dimension, ratio vs additive metrics, "Other" folding, CSV |
| `StoryBuilder` | comparisons, card order, guards, tips |
| `FilterService` | date bounds, combined filters, metadata, table processor, formatter, CSV escaping |

Guidelines:

- Assert numbers with `toBeCloseTo` when the fixture arithmetic is not exact.
- When a test finds a bug, fix the bug, keep the test, and note it in the
  commit message (the `formatDuration(null)` case is the canonical example).
- Extend the fixture rather than writing ad-hoc rows unless the case is
  genuinely one-off (a synthetic fleet for regression recovery, for instance).

## Lint

`make lint` runs ESLint with React, React Hooks and React Refresh plugins and
fails on any warning. The hooks plugin's `set-state-in-effect` rule is on;
derive state in render or in event handlers rather than in effects.

## Visual and end-to-end checks

`tests/e2e/screenshots.mjs` uses Playwright against the production build:

```bash
make build
make preview &            # serves :4173
node tests/e2e/screenshots.mjs [file1.xlsx,file2.xlsx] [outDir]
```

With no file argument it loads the built-in sample. It:

1. clears `localStorage` so the run starts at the Simple level,
2. loads the file(s) and asserts the sources bar (`N files · M trips · D
   duplicates removed`),
3. screenshots Simple, Detailed, Expert → Explore, Expert → Trips and Insights
   at 1440×900 dark, 1440×900 light and 390×844 mobile,
4. fails on any page error or unexpected console error.

Screenshots are not committed. Real exports must never be committed either;
`*.xlsx` and `*.csv` are git-ignored.

## Continuous integration

`.github/workflows/ci.yml` runs on pull requests and pushes to `main`:
`make install`, `make lint`, `make test`, `make build` (artifact uploaded), and
`make audit` (whole dependency tree, high and above) in a separate, non-blocking job. `deploy.yml` repeats lint, test
and build before publishing to GitHub Pages.
