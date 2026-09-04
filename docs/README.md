# Documentation

| Read this if you… | Document |
|---|---|
| want to use the explorer | [User guide](./USER_GUIDE.md) · [Quick start](./QUICKSTART.md) |
| want to know how a number is computed | [Analytics reference](./ANALYTICS.md) |
| are changing code | [Development guide](./DEVELOPMENT.md) · [Architecture](./ARCHITECTURE.md) · [Data model](./DATA_MODEL.md) · [Testing](./TESTING.md) |
| are adding a screen or chart | [Design system](./DESIGN_SYSTEM.md) |
| want to know why something is the way it is | [Architecture decision records](./adr/README.md) |
| want to contribute | [Contributing](./CONTRIBUTING.md) |
| want the one-page summary | [Project summary](./PROJECT_SUMMARY.md) |

Diagrams (Mermaid) live in [`diagrams/`](./diagrams/):
[system architecture](./diagrams/system-architecture.md) ·
[data flow](./diagrams/data-flow.md) ·
[component hierarchy](./diagrams/component-hierarchy.md) ·
[data model](./diagrams/data-model.md) ·
[user journey](./diagrams/user-journey.md) ·
[deployment](./diagrams/deployment-process.md).

## Conventions

- Documentation ships in the same pull request as the change it describes.
- Formulas live in `ANALYTICS.md` only; other documents link to it.
- Decisions get an ADR; documents describe the current state and link to the
  ADR for the reasoning.
- Screenshots are not committed (they may contain personal data). The
  Playwright script in `tests/e2e/` regenerates them.

## Disclaimer

Community project. Not affiliated with, endorsed by, or officially connected
with Polestar, the Polestar brand, Geely, or any of their subsidiaries.
Licensed under AGPL-3.0.
