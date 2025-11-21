# Polestar Journey Log Explorer

[![Deploy to GitHub Pages](https://github.com/kinncj/polestar-journey-log-explorer/workflows/Deploy/badge.svg)](https://github.com/kinncj/polestar-journey-log-explorer/actions)

An interactive dashboard for analyzing Polestar journey log data. Built with React, Vite, and Mantine UI.

## Features

- 📊 **Interactive Charts** - Visualize distance, consumption, and efficiency trends
- 🗺️ **Map View** - See your trips plotted on an interactive map with routes
- 📈 **Statistics** - Comprehensive statistics about your driving patterns
- 📁 **File Upload** - Support for CSV and XLSX files (client-side only, no backend)
- 🎨 **Modern UI** - Clean, responsive interface with dark mode support
- 🔍 **Data Table** - Search, sort, and filter your trip data

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
cd app
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Deployment to GitHub Pages

### Initial Setup

1. Ensure your repository is public or you have GitHub Pages enabled
2. Update the `base` path in `vite.config.js` to match your repository name
3. Install dependencies:

```bash
cd app
npm install
```

### Deploy

```bash
npm run deploy
```

This will build the application and push it to the `gh-pages` branch.

### GitHub Actions (Recommended)

A GitHub Actions workflow is included in `.github/workflows/deploy.yml` that automatically deploys to GitHub Pages on every push to the main branch.

## Usage

1. **Upload Your Data**: Click or drag-and-drop your journey log CSV or XLSX file
2. **View Statistics**: See comprehensive statistics about your trips
3. **Explore Charts**: Analyze trends in distance, consumption, and efficiency
4. **View Map**: See your trips plotted geographically with color-coded efficiency
5. **Browse Data**: Search and filter through your trips in the data table

## Data Format

The application expects journey log files with the following columns:

- Start Date, End Date
- Start Address, End Address
- Distance in KM, Consumption in Kwh
- Start/End Latitude, Start/End Longitude
- Start/End Odometer
- SOC Source, SOC Destination
- Trip Type, Category, Comments

## Technology Stack

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Mantine UI** - Component library
- **Recharts** - Charts and data visualization
- **Leaflet** - Interactive maps
- **PapaParse** - CSV parsing
- **XLSX** - Excel file parsing

## Project Structure

```
app/
├── src/
│   ├── components/       # React components
│   │   ├── Dashboard.jsx
│   │   ├── FileUploader.jsx
│   │   ├── StatsCards.jsx
│   │   ├── ChartsView.jsx
│   │   ├── MapView.jsx
│   │   └── TableView.jsx
│   ├── utils/           # Utility functions
│   │   └── dataParser.js
│   ├── App.jsx          # Main app component
│   └── main.jsx         # Entry point
├── index.html
├── vite.config.js
├── package.json
└── postcss.config.cjs
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Author

**Kinn Coelho Juliao**

## Acknowledgments

- Built for analyzing Polestar vehicle journey data
- Inspired by the need for better EV trip analysis tools
