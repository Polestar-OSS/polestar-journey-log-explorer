# Architecture decision records

Short, dated records of the decisions that shape this repository. New
decisions get a new number; superseded ones are marked, never deleted.

| # | Decision | Status |
|---|---|---|
| [0001](./0001-client-only-processing.md) | All processing happens in the browser; no backend | Accepted |
| [0002](./0002-businessrepo-layout.md) | One repository owns app, tests, CI, infra and docs; CI goes through the Makefile | Accepted |
| [0003](./0003-services-are-pure.md) | Domain logic lives in pure, unit-aware services with no React or DOM dependency | Accepted |
| [0004](./0004-multi-file-merge.md) | Several exports merge as a set keyed on trip identity | Accepted |
| [0005](./0005-experience-levels.md) | Three experience levels over one data model | Accepted |
| [0006](./0006-design-system.md) | Token-based design system; validated chart palette; single-axis charts with table twins | Accepted |
| [0007](./0007-strict-date-parsing.md) | Journey Log dates are parsed by a strict parser, never `new Date(string)` | Accepted |
| [0008](./0008-opt-in-road-snapping.md) | Road-snapped routes are opt-in, consented, rounded and cached; straight lines by default | Accepted |
| [0009](./0009-tariff-model.md) | One normalised tariff model in `localStorage`; pricing in pure cost services, never in components | Accepted |
| [0010](./0010-tariff-presets-as-data.md) | Tariff presets are JSON files per provider; seasons in the model; currency is a display label | Accepted |
| [0011](./0011-real-comparison-vehicles.md) | Petrol comparisons use real vehicles from the EPA database, never an average or an assumed price | Accepted |
| [0012](./0012-units-at-the-boundary.md) | Metric/imperial is a preference applied once at the app boundary by one units module | Accepted |
| [0013](./0013-journey-persistence.md) | The de-duplicated journey persists in the browser in the export format; settings export and import; confirmed deletion | Accepted |
| [0014](./0014-first-party-consent.md) | Consent is first-party: one banner gating Google Analytics through Consent Mode, no hosted consent script | Accepted |

Template:

```
# NNNN – Title
Date · Status

## Context
## Decision
## Consequences
## Alternatives considered
```
