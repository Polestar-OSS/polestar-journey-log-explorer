# Tariff presets

Presets are the "Start from a preset" list in **Electricity tariff settings**.
They are plain JSON, one file per electricity provider (or generic region),
under [`app/src/data/tariffs/`](../app/src/data/tariffs/). The app discovers
every file at build time; nothing else has to be registered. A preset is a
starting point the user then edits, so the numbers should be right on the
day the file is written, with the source and effective date recorded.

## Contributing a provider

1. Copy [`hydro-ottawa.json`](../app/src/data/tariffs/hydro-ottawa.json)
   to `app/src/data/tariffs/<provider-id>.json`. The file name is the `id`.
2. Fill in `provider`, `region`, `currency` (a display label only),
   `source` (the URL the rates come from), `effective` (`YYYY-MM-DD`) and
   `notes` for anything the model cannot express (holidays, delivery
   charges, rebates, taxes).
3. Add one entry under `plans` per price plan the provider sells. A plan's
   `tariff` is a partial tariff; everything left out takes the app default.
4. Run `make test`. The suite validates every file structurally and prices
   a few moments through it. Editors that understand JSON Schema get inline
   help from the `$schema` reference.
5. Open a pull request with the source linked. Rates are public regulated
   figures; do not include anything from a personal bill.

## File shape

```jsonc
{
  "$schema": "./tariff-provider.schema.json",
  "id": "hydro-ottawa",                 // lower-case, dashes; equals the file name
  "provider": "Hydro Ottawa",           // or "Generic" for a regional average
  "region": "Ottawa, Ontario, Canada",
  "currency": "CAD",                    // display label only, never used in maths
  "source": "https://…",
  "effective": "2025-11-01",
  "notes": "Holidays are billed off-peak but not modelled …",
  "plans": [
    { "id": "tou", "label": "Time of use", "description": "…", "tariff": { … } }
  ]
}
```

Generic entries are listed after named providers and grouped by region.
Plans appear as `Provider · Region → label` in the picker; the provider's
source and notes are shown once a preset is chosen.

## The tariff object

The full field list, defaults and clamping live in
[`TariffModel.js`](../app/src/services/cost/TariffModel.js) and the data
model doc ([`DATA_MODEL.md`](./DATA_MODEL.md#tariff-servicescosttariffmodeljs)).
The parts that matter for a preset:

| Field | Meaning |
|---|---|
| `mode` | `flat`, `tou` (time of use) or `tiered` (monthly volume blocks) |
| `flat.rate` | Price per kWh |
| `seasons[]` | Optional. `{ id, label, from: "MM-DD", to: "MM-DD" }`, inclusive; `to` before `from` wraps the year end. At most 4. |
| `tou.defaultRate` | Price when no period matches (use it for the cheapest, all-day rate) |
| `tou.periods[]` | `{ id, label, rate, days, season, from: "HH:MM", to: "HH:MM" }`. `days` is `all`, `weekday` or `weekend`; `season` is a season id or `all`. `to` is exclusive; `to` at or before `from` wraps midnight; equal means all day. Checked in order, first match wins. At most 12. |
| `tiered.householdBaselineKwh` | Household use before the car, consumed first each month |
| `tiered.tiers[]` | `{ upToKwh, rate }` in ascending order; the last has `upToKwh: null` |
| `tiered.tiersBySeason` | Optional. `{ "<season id>": tiers[] }` when thresholds differ by season |
| `fixedMonthlyFee` | Standing or delivery charge; reported, not added to the car's total |
| `publicCharging` | `{ enabled, sharePct, rate }` for charging away from home |
| `homeCharger`, `homeChargingWindow` | Charger power and when the car charges; only matter for time of use |

### Seasons, worked example

Ontario's regulated plan swaps mid-peak and on-peak between summer and
winter, and its tiered plan has a 600 kWh first block in summer and
1,000 kWh in winter. In the file that is:

```jsonc
"seasons": [
  { "id": "summer", "label": "Summer", "from": "05-01", "to": "10-31" },
  { "id": "winter", "label": "Winter", "from": "11-01", "to": "04-30" }
],
"tou": {
  "defaultRate": 0.098,
  "periods": [
    { "id": "weekend", "label": "Off-peak (weekend)", "rate": 0.098, "days": "weekend", "season": "all", "from": "00:00", "to": "00:00" },
    { "id": "night",   "label": "Off-peak",           "rate": 0.098, "days": "weekday", "season": "all",    "from": "19:00", "to": "07:00" },
    { "id": "s-mid-am","label": "Mid-peak",           "rate": 0.157, "days": "weekday", "season": "summer", "from": "07:00", "to": "11:00" },
    { "id": "s-on",    "label": "On-peak",            "rate": 0.203, "days": "weekday", "season": "summer", "from": "11:00", "to": "17:00" },
    …
  ]
}
```

and for the tiered plan:

```jsonc
"tiered": {
  "tiers":         [ { "upToKwh": 600,  "rate": 0.12 }, { "upToKwh": null, "rate": 0.142 } ],
  "tiersBySeason": { "winter": [ { "upToKwh": 1000, "rate": 0.12 }, { "upToKwh": null, "rate": 0.142 } ] }
}
```

The engine resolves a season from the calendar day (a month is assigned by
its 15th for tier thresholds), then the first period whose season, day rule
and window match. Days that fall outside every declared season use the
`season: "all"` periods and the default tiers.

## What the model does not do

- **Holidays.** Utilities bill statutory holidays as weekends; the model
  only knows weekdays and weekends. Say so in `notes`.
- **Demand charges, export credits, dynamic spot prices.** Out of scope;
  approximate with an average and say so.
- **Taxes and delivery.** Prices are whatever the file says. Put an
  all-in price in `rate` if that is what the bill shows, and list the
  standing charge under `fixedMonthlyFee`.

## Validation

`validateProvider` in
[`TariffPresets.js`](../app/src/services/cost/TariffPresets.js) runs in
`tests/unit/cost.test.js` over every file and rejects the common mistakes:
bad ids, times that are not `HH:MM`, seasons that are referenced but not
declared, a last tier that is not open-ended, a missing default rate.
The JSON Schema is the same contract for editors.
