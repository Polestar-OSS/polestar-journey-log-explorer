# 0010 – Tariff presets are data files; seasons and a label-only currency

2026-09 · Accepted

## Context

The first tariff release shipped six presets as JavaScript objects inside
the model module. Adding a provider meant editing code, and the model could
not express two things real regulated plans have: schedules and tier
thresholds that change with the season (Ontario swaps its peaks between
summer and winter and doubles the first tier block), and a price plan that
is not tied to one of nine hard-coded currency codes.

## Decision

- Presets live in `app/src/data/tariffs/<provider>.json`, one file per
  provider, described by a JSON Schema in the same folder and discovered
  with `import.meta.glob`. `TariffPresets.js` validates every file in the
  unit suite and flattens providers into picker entries. A contribution is
  a JSON file plus a source link ([`TARIFF_PRESETS.md`](../TARIFF_PRESETS.md)).
- The tariff model gains `seasons` (up to four `MM-DD` ranges, wrapping
  allowed), a `season` on each time-of-use period and `tiersBySeason` for
  per-season tier tables. The engine resolves the season from the calendar
  day; a month picks its tier table by its 15th. Tariffs without seasons
  behave exactly as before, so stored tariffs need no migration beyond the
  version bump.
- `currency` is a free-form display label of up to eight characters, empty
  by default. Pricing never reads it. Known ISO codes map to a symbol for
  display; anything else is printed as typed. Labels in the editor no
  longer mention a currency ("Price per kWh").

## Consequences

- Rates are visible, diffable data with provenance (`source`, `effective`).
- The picker groups by provider and shows the provider's notes, which is
  where holidays and delivery charges are explained since the model does
  not represent them.
- Validation runs in CI, so a malformed community file fails a pull
  request rather than a user's session.
- Tests pin a few moments through the Hydro Ottawa plans; when the Ontario
  Energy Board changes rates, the file and the expectations change
  together.

## Alternatives considered

- **Keep presets in code**: rejected; contributions should not need to know
  React or the module layout.
- **Fetch presets at runtime from a registry**: rejected; it adds a network
  dependency and a moving target for a static site.
- **Model holidays**: needs per-region calendars; deferred, documented as a
  known gap.
