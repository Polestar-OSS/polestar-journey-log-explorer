# 0013 – The de-duplicated journey persists in the browser, in the export format

2026-09 · Accepted

## Context

Every visit started from an empty page and a file upload. Owners add an
export every few weeks; they want the app to remember the merged history,
to add the new file to it, to get the merged file back, and to be able to
wipe it. Nothing may leave the browser ([ADR-0001](./0001-client-only-processing.md)).

## Decision

- A `persistJourney` preference, on by default, keeps the merged,
  de-duplicated journey in `localStorage` after every merge. The synthetic
  sample is never saved.
- The stored payload is the Journey Log export format itself: the same
  headers and rows `JourneyLogWriter` produces. Loading runs the normal
  parser, so the saved data and an uploaded file are indistinguishable to
  the rest of the app, and the same rows are what "Export journey as CSV"
  writes.
- The saved journey is one more source to `JourneyMerger`; new uploads
  merge into it, files in miles or kilometres alike, into metric
  canonically ([ADR-0012](./0012-units-at-the-boundary.md)).
- `SettingsPort` exports and imports preferences and trip notes as JSON.
- Deletion is explicit and confirmed: the saved journey alone, or
  everything the app stored followed by a reload. `JourneyStore` takes its
  storage as a dependency and reports quota failures instead of throwing.

## Consequences

- A returning user lands in the dashboard with their history; the landing
  page shows what is saved and offers to open, extend or delete it.
- Storage is bounded by the browser (about 5 MB); a year of driving is
  well under 1 MB. On quota failure the data stays loaded for the visit and
  a notice says it was not saved.
- Anyone sharing a browser profile shares the journey; the switch and the
  delete are there for that.

## Alternatives considered

- **IndexedDB**: more room, more code; not needed at this size.
- **Store the parsed trip model**: ties the store to the parser's shape;
  the export format is stable and re-importable.
