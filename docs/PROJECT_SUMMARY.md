# Project summary

**Polestar Journey Log Explorer** turns the CSV/XLSX export of the Polestar
Journey Log app into a private, browser-only dashboard.

## What it does

- Loads one or many exports, de-duplicates overlapping trips, normalises
  km/mi, and tags each trip with its source file.
- Serves three depths from one data model: a plain-language **Simple** story,
  a **Detailed** dashboard (charts, insights, map, trips), and an **Expert**
  tab (pivot builder, percentiles, fitted consumption model, battery fit,
  charging profile, data quality).
- One filter row scopes everything; deltas compare with the previous period.
- Infers what the export does not say: charging sessions, usable battery
  size, "home", winter penalty, unlogged distance.
- Exports the filtered trips or any pivot as CSV.

## How it is built

- React 18, Vite 7, Mantine 7, Recharts 2, OpenLayers 10; Inter bundled.
- Domain logic in pure, unit-aware services with a Vitest unit suite over every service.
- Token-based design system, light and dark, CVD-validated chart palette,
  reduced-motion aware, responsive to 390 px.
- BusinessRepo layout: `app/`, `tests/`, `docs/`, `.github/`, `Makefile`; CI
  and deploy call Makefile targets; Dependabot on npm and Actions.

## Where to look

| Question | Document |
|---|---|
| How is X computed? | [ANALYTICS.md](./ANALYTICS.md) |
| How is the code organised? | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Why was it done this way? | [adr/](./adr/README.md) |
| How do I run and change it? | [DEVELOPMENT.md](./DEVELOPMENT.md), [TESTING.md](./TESTING.md) |
| How do I use it? | [USER_GUIDE.md](./USER_GUIDE.md) |

## Status

Active. Licensed AGPL-3.0. Not affiliated with Polestar or Geely.
