# 0007 – Strict parsing of Journey Log dates

2026-09 · Accepted

## Context

The export writes dates as `YYYY-MM-DD, HH:MM`. The original code called
`new Date()` on that string in eleven places. V8 (Chrome, Node) accepts it;
Firefox and Safari return `Invalid Date`, which silently emptied every
time-based chart and filter for those users. The export is also newest-first,
which made every "last N trips" view show the oldest N.

## Decision

- `utils/journeyDate.js` owns parsing. `parseJourneyDate` matches the export
  format explicitly (and accepts Date objects, epoch numbers and ISO strings),
  returning `null` for anything else.
- The parser runs once, in `dataParser`, and stores `startTs` / `endTs` plus
  derived keys on the trip. Services compare timestamps, never strings.
- Trips are sorted chronologically at parse time and re-numbered.
- `formatJourneyDate` produces the canonical string so synthetic data and
  merged files look like the export.

## Consequences

- Cross-browser correctness for filters, aggregates and the SOC timeline.
- A single place to extend if the app changes its export format.
- The unit tests assert the format round-trips and that garbage yields `null`.

## Alternatives considered

- dayjs with a custom format: it is a peer dependency of the date picker
  already, but a 6-line regex is smaller, faster, and has no locale surprises.
