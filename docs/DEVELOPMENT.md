# Development Guide - Polestar Journey Log Explorer

**Author**: Kinn Coelho Juliao  
**Date**: November 21, 2025

## Getting Started with Development

This guide will help you set up the development environment and start contributing to the Polestar Journey Log Explorer.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.x or later
- **npm** 9.x or later
- **Git** for version control
- A modern code editor (VS Code recommended)

## Initial Setup

### 1. Clone the Repository

```bash
git clone https://github.com/polestar-oss/polestar-journey-log-explorer.git
cd polestar-journey-log-explorer
```

### 2. Install Dependencies

```bash
cd app
npm install
```

This will install all required dependencies including:
- React and React DOM
- Mantine UI components
- Vite build tool
- Data parsing libraries
- Visualization libraries

### 3. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Project Structure

```
polestar-jourly-log-explorer/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions deployment
├── app/
│   ├── src/
│   │   ├── components/         # React components
│   │   │   ├── Dashboard.jsx
│   │   │   ├── FileUploader.jsx
│   │   │   ├── StatsCards.jsx
│   │   │   ├── ChartsView.jsx
│   │   │   ├── MapView.jsx
│   │   │   └── TableView.jsx
│   │   ├── utils/              # Utility functions
│   │   │   └── dataParser.js
│   │   ├── App.jsx             # Main app component
│   │   └── main.jsx            # Application entry point
│   ├── index.html              # HTML template
│   ├── package.json            # Dependencies
│   ├── vite.config.js          # Vite configuration
│   └── postcss.config.cjs      # PostCSS configuration
├── docs/                       # Documentation
│   ├── ARCHITECTURE.md
│   ├── USER_GUIDE.md
│   └── diagrams/               # Mermaid diagrams
└── README.md
```

## Development Workflow

### Making Changes

1. **Create a new branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Edit files in the `app/src` directory
   - Changes will hot-reload automatically

3. **Test your changes**
   - Use the browser developer tools
   - Test with sample CSV/XLSX files
   - Check console for errors

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "Description of changes"
   ```

5. **Push and create pull request**
   ```bash
   git push origin feature/your-feature-name
   ```

### Building for Production

```bash
npm run build
```

This creates an optimized production build in the `app/dist` directory.

### Preview Production Build

```bash
npm run preview
```

This serves the production build locally for testing.

## Component Development Guidelines

### Creating a New Component

1. Create a new file in `app/src/components/`
2. Follow this template:

```jsx
import { Paper, Title } from '@mantine/core';

function YourComponent({ data }) {
  return (
    <Paper p="md" withBorder>
      <Title order={3}>Your Component</Title>
      {/* Your component code */}
    </Paper>
  );
}

export default YourComponent;
```

3. Import and use in parent component:

```jsx
import YourComponent from './components/YourComponent';
```

### Component Naming Conventions

- Use PascalCase for component names
- Component files should match component names
- Use descriptive names that indicate purpose

### Props and State

- Use prop destructuring for clarity
- Document complex props with JSDoc comments
- Keep state as close to where it's used as possible
- Use `useMemo` for expensive calculations
- Use `useCallback` for function props

### Styling

We use Mantine's built-in styling system:

```jsx
// Inline styles
<Paper p="md" radius="md" withBorder>

// Style props
<Box sx={{ padding: '1rem', backgroundColor: '#f0f0f0' }}>
```

## Working with Data

### Data Parser Utilities

Located in `app/src/utils/dataParser.js`:

- `parseCSV(file)` - Parses CSV files
- `parseXLSX(file)` - Parses XLSX files
- `processJourneyData(rawData)` - Transforms raw data
- `calculateStatistics(data)` - Computes statistics

### Adding New Metrics

To add a new calculated metric:

1. Update `processJourneyData` function:

```javascript
const processJourneyData = (rawData) => {
  return rawData.map((row, index) => ({
    // ... existing fields
    yourNewMetric: calculateYourMetric(row),
  }));
};
```

2. Update `calculateStatistics` if needed:

```javascript
export const calculateStatistics = (data) => {
  // ... existing calculations
  const yourNewStat = data.reduce(...);
  
  return {
    // ... existing stats
    yourNewStat,
  };
};
```

## Visualization Guidelines

### Adding Charts

We use Recharts for data visualization. Example:

```jsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

<ResponsiveContainer width="100%" height={300}>
  <LineChart data={yourData}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="date" />
    <YAxis />
    <Tooltip />
    <Legend />
    <Line type="monotone" dataKey="value" stroke="#8884d8" />
  </LineChart>
</ResponsiveContainer>
```

### Adding Map Features

We use React-Leaflet for maps:

```jsx
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

<MapContainer center={[lat, lng]} zoom={13}>
  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
  <Marker position={[lat, lng]}>
    <Popup>Your popup content</Popup>
  </Marker>
</MapContainer>
```

## Testing

### Manual Testing Checklist

- [ ] File upload works for CSV
- [ ] File upload works for XLSX
- [ ] Statistics cards display correctly
- [ ] Charts render with data
- [ ] Map shows routes
- [ ] Table is searchable and sortable
- [ ] Tab navigation works
- [ ] Upload new file resets state
- [ ] Error handling for invalid files

### Testing with Sample Data

Use the included sample file or create your own:

```csv
Start Date,End Date,Start Address,End Address,Distance in KM,Consumption in Kwh,...
"2025-11-20, 15:52","2025-11-20, 16:17","Address 1","Address 2","12","3.42",...
```

## Debugging

### Browser Developer Tools

1. **Console**: Check for JavaScript errors
2. **Network**: Verify asset loading
3. **React DevTools**: Inspect component state
4. **Performance**: Profile slow operations

### Common Issues

**Issue**: Changes not reflecting
- **Solution**: Check if dev server is running
- Clear browser cache
- Check console for errors

**Issue**: Build fails
- **Solution**: Delete `node_modules` and reinstall
- Check Node.js version
- Review error messages

**Issue**: Map not displaying
- **Solution**: Check internet connection
- Verify Leaflet CSS is loaded
- Check for coordinate data

## Performance Optimization

### Best Practices

1. **Memoization**: Use `useMemo` for expensive calculations
   ```jsx
   const processedData = useMemo(() => 
     processLargeDataset(data), 
     [data]
   );
   ```

2. **Lazy Loading**: Load heavy components on demand
   ```jsx
   const MapView = lazy(() => import('./components/MapView'));
   ```

3. **Virtualization**: For large lists, use virtual scrolling
   ```jsx
   // Future enhancement
   ```

4. **Debouncing**: For search inputs
   ```jsx
   const debouncedSearch = useDebouncedValue(search, 300);
   ```

## Adding New Features

### Feature Development Process

1. **Plan the feature**
   - Document requirements
   - Design UI/UX
   - Consider data flow

2. **Create components**
   - Start with small, reusable components
   - Test in isolation

3. **Integrate**
   - Add to Dashboard or appropriate parent
   - Connect to data flow

4. **Test thoroughly**
   - Manual testing
   - Different data scenarios
   - Edge cases

5. **Document**
   - Update USER_GUIDE.md
   - Add code comments
   - Update README if needed

### Example: Adding a New Chart

```jsx
// 1. Create the chart component
function YourNewChart({ data }) {
  const chartData = useMemo(() => {
    // Process data for chart
    return data.map(item => ({
      name: item.label,
      value: item.value
    }));
  }, [data]);
  
  return (
    <Paper p="md" withBorder>
      <Title order={4}>Your New Chart</Title>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  );
}

// 2. Add to ChartsView
import YourNewChart from './YourNewChart';

function ChartsView({ data }) {
  return (
    <Grid>
      {/* Existing charts */}
      <Grid.Col span={12}>
        <YourNewChart data={data} />
      </Grid.Col>
    </Grid>
  );
}
```

## Configuration

### Vite Configuration

Edit `app/vite.config.js`:

```javascript
export default defineConfig({
  plugins: [react()],
  base: '/polestar-journey-log-explorer/', // Update for your repo
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});
```

### Mantine Theme

Customize in `app/src/main.jsx`:

```jsx
<MantineProvider 
  defaultColorScheme="dark"
  theme={{
    colors: {
      // Your custom colors
    },
    primaryColor: 'blue',
  }}
>
```

## Deployment

### GitHub Pages Setup

1. **Enable GitHub Pages**
   - Go to repository settings
   - Enable Pages from `gh-pages` branch

2. **Configure base path**
   - Update `vite.config.js` with your repo name
   ```javascript
   base: '/your-repo-name/'
   ```

3. **Deploy**
   ```bash
   npm run deploy
   ```

### Automatic Deployment

Push to main branch - GitHub Actions handles the rest!

The workflow:
1. Checks out code
2. Installs dependencies
3. Builds production bundle
4. Deploys to GitHub Pages

## Contributing

### Pull Request Process

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to your fork
5. Open a Pull Request

### Code Review Checklist

- [ ] Code follows project conventions
- [ ] Components are properly documented
- [ ] No console errors or warnings
- [ ] Tested in multiple browsers
- [ ] Documentation updated if needed
- [ ] Commit messages are clear

## Useful Resources

### Libraries Documentation

- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [Mantine UI](https://mantine.dev/)
- [Recharts](https://recharts.org/)
- [React-Leaflet](https://react-leaflet.js.org/)
- [PapaParse](https://www.papaparse.com/)

### Tools

- [React DevTools](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)
- [VS Code](https://code.visualstudio.com/)
- [Git](https://git-scm.com/)

## FAQ for Developers

**Q: How do I add a new dependency?**
```bash
cd app
npm install package-name
```

**Q: How do I update dependencies?**
```bash
npm update
```

**Q: How do I fix Leaflet marker icons?**
This is handled in `MapView.jsx` with custom icon configuration.

**Q: How do I optimize bundle size?**
- Use dynamic imports for large components
- Check bundle with `npm run build`
- Use tree-shaking friendly imports

**Q: How do I add TypeScript?**
1. Rename `.jsx` to `.tsx`
2. Install types: `npm install -D @types/node`
3. Add `tsconfig.json`

## Getting Help

- Check existing issues on GitHub
- Review documentation in `docs/`
- Ask questions in discussions
- Contact maintainers

---

**Happy coding!**

**Kinn Coelho Juliao**  
Maintainer & Original Author
