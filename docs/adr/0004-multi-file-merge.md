# 0004 – Several exports merge as a set keyed on trip identity

2026-09 · Accepted

## Context

The Journey Log app exports a date range chosen by the user, so people
accumulate overlapping files: one per month, one "everything so far", one in
miles from a rental. Concatenating them double-counts; forcing one file loses
history.

## Decision

`JourneyMerger.merge(sources)` performs a set union:

- **Identity** of a trip is `startTs | endTs | round(distance, 1)`. Start and
  end minute pin a drive; the rounded distance separates two drives in the same
  minute (a `MERGED` record re-exported as two).
- **Order** matters only for ties: the first file to contain a trip supplies
  its values.
- **Conflicts** (same identity, different energy or SOC) are counted and shown,
  not resolved automatically.
- **Units** are normalised to the first file's unit before keying, converting
  distance, odometers, efficiency and speed.
- Every trip is tagged with `sourceFile`, which is a filter dimension, a pivot
  dimension and an export column.

The dropzone accepts up to 12 files at once; an "Add files" modal appends to a
loaded journey; the sources bar shows rows / added / duplicates per file.

## Consequences

- Idempotent: dropping the same file twice changes nothing.
- Order-insensitive in size; only the winning values of conflicting duplicates
  depend on order, and conflicts are surfaced.
- Verified on two real exports of the same car: 556 + 556 rows → 586 unique
  trips, 526 duplicates, 0 conflicts.

## Alternatives considered

- Keying on odometer readings: rejected, odometers are in the file's unit and
  the same drive appears with different readings in km and mile exports.
- "Last file wins": rejected, silently overwriting values hides export bugs;
  counting conflicts makes them visible.
