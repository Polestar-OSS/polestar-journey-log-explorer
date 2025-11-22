# Polestar Journey Log Explorer

![Polestar Journey Log Explorer](./assets/white_transparent.png)

[![Deploy to GitHub Pages](https://github.com/Polestar-OSS/polestar-journey-log-explorer/actions/workflows/deploy.yml/badge.svg)](https://github.com/Polestar-OSS/polestar-journey-log-explorer/actions/workflows/deploy.yml)
[![Dependabot](https://github.com/Polestar-OSS/polestar-journey-log-explorer/actions/workflows/dependabot/dependabot-updates/badge.svg)](https://github.com/Polestar-OSS/polestar-journey-log-explorer/actions/workflows/dependabot/dependabot-updates)
[![CodeQL](https://github.com/Polestar-OSS/polestar-journey-log-explorer/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/Polestar-OSS/polestar-journey-log-explorer/actions/workflows/github-code-scanning/codeql)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

An interactive web-based dashboard for analyzing your Polestar journey log data. Upload your CSV/Excel files and explore comprehensive statistics, visualizations, and insights about your electric vehicle trips—all processed locally in your browser with complete privacy.

## ✨ Features

### 📊 Data Analysis & Visualization
- **Interactive Charts** - Distance, consumption, and efficiency trends over time
- **Statistics Dashboard** - 11+ key metrics including carbon savings and cost estimates
- **Map View** - Routes plotted on interactive maps with trip linking
- **Data Table** - Search, sort, filter, and export your trip data

### 🎨 User Experience
- **Dark/Light Theme** - Toggle between themes for comfortable viewing
- **Responsive Design** - Works seamlessly on desktop, tablet, and mobile
- **Date Range Filtering** - Filter trips by date, distance, efficiency, SOC, and more
- **Trip Annotations** - Add custom notes and tags to organize your trips

### 🔋 EV-Specific Features
- **Carbon Savings Calculator** - See your environmental impact vs ICE vehicles
- **Cost Calculator** - Estimate charging costs with global electricity rates
- **Efficiency Analysis** - Track consumption patterns and optimize driving
- **SOC Tracking** - Monitor battery state of charge across trips

### 🔒 Privacy First
- **100% Client-Side** - All data processing happens in your browser
- **No Backend** - Your data never leaves your device
- **No Tracking** - No analytics or third-party services

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
- **Leaflet** - Interactive maps
- **Recharts** - Data visualization
- **PapaParse** - CSV parsing
- **DayJS** - Date handling

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

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

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
