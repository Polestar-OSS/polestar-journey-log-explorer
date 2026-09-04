# Comparison vehicles

"Compared with a petrol car" figures come from real cars, not an average.
The cars live in [`app/src/data/vehicles/`](../app/src/data/vehicles/), one
JSON file per make, validated against `vehicle-make.schema.json` and by
`validateMake` in the unit suite. Every file records the official database
the numbers were read from and the date they were read.

## What is bundled

`volvo.json`: Volvo S60, S90, V60 (Cross Country and T8), V90 Cross
Country, XC60 and XC90 for model years 2025 and 2026, in the mild-hybrid
petrol (B5 / B6) and plug-in hybrid (T8) forms the US EPA has tested. Each
entry keeps the EPA vehicle id so the figure can be checked at
`https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=<epaVehicleId>`.

## Where the numbers come from

The US EPA fuel-economy web service, `https://www.fueleconomy.gov/ws/rest/`:

| Field in the file | EPA field | Meaning |
|---|---|---|
| `mpg.city`, `mpg.highway`, `mpg.combined` | `city08`, `highway08`, `comb08` | Miles per US gallon, petrol mode |
| `electric.kwhPer100mi` | `combE` | Plug-in hybrids: kWh per 100 miles in electric mode |
| `electric.rangeMi` | `rangeA` | Plug-in hybrids: electric range in miles |

Derived, with the derivation recorded in the file's `method` block:

```
lPer100km  = 100 × 3.785411784 ÷ (mpg × 1.609344)
co2GPerKm  = 8,887 g CO₂ per US gallon of gasoline (EPA) ÷ mpg ÷ 1.609344
kwhPer100km = kwhPer100mi ÷ 1.609344 ;  rangeKm = rangeMi × 1.609344
```

CO₂ is tailpipe only. The EPA's own `co2TailpipeGpm` is not used because it
is inconsistent for plug-in hybrids (some models report the blended figure,
others petrol-only); deriving from `comb08` treats every car the same way.

## How the comparison is computed (`services/comparison/VehicleComparison`)

- **Petrol and mild hybrid**: `fuel = distance × lPer100km ÷ 100`,
  `CO₂ = distance × co2GPerKm ÷ 1000`.
- **Plug-in hybrid**: charged every night. For each calendar day, the first
  `rangeKm` of driving is electric at `kwhPer100km`, priced at your own
  effective electricity rate from the tariff; the rest is petrol. Trips
  without a date count as petrol.
- **Money**: only when you enter a fuel price (per litre for km exports, per
  US gallon for mile exports). `saving = fuel cost + hybrid electricity −
  your electricity cost`. No price is assumed.
- **Tree-years**: CO₂ ÷ 22 kg, the Arbor Day Foundation's figure for a
  mature tree's annual absorption.

## Adding a make

1. Query the EPA service for the models you want:
   `…/vehicle/menu/model?year=2025&make=Toyota`, then
   `…/vehicle/menu/options?year=2025&make=Toyota&model=RAV4 Hybrid AWD`,
   then `…/vehicle/<id>` for each option.
2. Create `app/src/data/vehicles/<make>.json` following `volvo.json`: keep
   the EPA id, the raw mpg fields, the derived metric fields and today's
   date in `retrieved`.
3. `make test` validates the file. Open a pull request with the query you
   used. Figures from a manufacturer brochure or a review site are not
   accepted; the point is that every number can be traced to a test database.

Cars certified only under WLTP (no EPA listing) can be added the same way
from a national database that publishes combined-cycle figures, with the
`source` URL pointing at it; note the cycle in `sourceDetail`.
