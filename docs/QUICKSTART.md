# Quick start

## Using it

1. Open <https://polestar-oss.github.io/polestar-journey-log-explorer/>.
2. Drop one or more Journey Log exports (CSV or XLSX) on the page, or click
   **Explore with sample data**.
3. Read the **Simple** page. Switch to **Detailed** or **Expert** in the
   header when you want more.
4. Use the filter row to narrow to a period; use **Export** to download the
   filtered trips.

Nothing leaves your browser.

## Developing it

```bash
git clone https://github.com/Polestar-OSS/polestar-journey-log-explorer.git
cd polestar-journey-log-explorer
make install
make dev            # http://localhost:5173/polestar-journey-log-explorer/
make check          # lint + test + build, the pull-request gate
```

Node 20.19+ or 22.12+ is required. See the
[development guide](./DEVELOPMENT.md) for the layout and conventions.
