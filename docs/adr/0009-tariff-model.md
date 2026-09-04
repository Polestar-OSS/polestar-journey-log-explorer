# 0009 – One tariff model, priced by pure services

2026-09 · Accepted

## Context

The previous cost calculator was a component holding a single price per kWh
and a home-charging percentage, and it did the arithmetic inline. Electricity
is rarely priced that simply: time-of-use schedules, weekday rules, monthly
tiers with a household baseline, public charging at another price, losses at
the wall and fixed fees are all common. Users asked for a setting they can
change once and have every cost figure follow.

## Decision

- A single `Tariff` object (`services/cost/TariffModel.js`) describes how
  the user is billed: `flat`, `tou` or `tiered`, plus charging habits. It is
  versioned and only enters the domain through `normalizeTariff`, which fills
  defaults and clamps values so every consumer sees a complete object.
- The tariff is persisted in `localStorage` under the existing preferences
  key (`prefs.tariff`). The legacy `electricityRate` / `currency` /
  `homeChargingPercent` seed a flat tariff the first time and are otherwise
  ignored.
- Pricing is split by responsibility, each a pure class with unit tests:
  `TariffEngine` (which price applies when; tiered month pricing),
  `ChargingSessionAllocator` (when a session's energy was drawn from the
  wall), `CostCalculator` (energy accounting over a trip set and the
  breakdowns). Components edit the model and render the result; they hold no
  formulas.
- Time-of-use pricing prefers charging sessions inferred from SOC between
  trips and falls back to the average price of the user's charging window,
  and says which one it used.
- Fixed fees are reported but not added to the total, since they are paid
  whether or not the car charges.

## Consequences

- The Simple story, the KPI tile and the settings panel all show the same
  number because they call the same calculator with the same tariff.
- Adding a tariff shape (for example demand charges) means extending the
  model, the engine and `ANALYTICS.md` §9, plus a fixture-based test.
- Session inference depends on SOC being present and on the battery size;
  both are stated in the result's assumptions.

## Alternatives considered

- **Keep the flat rate and add a TOU multiplier**: cannot express weekday
  rules or tiers; rejected.
- **Fetch real tariffs from utility APIs**: no common API exists and it would
  leak location; a country-average lookup by typed city is the compromise.
- **Compute in the component**: violates
  [ADR-0003](./0003-services-are-pure.md).
