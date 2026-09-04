# 0005 – Three experience levels over one data model

2026-09 · Accepted

## Context

The audience spans people who want one sentence ("how much did winter cost
me?") and people who want the residuals of a regression. One dashboard cannot
serve both without either hiding the depth or burying the sentence.

## Decision

A persisted **Simple / Detailed / Expert** switch in the header. It changes
which tabs and how many tiles render; it never changes the data, the filters
or the formulas.

| Level | What it adds |
|---|---|
| Simple | "Your driving" story: plain-language cards built by `StoryBuilder`, one idea per card, one everyday comparison, three tips derived from the numbers, one simple chart, a "want more" panel |
| Detailed | Overview charts, Insights, full KPI row |
| Expert | Explore tab: pivot builder, percentile table, fitted consumption model, efficiency drivers, battery fit, charging histogram, data-quality report; extra columns in the trip table |

Defaults: a first-time visitor lands on **Simple**; the choice is remembered in
`localStorage`. The Simple story ends with buttons to go deeper, and the
Explore tab is one click from any level.

## Consequences

- The story reuses `InsightsCalculator`; no second set of formulas.
- The Expert layer lives in its own services (`StatsService`, `PivotService`)
  so the Detailed bundle does not pay for it at runtime beyond code size.
- Every level shares the filter row, so a Simple reader can still ask
  "last 90 days".

## Alternatives considered

- Progressive disclosure per card ("show details"): rejected, it makes the
  Simple page long and the Expert page fragmented.
- Separate routes/apps: rejected, one data model and one filter state is the
  whole point.
