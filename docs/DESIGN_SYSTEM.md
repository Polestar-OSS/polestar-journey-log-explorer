# Design system

The visual language is deliberately quiet so the data can be loud: monochrome
surfaces, one warm accent, sharp corners, hairline borders, light display type.
This document is the reference for anyone adding a screen or a chart.

## Tokens

Source of truth: `app/src/theme/tokens.js` (JavaScript, for charts and the
map) mirrored by `app/src/theme/global.css` (CSS custom properties, for
everything else). Keep both in sync.

| Role | Light | Dark | CSS variable |
|---|---|---|---|
| Page | `#f4f4f2` | `#0b0b0b` | `--ps-page` |
| Surface | `#ffffff` | `#151515` | `--ps-surface` |
| Surface 2 | `#f7f7f5` | `#1c1c1c` | `--ps-surface-2` |
| Ink | `#101010` | `#f5f5f3` | `--ps-ink` |
| Ink 2 | `#52514e` | `#c3c2b7` | `--ps-ink-2` |
| Muted | `#898781` | `#898781` | `--ps-muted` |
| Grid (hairline) | `#e8e7e1` | `#262626` | `--ps-grid` |
| Axis | `#c8c7c0` | `#383835` | `--ps-axis` |
| Border | `rgba(16,16,16,.10)` | `rgba(255,255,255,.10)` | `--ps-border` |
| Accent | `#e8590c` | `#ff7500` | `--ps-accent` |
| Good / Warning / Serious / Critical | `#0a8f0a` `#d9950a` `#d9633a` `#c93232` | `#2fb52f` `#fab219` `#ec835a` `#e05252` | `--ps-good` … |

### Chart series (categorical, fixed order)

| Slot | Light | Dark | Used for |
|---|---|---|---|
| 1 | `#e8590c` | `#ea5f10` | the one series that matters |
| 2 | `#2a78d6` | `#3987e5` | second series (battery fit, plug-in) |
| 3 | `#17996b` | `#1aa374` | third series (charge added, unplug) |
| context | `#c3c2b7` | `#4a4a47` | de-emphasised marks (other months, single trips) |

Validated with the dataviz palette validator, all-pairs mode: light worst CVD
ΔE 10.8 (protan), normal-vision 21.4, all ≥ 3:1 on `#ffffff`; dark worst CVD
ΔE 11.6 (deutan), normal-vision 21.1, all ≥ 3:1 on `#151515`. Do not add a
fourth categorical slot without re-running the validator; fold to "Other" or
facet instead.

### Sequential ramp (one hue, for the heatmap)

Light `#fdebdd → #6e2a06` in 9 steps; dark `#2a1a10 → #ffb282`. Never a rainbow.

## Typography

- Family: Inter Variable (bundled via `@fontsource-variable/inter`), fallback
  system sans. Features `cv11`, `ss01`.
- Display: weight 300, tracking −0.03 to −0.04 em (`.ps-display`,
  `.ps-hero-figure`).
- Eyebrow: 11 px, 600, uppercase, +0.10 em tracking, muted (`.ps-eyebrow`).
- Numbers that align in columns use `.ps-tabular`; hero and tile values do not.

## Surfaces and spacing

- Cards: `.ps-card` (surface, 1 px border, 2 px radius, soft shadow);
  `.ps-card-hover` adds a 2 px lift.
- Accent bar: `.ps-accent-bar` (3 px left rule) for the one card that matters.
- Radius is 2 px everywhere (Mantine `defaultRadius: 'xs'`).
- Section rhythm: 16 px between cards, 24–32 px between sections.

## Charts

Every chart is built from three shared pieces:

- `ChartCard` (eyebrow, title, description, controls slot, footer, and the
  table-twin toggle in the controls).
- `ChartTooltip` (values lead, series name follows, colour by a short stroke;
  labels are text nodes, never HTML).
- Shared axis props (`axisLine={false}`, `tickLine={false}`, muted 11 px ticks).

Rules:

1. One y-axis. Two measures of different scale are two charts or a toggle.
2. Bars ≤ 24–28 px, rounded data-end only; lines 2 px; markers ≥ 8 px with a
   surface ring.
3. Grid: hairline, solid, one step off the surface; no dashed grids.
4. Direct-label selectively (the extreme, the endpoint), never every point.
5. A legend for ≥ 2 series; none for one.
6. Table twin for every chart (`DataTable`), reachable without hover.
7. Text wears text tokens, never the series colour.

## Motion

`ps-rise` (staggered by `--i`), `ps-fade`, `ps-draw` (hero route), count-up
via `useCountUp`. All disabled under `prefers-reduced-motion`.

## Map

Esri imagery sits under the dark scheme and OpenStreetMap under the light one; Humanitarian remains
selectable. Routes are coloured by efficiency band (green / yellow / orange /
red at 15 / 20 / 25 kWh/100 km, scaled for miles) and the legend states the
thresholds. Popups use `.ol-popup-*` classes and escaped strings.

## Accessibility checklist for a new view

- Colour never carries meaning alone (label, icon, or position as well).
- Every interactive element has a name (`aria-label` on icon buttons).
- Hover content is also reachable by keyboard focus or in the table twin.
- Contrast ≥ 3:1 for marks, ≥ 4.5:1 for text on both surfaces.
- Layout works at 390 px wide: cards stack, chart headers wrap, tab list scrolls.
