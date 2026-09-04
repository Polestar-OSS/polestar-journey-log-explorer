# 0011 – Petrol comparisons use real vehicles from a test database

2026-09 · Accepted

## Context

"CO₂ avoided" and "fuel never bought" were computed against an average car:
8.9 L/100 km, 4.2 gal/100 mi and a fixed fuel price. An average is nobody's
car, the price was invented, and a reader could not check any of it. The
project owner asked for comparisons against specific Volvo models, petrol
and hybrid, from real data, with no placeholder numbers anywhere.

## Decision

- Comparison vehicles are JSON data under `app/src/data/vehicles/`, one file
  per make, each entry carrying the official database id it came from and
  the date it was read. The first file covers the Volvo S60, S90, V60, V90,
  XC60 and XC90 in mild-hybrid and plug-in-hybrid form from the US EPA
  fuel-economy web service.
- L/100 km and CO₂ are derived from the EPA combined mpg with the formula
  written in the file, so every car is treated identically.
- `VehicleComparison` is a pure service. Plug-in hybrids are modelled as
  charged nightly: electric for the first electric-range kilometres of each
  day, petrol after. Money appears only when the user enters a fuel price;
  no default price exists.
- The user picks the comparator in the settings panel; the CO₂ tile, the
  story card and an Insights table over the whole fleet use it. The
  preference is persisted next to the tariff.
- Files are validated in the unit suite; a vehicle without a source URL,
  a retrieval date or a positive mpg fails CI.

## Consequences

- Every figure on screen can be traced to an EPA vehicle id.
- Numbers are tailpipe-only and combined-cycle; the docs say so.
- Adding a make is a data contribution with a documented query.
- WLTP-only markets need a second source; the schema allows it as long as
  provenance is recorded.

## Alternatives considered

- **Keep an average car**: rejected by the owner; unverifiable.
- **Let users type their own L/100 km**: still possible by editing the JSON,
  but the default must be real.
- **Scrape manufacturer sites**: blocked and unstructured; a government test
  database is stable and machine-readable.
