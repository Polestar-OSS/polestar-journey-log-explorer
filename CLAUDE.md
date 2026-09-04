# Working in this repository

Read `docs/ARCHITECTURE.md` first. The rules below are the ones that get
broken most often.

- Run everything through the Makefile from the repository root: `make install`,
  `make dev`, `make lint`, `make test`, `make build`, `make check`. CI runs the
  same targets. Node 22.
- Domain logic lives in `app/src/services/` and `app/src/utils/` as pure,
  unit-aware (km / mi) functions and classes. Components under
  `app/src/components/` render and hold UI state only. Never put a `reduce`
  in a component.
- Every service change ships with a Vitest case in `tests/unit/` built on
  `tests/fixtures/rows.js`, and every formula change updates
  `docs/ANALYTICS.md`.
- Dates from the export are `YYYY-MM-DD, HH:MM`. Use `parseJourneyDate`; never
  `new Date(string)` (fails in Firefox/Safari).
- Real exports and screenshots of them are personal data. Never add them to
  the repository or to a pull request. Use the synthetic sample
  (`app/src/utils/sampleData.js`) or the fixture.
- Design: tokens in `app/src/theme/`, charts built from `ChartCard` +
  `ChartTooltip` + shared axis props with a table twin, one y-axis per chart,
  three categorical colours max, both themes, reduced-motion respected.
- Lint runs with `--max-warnings=0`. `react-hooks/set-state-in-effect` is on;
  derive state in render or set it in handlers.
- Commit messages: imperative subject, a body that says what changed and why.
  No co-author trailers.
- Architecture decisions get an ADR in `docs/adr/`.
