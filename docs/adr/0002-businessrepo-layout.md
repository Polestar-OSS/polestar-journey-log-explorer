# 0002 – BusinessRepo layout, Makefile-driven CI

2026-09 · Accepted

## Context

The repository had an `app/` directory, docs, and two workflows that called
`npm` directly with Node 18, which Vite 7 no longer supports. There were no
tests, and Dependabot's configuration was invalid (empty ecosystem), so no
updates had ever been produced.

## Decision

Treat the repository as the single owner of the "journey log explorer"
capability:

```
app/      application
tests/    unit (and later e2e) suites, fixtures
docs/     documentation and ADRs
.github/  CI, deploy, Dependabot
Makefile  install · dev · build · preview · lint · test · coverage · audit · check
```

CI workflows call Makefile targets only. `make check` is what a pull request
runs. Lint runs with `--max-warnings=0`.

## Consequences

- One place to learn how to build, test and ship; identical locally and in CI.
- Tests are outside the app package and import services relatively; Vitest is
  configured in `app/vitest.config.js` to include `../tests/unit/**`.
- Node 22 in CI; `engines` in `app/package.json` documents the floor.
- Dependabot covers npm (grouped by Mantine, React, lint, build) and
  GitHub Actions.

## Alternatives considered

- Keeping tests under `app/src/__tests__`: rejected, mixes shipped code with
  test code and hides the test layer from the repository root.
- A monorepo tool (Turborepo, Nx): unnecessary for one application.
