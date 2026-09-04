# Contributing

Thank you for helping. This page is short on purpose; the detail lives in the
documents it links to.

## Before you start

- Read [ARCHITECTURE.md](./ARCHITECTURE.md) (10 minutes) and skim the
  [ADRs](./adr/README.md). They explain where things go and why.
- Everything runs through the Makefile: `make install`, `make dev`,
  `make check`.

## Ground rules

1. **Privacy.** Never commit a real export or a screenshot of one. `*.csv`,
   `*.xlsx` and `screenshots/` are git-ignored; keep them that way. The
   synthetic sample and the test fixture are the only data in the repository.
2. **Logic in services, tests beside it.** A number on screen is computed in
   `app/src/services/` or `app/src/utils/` and has a test in `tests/unit/`.
   Components render.
3. **Formulas are documented.** If you change or add a calculation, update
   [ANALYTICS.md](./ANALYTICS.md) in the same pull request.
4. **Guards over guesses.** Estimates state their minimum sample size and
   return `null` below it. The UI says "not enough data" rather than showing
   a wrong number.
5. **Both themes, all three levels, 390 px wide.** Check dark and light, and
   that a new view works in the level it belongs to. Run the screenshot script
   for anything visual.
6. **Design system, not per-component styling.** Use the tokens and the
   shared chart pieces ([DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)).
7. **Zero lint warnings.** CI fails on warnings.

## Pull requests

- One topic per pull request. Describe what changed and why; link the ADR if
  you added one.
- `make check` must pass. CI runs the same targets.
- Include documentation changes. A feature without a paragraph in the user
  guide is not finished.
- Screenshots in the description are welcome when they come from the sample
  dataset.

## Adding your electricity provider

Presets are JSON files, no code needed: copy an existing file under
`app/src/data/tariffs/`, fill in the rates with a source link, run
`make test`. The guide is [TARIFF_PRESETS.md](./TARIFF_PRESETS.md).

## Adding a comparison car

Cars come from an official test database with the id recorded; see
[VEHICLE_DATA.md](./VEHICLE_DATA.md). `make test` validates the file.

## Reporting bugs

Use the issue templates. For parsing problems, describe the header row of your
export (column names only) and the browser; do not attach the file.

## Decision records

Anything that changes structure, a dependency of consequence, or a formula
convention gets an ADR: copy the template in [adr/README.md](./adr/README.md),
number it, and link it from the ADR index.

## License

By contributing you agree that your contribution is licensed under
[AGPL-3.0](../LICENSE).
