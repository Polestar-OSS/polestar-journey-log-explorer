# 0001 – All processing happens in the browser

2025-11 · Accepted

## Context

The Journey Log export contains addresses, coordinates and timestamps of every
drive: a complete movement profile of a person. The tool exists to make that
file useful, not to collect it.

## Decision

The application is a static site. Files are parsed, merged and analysed in the
browser. There is no upload endpoint, no account, and no persistence beyond
`localStorage` for notes, tags and preferences.

## Consequences

- Hosting is GitHub Pages; the deploy pipeline is a build and an upload.
- Every analytic must run comfortably on a laptop or phone for a few thousand
  trips. Services are O(n) or O(n log n); the map and ExcelJS are lazy chunks.
- Features that need a server (Polestar cloud OAuth, shared dashboards) are out
  of scope for this repository. PR #19 was closed for this reason.
- Third-party requests are limited to map tiles, an optional city lookup for
  electricity tariffs (typed text only), and the site's analytics/consent
  scripts, which never see trip data.

## Alternatives considered

- A thin backend for heavy analytics: rejected, it would create a data
  controller where none is needed.
- Web Workers for parsing: not needed at current sizes; can be added inside the
  data layer without touching services.
