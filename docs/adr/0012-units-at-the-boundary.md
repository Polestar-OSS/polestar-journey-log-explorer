# 0012 – One display unit system, converted once at the boundary

2026-09 · Accepted

## Context

The export decides whether distances are km or miles, and that unit used
to flow through every service and component as `distanceUnit`. Users in
Canada get metric exports but some want miles, and vice versa; fuel prices
are quoted in cents per litre or per gallon; and unit logic was starting to
appear in components.

## Decision

- A persisted `unitSystem` preference (`metric` by default, `imperial`)
  decides display units. `services/units/UnitSystem.js` owns every
  conversion (distance, fuel price, cents) and `convertJourney`.
- The conversion happens once, in `App`, on the merged journey. Every
  service and component below keeps its `distanceUnit` contract and stays
  ignorant of the preference, so nothing else changed.
- Fuel price is stored per litre or per US gallon according to the system
  and converted when the system changes; the input takes cents.

## Consequences

- One switch changes every number consistently, including presets' pump
  prices and the petrol comparison.
- The trip model still names its field `distanceKm`; it holds the display
  unit's value, as it always did. Renaming is a separate, mechanical change.

## Alternatives considered

- **Per-component conversion**: rejected; it is what this replaces.
- **Store trips in km and convert on render**: cleaner in principle, but
  every formatter would need the unit; the boundary conversion gets the
  same result with one change.
