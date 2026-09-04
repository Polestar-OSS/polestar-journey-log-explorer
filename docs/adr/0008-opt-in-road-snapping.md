# 0008 – Road snapping is opt-in, consented, rounded and cached

2026-09 · Accepted

## Context

Straight lines between start and end make the map honest but dull, and they
say nothing about the road actually driven. Routing needs a server; the app
has none ([ADR-0001](./0001-client-only-processing.md)), and trip coordinates
are the most sensitive data in the export (home, work, family).

## Decision

- Routes are straight lines by default. Nothing about a trip leaves the
  browser unless the user turns on **Road snapping** in the map panel.
- The first activation shows a consent dialog naming the service (the public
  OSRM demo server), what is sent (start and end coordinates rounded to four
  decimals, about 10 m) and that no timestamps, odometer or consumption go
  with them. Declining leaves the toggle off.
- `RouteSnapper` sends one request per unique start/end pair, not per trip,
  with an abortable queue and progress, and stores responses in
  `localStorage` under a versioned key so a second visit sends nothing.
- Failures fall back to the straight line for that pair; the map never
  blocks on the network.
- The snapper takes its `fetch` as a dependency so tests run without the
  network.

## Consequences

- The default map is fully offline apart from basemap tiles.
- The demo server is rate-limited and offers no SLA; the feature is marked as
  best-effort in the UI and the cache keeps repeat use cheap.
- A self-hosted OSRM endpoint can be swapped in through the snapper's base
  URL without touching the map.

## Alternatives considered

- **Always snap**: rejected; it would send every user's home coordinates to a
  third party by default.
- **Bundle a routing engine**: a road graph for even one region is tens of
  MB; rejected for a static site.
- **Snap server-side**: no backend by design.
