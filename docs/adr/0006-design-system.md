# 0006 – Token-based design system and chart rules

2026-09 · Accepted

## Context

The original UI used Mantine defaults: blue primary, rounded cards, a
five-colour rainbow in charts, dashed grids. It read as a generic admin panel
and did not survive dark mode in places (light-only backgrounds, hard-coded
tick colours).

## Decision

- **Tokens first.** `theme/tokens.js` defines light and dark palettes (page,
  surface, ink, muted, grid, axis, border, accent, categorical series,
  sequential ramp, status). `theme/global.css` mirrors them as CSS custom
  properties. Components use tokens through CSS variables or `useTokens()`.
- **Polestar-adjacent language.** Near-black and off-white surfaces, one warm
  accent (`#FF7500` dark / `#E8590C` light), 2 px corners, hairline borders,
  light display type (Inter Variable, bundled, no font CDN), uppercase tracked
  eyebrows.
- **Charts** follow the dataviz rules: one axis per chart, categorical hues in
  a fixed order, thin marks (≤ 24 px bars with rounded data-ends, 2 px lines),
  solid hairline grids, a legend for two or more series, every chart with a
  table twin, tooltips that enhance but never gate.
- **Categorical palette validated** for colour-vision deficiency: 3 slots pass
  the all-pairs check in both modes (worst CVD ΔE 10.8 light / 11.6 dark;
  normal-vision ≥ 20.9; ≥ 3:1 on their surface). Status colours are separate
  and always paired with a label.
- **Motion** is decorative only and gated on `prefers-reduced-motion`.

## Consequences

- Dark and light are both designed, not derived; the map basemap follows.
- New charts inherit the look from `ChartCard`, `ChartTooltip` and the shared
  axis props; there is no per-chart styling.
- The palette file documents the validator output so re-validation after a
  brand change is a one-command job.

## Alternatives considered

- Tailwind or CSS-in-JS: rejected, Mantine is already the component layer and
  its theme plus custom properties cover the need.
- Loading a Polestar web font: not licensed; Inter is a close grotesque and is
  bundled to avoid a third-party request.
