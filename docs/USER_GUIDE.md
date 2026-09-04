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

Routes are straight lines between start and end, coloured by efficiency
(legend on the left). Toggle start/end pins, a density heatmap and day chains.
The basemap follows your light/dark theme. Click a pin for the trip's details.
"Most visited" lists the places that account for most of your trips; click one
to centre the map on it.

## Trips

Search by address, date or category; sort by any column; page through. The
note icon opens notes and tags for a trip. Notes and tags are stored in your
browser only and appear as a filter once you have some.

## Cost calculator

Available from the KPI row (and the Simple story). Set your home tariff and
currency, optionally by searching your city, and the share of charging done at
home. The tariff is remembered and used by the Simple story's cost card.

## Exporting

**Export** in the header downloads the currently filtered trips as CSV with
the derived columns (duration, speed, efficiency, source file). The pivot
builder has its own CSV button.

## Privacy

Processing is local. The only outbound requests are map tiles, an optional
city lookup for tariffs (the text you typed, nothing else), and the site's
analytics and cookie-consent scripts, which never see trip data.

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
