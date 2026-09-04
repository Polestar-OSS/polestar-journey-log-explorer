# 0003 – Domain logic lives in pure services

2025-11 (reaffirmed 2026-09) · Accepted

## Context

The first version already separated services (filters, charts, map,
statistics, table) from components. The redesign added many more analytics.
Without a rule, formulas drift into components and become untestable.

## Decision

- A **service** is a class or module under `app/src/services/` (or a pure
  function in `app/src/utils/`) that takes the trip model and options and
  returns plain data. It never imports React, Mantine, Recharts, OpenLayers or
  the DOM.
- Services are **unit-aware**: they take `distanceUnit` and scale thresholds.
- Services are **guarded**: every estimate states its minimum sample size and
  returns `null` below it. The UI renders "not enough data" rather than a
  misleading number.
- Every service has a Vitest suite under `tests/unit/` using the synthetic
  fixture in `tests/fixtures/rows.js`.
- Components own only UI state (active tab, toggles, hover). Anything that is
  a number on screen is computed by a service and, where sensible, memoised
  once in `Dashboard`.

Dependency direction: `components → hooks → services/utils`. Never the
reverse.

## Consequences

- `make test` runs in Node in about a second and covers every formula.
- Adding a metric means adding a function and a test; the UI change is a
  render.
- The data-viz rules (single axis, table twin) are enforced by the components,
  not by the services, so the same series can be drawn differently at different
  experience levels.

## Alternatives considered

- Hooks as the unit of logic (`useStatistics`): rejected, hooks cannot be
  tested without React and tend to accumulate rendering concerns.
- A state library (Redux, Zustand): unnecessary; the state is two objects
  (sources, filter result) and a handful of preferences.
