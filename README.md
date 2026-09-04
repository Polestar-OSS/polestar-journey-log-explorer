# Polestar Journey Log Explorer

![Polestar Journey Log Explorer](./assets/white_transparent.png)

[![Deploy to GitHub Pages](https://github.com/Polestar-OSS/polestar-journey-log-explorer/actions/workflows/deploy.yml/badge.svg)](https://github.com/Polestar-OSS/polestar-journey-log-explorer/actions/workflows/deploy.yml)
[![Dependabot](https://github.com/Polestar-OSS/polestar-journey-log-explorer/actions/workflows/dependabot/dependabot-updates/badge.svg)](https://github.com/Polestar-OSS/polestar-journey-log-explorer/actions/workflows/dependabot/dependabot-updates)
[![CodeQL](https://github.com/Polestar-OSS/polestar-journey-log-explorer/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/Polestar-OSS/polestar-journey-log-explorer/actions/workflows/github-code-scanning/codeql)
[![License: GNU Affero General Public License v3.0](https://img.shields.io/badge/License-AGPLv3-yellow.svg)](./LICENSE)

An interactive web-based dashboard for analyzing your Polestar journey log data. Upload your CSV/Excel files and explore comprehensive statistics, visualizations, and insights about your electric vehicle trips—all processed locally in your browser with complete privacy.

## ✨ Features

### 📊 Overview
- **Hero figure + KPI tiles** - distance, trips, energy, efficiency, CO₂ avoided, time driving, longest trip, odometer span; sparklines on the trend tiles and deltas against the previous period whenever a date filter is active
- **Distance / energy / trips over time** - calendar days, weeks or months with gaps kept
- **Efficiency per trip with a rolling median** - robust to 1-km cold-start spikes
- **Efficiency by month of year** - every year folded onto one calendar, worst month highlighted
- **Distributions** - efficiency histogram, trip-length bands
- **When you drive** - weekday × hour heatmap
- **State of charge timeline** - battery level after each trip with inferred charging events
- **Trip length vs efficiency** - log-scale scatter
- Every chart has a table twin and reflects the single filter row above it

### 💡 Insights
- **Winter penalty** - Dec–Feb vs Jun–Aug efficiency, with estimated summer/winter range
- **Usable battery estimate** - from energy used ÷ SOC consumed, matched to known Polestar packs
- **Charging habits** - inferred sessions, typical plug-in and target SOC, cycles
- **Places** - the handful of locations that account for most trips
- **Short-hop share, log coverage vs odometer, driving rhythm, personal records**

### 🗺️ Map & 📋 Trips
- Routes coloured by efficiency on quiet CARTO dark/light basemaps (follows the theme), density heatmap, day chains, most-visited places, auto-fit to the shown trips
- Sortable, paginated trip table with duration and average speed, efficiency badges, SOC bars, notes and tags (stored in your browser)
- Charging cost calculator with per-country electricity rates
- CSV export of the filtered trips

### 🎨 Design
- Polestar-inspired visual language: monochrome surfaces, one warm accent, sharp corners, light display type (Inter, bundled - no font CDN)
- Dark and light themes; charts and map re-theme with the UI
- Motion that respects `prefers-reduced-motion`; responsive down to phone widths
- Categorical chart palette validated for colour-vision deficiency

### 🔒 Privacy First
- **100% Client-Side** - All data processing happens in your browser
- **No Backend** - Your data never leaves your device
- **Sample dataset** - a synthetic year of driving is built in, so you can explore without uploading anything

## 🚀 Quick Start

### Try It Online

Visit the live demo: **[https://polestar-oss.github.io/polestar-journey-log-explorer/](https://polestar-oss.github.io/polestar-journey-log-explorer/)**

1. Download your journey log from your Polestar app
2. Visit the website and upload your CSV/XLSX file
3. Explore your data with interactive charts and maps

### Local Development

```bash
# Clone the repository
git clone https://github.com/polestar-oss/polestar-journey-log-explorer.git
cd polestar-journey-log-explorer/app

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## 📖 Documentation

Detailed documentation is available in the [`docs/`](./docs/) directory:

- **[User Guide](./docs/USER_GUIDE.md)** - Complete feature walkthrough
- **[Quick Start](./docs/QUICKSTART.md)** - Get up and running quickly
- **[Development Guide](./docs/DEVELOPMENT.md)** - Technical setup and architecture
- **[Contributing](./docs/CONTRIBUTING.md)** - How to contribute to the project
- **[Architecture](./docs/ARCHITECTURE.md)** - System design and technical details

## 🎯 Use Cases

- **Track Your Carbon Footprint** - Quantify your environmental impact
- **Optimize Charging Costs** - Understand and reduce electricity expenses
- **Analyze Driving Patterns** - Improve efficiency and range
- **Plan Road Trips** - Review past routes and consumption
- **Monitor Battery Health** - Track SOC patterns over time
- **Export Reports** - Download filtered data for external analysis

## 🛠️ Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Mantine UI** - Component library
- **OpenLayers** - Interactive maps (CARTO / OpenStreetMap tiles)
- **Recharts** - Data visualization
- **PapaParse / ExcelJS** - CSV and XLSX parsing (ExcelJS is loaded on demand)
- **Inter Variable** - Bundled typeface

## 📦 Data Format

The application supports CSV and XLSX files with these columns:
- Start/End Date & Time
- Start/End Address
- Distance (km)
- Consumption (kWh)
- Efficiency (kWh/100km)
- SOC (State of Charge)
- Odometer readings

See the [User Guide](./docs/USER_GUIDE.md) for detailed data format specifications.

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](./docs/CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License

This project is licensed under the GNU Affero General Public License v3.0 - see the [LICENSE](./LICENSE) file for details.

Copyright (c) 2025 Kinn Coelho Juliao <kinncj@gmail.com>

## 🙏 Acknowledgments

- Polestar for creating amazing electric vehicles
- The open-source community for the excellent libraries used in this project
- All contributors who help improve this tool

## ⚠️ Disclaimer

**This is a community-driven project and is not affiliated with, endorsed by, or in any way officially connected with Polestar, the Polestar brand, Geely, or any of their subsidiaries or affiliates.**

This tool is created by the community for analyzing journey log data exported from Polestar vehicles. All trademarks, logos, and brand names are the property of their respective owners.

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/polestar-oss/polestar-journey-log-explorer/issues)
- **Discussions**: [GitHub Discussions](https://github.com/polestar-oss/polestar-journey-log-explorer/discussions)

---

Made with ⚡ for Polestar drivers
