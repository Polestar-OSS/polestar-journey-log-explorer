# User guide

## Getting your data

1. Install the **Polestar Journey Log** app in the car (Google Play in the
   vehicle's app store) and sign in with your Polestar ID.
2. Drive. Journeys are recorded from drive mode to park.
3. In the app, choose a date range and tap **Export**. The CSV or XLSX arrives
   by email.
4. Open the explorer and drop the file on the landing page.

Nothing is uploaded. The file is read in your browser and stays there.

## Several files at once

Drop as many exports as you like, at once or later via **Add files** in the
header. Overlapping date ranges are fine: a trip that appears in more than one
file is counted once. The sources bar under the header shows, per file, how
many rows were read, how many were new, and how many were duplicates. If two
files disagree about the same trip's energy or battery values, the first file
wins and the disagreement is counted as a conflict.

A km export and a mile export can be mixed; everything is shown in the unit of
the first file.

## Your data stays in this browser

By default the de-duplicated journey is saved in your browser's IndexedDB
(room for many years of driving) after every upload and reopens by itself
next time; the landing page shows what is
saved and lets you open, add to, or delete it. Open **Your data and
settings** (database icon in the header, or the ⋮ menu on phones) to:

- switch the saving off or on;
- export the journey as a CSV with the same columns as the Journey Log
  export, de-duplicated across every file you added, in your display unit,
  so it opens anywhere the original does and re-imports here;
- export or import your settings as JSON (level, units, tariff, comparison
  car, fuel price, this switch, trip notes and tags);
- delete the saved journey, or everything the app stored, each behind a
  confirmation.

Files in miles and files in kilometres can be mixed; everything is merged
into one unit and shown in the units you chose. The synthetic sample is
never saved.

## Units

Everything is metric by default (km, kWh/100 km, litres) whatever unit
your export used; switch to imperial (miles, kWh/100 mi, US gallons) in
the settings panel. The choice is remembered and the saved fuel price is
converted with it. Pump prices are entered in cents, as on the sign.

## Help inside the app

The **?** in the header (in the ⋮ menu on phones) opens two pages: how to
export your data from the car app, and a level-by-level, feature-by-feature
guide to what each view shows and how to read it. The **Guide** tab holds
the formulas.

## Choosing a level

The header has a **Simple · Detailed · Expert** switch. It is remembered.

**Simple** is one page of plain sentences: how far, how much energy, what it
cost, how far a full charge goes in summer and winter, what winter costs you,
how you charge, where you go, what a petrol car would have emitted, your
rhythm, your records, and three tips drawn from your own numbers. Use the
buttons at the bottom to go deeper.

**Detailed** adds:
- an **Overview** of charts (distance per period, efficiency with a rolling
  median, month-of-year seasonality, distributions, a weekday × hour heatmap,
  the battery timeline, trip length vs efficiency),
- an **Insights** page with the findings as cards and the reasoning behind
  each one,
- the full set of KPI tiles.

**Expert** adds an **Explore** tab:
- a pivot builder (any dimension × any metric, with CSV export),
- percentiles for distance, efficiency, energy, duration, speed and battery
  use,
- a fitted consumption model (fixed cost per trip + rolling consumption),
- efficiency by speed band, by hour, and by starting battery level,
- a battery fit (kWh per percent → usable capacity),
- where charging starts and stops,
- a data-quality report (unlogged km per month, odd rows, merge conflicts).

The trip table also gains odometer, coordinates, type and source columns.

## The filter row

Sits above everything and scopes every tile, chart, insight, map and table.

- Date presets count back from your **most recent trip**, so an old export
  still has a meaningful "last 30 days". **Custom** opens a range picker.
- Category (when the file has more than one), source file (when more than one
  file is loaded), and tags (once you have added some).
- **More** holds sliders for distance, efficiency and battery used.

When a date filter is active, the tiles show a change versus the equally long
period before it.

## Reading the numbers

- **Efficiency** is kWh per 100 km (or per 100 mi). Lower is better. The
  Simple level also shows the inverse, km per kWh, which many people find
  easier.
- **Best / worst efficiency** only consider trips of 5 km (3 mi) or more,
  because a one-minute hop can read absurdly high or low.
- **Charging, battery size and "home" are inferred**, not read from the car.
  The Insights cards and the Guide tab say how.
- **CO₂ avoided** is what an average petrol car would have emitted over the
  same distance; it does not subtract the electricity's footprint.

Every chart has a **table view** (the ⊞ button) so no value is hidden behind a
hover.

## Map

Four modes, switched in the panel on the left (on phones, tap the button
showing the current mode, "Routes" at first, to open the drawer with modes,
basemap, trip linking and road snapping; a one-line hint says so until the
first tap):

- **Routes**: every trip as a glowing line coloured by efficiency, with a
  slow "flow" animation along the direction of travel. Start and end pins
  cluster when zoomed out; click a cluster to zoom in, a pin for the trip.
  Consecutive trips of a day are linked by dotted chains (on by default;
  switch it off in the panel). Pick one trip in "Single trip" to isolate it
  and dim the rest.
- **Heat**: a density heatmap of where you start and stop.
- **Places**: bubbles sized by how many trips touch each place, drawn from the
  same clustering as the "Most visited" insight. Click one to fly to it.
- **Replay**: drives the filtered period day by day, or just the days you
  pick on the range slider, or one trip chosen from the list. A car marker moves
  along each trip in order with the route drawing behind it (along the road
  when snapping is on), the view pans to keep it in sight, and running
  totals tick up. Long days take longer; the speed control (0.2× to 10×,
  0.2× by default so a day is watchable) divides that. The slider scrubs by
  day; with reduced motion the replay steps day by day.

Basemaps: satellite imagery, OpenStreetMap and Humanitarian. Imagery is the
default under the dark theme, OpenStreetMap under the light one. Trips without coordinates never appear on the map.

**Road snapping** (off by default) replaces straight lines with the road route
between start and end. It sends start and end coordinates (rounded to four
decimals, about 10 m) to the public OSRM demo server, one request per unique
pair, and caches the results in your browser. You are asked once before the
first request; nothing is sent until you agree. See
[ADR-0008](./adr/0008-opt-in-road-snapping.md).

The chip at the top right counts the trips inside the current view and their
distance; the arrows button fits the map to every visible trip. The map
respects reduced-motion settings: the flow animation and pulse are off there.

## Trips

Search by address, date or category; sort by any column; page through. The
note icon opens notes and tags for a trip. Notes and tags are stored in your
browser only and appear as a filter once you have some.

## Electricity tariff

Open **Electricity tariff settings** under the KPI row, the "Charging cost"
tile, or the cost card in the Simple story. Everything you set is saved in
your browser and applied everywhere a cost is shown.

- **Preset**: type a provider, country, province or state ("ottawa",
  "texas", "sweden", "ulo") and pick a plan. Hydro Ottawa and Toronto Hydro
  carry the Ontario time-of-use, ultra-low overnight and tiered schedules;
  Canada, the United States, the United Kingdom, Sweden and the EU carry
  all-in averages per province, state or price zone. The search is local;
  nothing is sent anywhere. Presets are JSON files anyone can add; see
  [`TARIFF_PRESETS.md`](./TARIFF_PRESETS.md).
- **Currency label**: optional and only for display. Type `$`, `EUR`, `R$`
  or nothing at all; the maths is the same either way.
- **Flat**: one price per kWh.
- **Time of use**: a default price plus up to twelve periods, each with a
  price, days (every day, weekdays, weekends), an optional season and a
  from/to time. Windows that end before they start wrap midnight. Periods
  are checked in order.
- **Seasons**: if your utility changes the schedule or the tier blocks
  between summer and winter, define the seasons (month-day ranges) and pick
  one on each period, or switch on different tiers for that season.
- **Tiered**: monthly volume blocks. Set your household's baseline so the
  car is priced in the block it actually lands in.
- **Charging habits** (accordion): the share and price of public charging,
  wall-to-battery losses, charger power, whether the car charges as soon as
  it is plugged in, in the cheapest hours, or in a window you choose, the
  window itself, the battery's usable capacity and any fixed monthly fee.

On a phone the panel opens full screen; the period editor becomes a stack of
cards and every input is sized so the browser does not zoom in on focus.

The panel on the right prices the trips currently in view: total, home vs
public, effective price per kWh, cost per 100 km and per trip, a breakdown by
rate period, a month-by-month bar and the assumptions the estimate rests on.
For time-of-use tariffs the app infers charging sessions from the battery
level rising between trips and places each session's energy in time using
your charging habit. If there are too few sessions it falls back to the
average price of your charging window. The formulas are in
[`ANALYTICS.md`](./ANALYTICS.md#9-electricity-cost-costcalculator).

## Compared with a petrol or hybrid car

The CO₂ tile, the "Compared with" story card and the "Against real petrol
and hybrid cars" table in Insights use a real car, not an average. Open the
settings (same panel as the tariff), pick the car under **Compared with a
petrol or hybrid car** and, if you want the money side, enter your fuel
price per litre (or per US gallon for mile exports). Choosing a tariff
preset that carries an official pump price (Canada and its provinces, the
US and its regions, the UK) fills it in for you, with the source shown.
Without a price the app shows fuel volume and CO₂ only; it never assumes
one.

Bundled cars are the Volvo S60, S90, V60, V90, XC60 and XC90 as petrol mild
hybrids and plug-in hybrids, from the US EPA fuel-economy database, with the
EPA id shown so you can check. Plug-in hybrids are modelled as charged every
night: the first electric-range kilometres of each day electric, the rest
petrol. Figures are combined-cycle and tailpipe-only. To add a make, see
[`VEHICLE_DATA.md`](./VEHICLE_DATA.md).

## Exporting

**Export** in the header downloads the currently filtered trips as CSV with
the derived columns (duration, speed, efficiency, source file). The pivot
builder has its own CSV button.

## Privacy

Processing is local. The only outbound requests are map tiles, road
snapping on the map if you turn it on (rounded start/end coordinates, after
you agree), and Google Analytics to count visits, which stays off until you
accept the banner and never sees trip data. The footer shows whether
analytics is on and lets you change it; "Delete everything" in the data
dialog also clears that choice.

## Troubleshooting

- **"No trips with a distance above zero"**: the file has only zero-length
  rows or the distance column is missing. The header must contain
  `Distance in KM` or `Distance in Mile`.
- **Dates look wrong**: the export writes `YYYY-MM-DD, HH:MM` in the car's
  local time; the explorer keeps that. Nothing is converted.
- **The map is empty**: trips without coordinates are hidden on the map; the
  Expert data-quality panel counts them.
- **Numbers differ from the app**: the app shows totals over all rows,
  including zero-distance ones; the explorer drops those.
