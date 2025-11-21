# User Guide - Polestar Journey Log Explorer

**Author**: Kinn Coelho Juliao  
**Date**: November 21, 2025

## Introduction

Welcome to the Polestar Journey Log Explorer! This application helps you analyze and visualize your electric vehicle journey data. Whether you want to track your efficiency, understand your driving patterns, or see your trips on a map, this tool provides comprehensive insights into your EV usage.

## Getting Started

### Accessing the Application

Visit the application at: [Your GitHub Pages URL]

The application runs entirely in your browser - no account or login required!

### Preparing Your Data

The application accepts journey log files in two formats:
- **CSV** (.csv files)
- **XLSX** (.xlsx or .xls files)

Your file should contain the following information:
- Trip dates and times
- Start and end addresses
- Distance traveled
- Energy consumption
- Battery state of charge (SOC)
- GPS coordinates

### Uploading Your Data

1. **Open the application** in your web browser
2. **Drag and drop** your CSV or XLSX file onto the upload area, or **click** to browse and select your file
3. Wait for the file to be processed (usually takes just a few seconds)
4. Your dashboard will appear with all your journey data visualized!

## Dashboard Overview

Once your data is loaded, you'll see a comprehensive dashboard with several sections:

### Statistics Cards (Top Section)

Eight key metrics are displayed:

1. **Total Trips**: The number of journeys in your log
2. **Total Distance**: Cumulative distance traveled (in kilometers)
3. **Total Consumption**: Total energy used (in kWh)
4. **Average Efficiency**: Your overall efficiency (kWh per 100 km)
5. **Best Efficiency**: Your most efficient trip
6. **Worst Efficiency**: Your least efficient trip
7. **Average Trip Distance**: Mean distance per trip
8. **Odometer Range**: Your vehicle's odometer readings from start to end

### Navigation Tabs

The dashboard has three main views accessible via tabs:

## Charts View

The Charts tab provides visual analysis of your journey data through multiple chart types:

### 1. Daily Distance & Consumption
- **Type**: Line chart
- **Shows**: Distance and energy consumption over time
- **Use Case**: Identify daily usage patterns and trends
- **Time Range**: Last 30 days of data

### 2. Trip Distance Distribution
- **Type**: Pie chart
- **Shows**: Breakdown of trips by distance ranges
  - 0-5 km: Short trips
  - 5-10 km: Medium-short trips
  - 10-20 km: Medium trips
  - 20-50 km: Long trips
  - 50+ km: Very long trips
- **Use Case**: Understand your typical trip distances

### 3. Efficiency per Trip
- **Type**: Bar chart
- **Shows**: Energy efficiency for individual trips
- **Use Case**: Identify which trips are most/least efficient
- **Color Coding**: 
  - Green: High efficiency (< 15 kWh/100km)
  - Yellow: Good efficiency (15-20 kWh/100km)
  - Orange: Moderate efficiency (20-25 kWh/100km)
  - Red: Low efficiency (> 25 kWh/100km)

### 4. Battery SOC Changes
- **Type**: Line chart
- **Shows**: Battery percentage at start and end of each trip
- **Use Case**: Monitor charging patterns and battery usage
- **Time Range**: Last 20 trips

### 5. Daily Trip Count
- **Type**: Bar chart
- **Shows**: Number of trips taken each day
- **Use Case**: Understand your driving frequency

## Map View

The Map tab provides geographic visualization of your journeys:

### Features

- **Interactive Map**: Pan and zoom to explore your routes
- **Trip Routes**: Lines connecting start and end points
- **Color-Coded Routes**: Routes colored by efficiency
  - Green: Efficient trips
  - Yellow: Moderately efficient
  - Orange: Less efficient
  - Red: Inefficient trips
- **Markers**: Start and end point markers for each trip
- **Trip Information**: Click markers to see:
  - Date and time
  - Full address
  - Battery state of charge
  - Distance and consumption
  - Efficiency rating

### Using the Map

1. **View All Trips**: By default, the map shows up to 50 recent trips
2. **Select Specific Trip**: Use the dropdown menu to focus on a single trip
3. **Zoom and Pan**: Use mouse or touch gestures to navigate
4. **Click Markers**: View detailed information about trip endpoints

### Performance Note

To ensure smooth performance, the map displays a maximum of 50 trips when viewing "all trips." Use the trip selector to view any specific trip in detail.

## Table View

The Table tab provides a detailed, sortable, and searchable view of your data:

### Features

- **Search**: Find trips by address or date
- **Sort**: Click column headers to sort by any field
- **Filter**: Use the sort dropdown to organize data
- **Color-Coded Efficiency**: Visual badges show efficiency levels

### Columns

1. **Date**: Trip start date and time
2. **Start Address**: Where the trip began
3. **End Address**: Trip destination
4. **Distance**: Trip distance in kilometers
5. **Consumption**: Energy used in kWh
6. **Efficiency**: Energy per 100 km (color-coded)
7. **SOC Change**: Battery percentage start → end
8. **SOC Drop**: Percentage of battery used

### Using the Table

1. **Search**: Type in the search box to filter by address or date
2. **Sort**: Select sorting criteria from the dropdown
3. **Change Order**: Toggle between ascending and descending
4. **View Count**: See how many trips match your current filters

## Understanding Your Data

### Efficiency Ratings

Efficiency is measured in kWh per 100 km. Lower numbers are better!

- **Excellent** (< 15 kWh/100km): Ideal conditions, efficient driving
- **Good** (15-20 kWh/100km): Normal efficient driving
- **Moderate** (20-25 kWh/100km): Acceptable, may include highway or cold weather
- **Poor** (> 25 kWh/100km): Consider factors like speed, weather, terrain

### Factors Affecting Efficiency

Several factors can impact your EV's efficiency:

1. **Weather**: Cold temperatures reduce efficiency
2. **Speed**: Highway driving uses more energy
3. **Terrain**: Hills and mountains increase consumption
4. **Driving Style**: Aggressive acceleration reduces efficiency
5. **Climate Control**: Heating/AC impacts range
6. **Tire Pressure**: Proper inflation improves efficiency

### Battery State of Charge (SOC)

- **SOC Source**: Battery percentage at trip start
- **SOC Destination**: Battery percentage at trip end
- **SOC Drop**: Difference between start and end

Monitoring SOC helps you understand:
- How much range you're using per trip
- When you need to charge
- Charging patterns and frequency

## Tips and Best Practices

### Analyzing Your Data

1. **Look for Patterns**: Use the daily charts to identify usage trends
2. **Compare Trips**: Find your most efficient routes in the table view
3. **Geographic Insights**: Use the map to see which areas you drive most
4. **Monitor Changes**: Upload new logs periodically to track improvements

### Improving Efficiency

Based on your data analysis:

1. **Identify Inefficient Trips**: Look for red-coded trips in charts and table
2. **Consider Route Alternatives**: Short trips may benefit from route planning
3. **Optimize Driving Style**: Smooth acceleration and braking help
4. **Preconditioning**: Warm the car while plugged in during winter

### Data Management

1. **Regular Updates**: Upload new data monthly or quarterly
2. **Keep Original Files**: The app doesn't store data permanently
3. **Compare Periods**: Download data from different time periods to compare
4. **Note Changes**: Use the comments field in your logs for context

## Uploading New Data

To analyze a different data file:

1. Click **"Upload New File"** button at the top of the dashboard
2. Select or drag your new CSV/XLSX file
3. The dashboard will update with the new data

## Privacy and Security

### Your Data is Private

- **No Server Upload**: All processing happens in your browser
- **No Storage**: Data is not saved or transmitted anywhere
- **Complete Privacy**: Your journey data never leaves your device

### Data Safety

- Close your browser tab to remove data from memory
- Use private/incognito mode for additional privacy
- The application has no analytics or tracking

## Troubleshooting

### File Won't Upload

**Problem**: File upload fails or shows error

**Solutions**:
- Ensure file is CSV or XLSX format
- Check that file contains required columns
- Verify file isn't corrupted
- Try converting XLSX to CSV or vice versa
- Check file size (very large files may need time to process)

### No Data Showing

**Problem**: Dashboard is empty after upload

**Solutions**:
- Verify file contains valid journey data
- Check that Distance column has values > 0
- Ensure dates are in correct format
- Look for error messages in the notification

### Map Not Loading

**Problem**: Map view is blank or not displaying

**Solutions**:
- Check internet connection (map tiles require internet)
- Verify trips have valid GPS coordinates
- Try selecting a specific trip from dropdown
- Refresh the browser page

### Charts Look Strange

**Problem**: Charts show unexpected patterns

**Solutions**:
- Check data for outliers or errors in original file
- Verify date formats are consistent
- Look for trips with zero or negative values
- Filter data in table view to investigate

### Performance Issues

**Problem**: Application is slow or laggy

**Solutions**:
- Try uploading smaller data files (split by time period)
- Use a modern browser (Chrome, Firefox, Safari, Edge)
- Close other browser tabs to free memory
- Use table view for large datasets (lighter than map)

## Keyboard Shortcuts

- **Ctrl/Cmd + Click**: Open links in new tab
- **Arrow Keys**: Navigate through table rows
- **Escape**: Close popups and dropdowns
- **+/-**: Zoom map in/out

## Browser Compatibility

### Recommended Browsers

- **Chrome** 90 or later ✅
- **Firefox** 88 or later ✅
- **Safari** 14 or later ✅
- **Edge** 90 or later ✅

### Minimum Requirements

- JavaScript enabled
- Modern browser (released within last 2 years)
- Internet connection for map tiles

## Frequently Asked Questions

### Q: Where does my data go?

**A**: Nowhere! All processing happens locally in your browser. Your data never leaves your device.

### Q: Can I use this on mobile?

**A**: Yes! The interface is responsive and works on tablets and phones, though larger screens provide a better experience.

### Q: How do I export my analysis?

**A**: Currently, you can take screenshots. Future versions will include export features.

### Q: Can I compare multiple files?

**A**: Not yet, but this feature is planned for future releases.

### Q: What if my file format is different?

**A**: Ensure your file has similar columns to the expected format. You may need to rename or reformat columns in Excel before uploading.

### Q: Is there a file size limit?

**A**: No hard limit, but files with 1000+ trips may take longer to process. Performance depends on your device.

### Q: Can I customize the charts?

**A**: Current version has fixed chart types, but customization features are planned.

## Getting Help

### Support Resources

1. **GitHub Issues**: Report bugs or request features
2. **Documentation**: Check ARCHITECTURE.md for technical details
3. **Repository**: View source code and contribute

### Reporting Issues

When reporting problems, include:
- Browser and version
- Operating system
- Description of the issue
- Steps to reproduce
- Screenshots (if applicable)
- Sample data (if possible)

## What's Next?

### Upcoming Features

We're planning to add:
- Data export functionality
- Multiple file comparison
- Advanced filtering options
- Heatmaps for frequently visited locations
- Carbon footprint calculations
- Custom trip categories
- Report generation

Stay tuned for updates!

## Contributing

This is an open-source project. Contributions are welcome!

- Submit bug reports
- Suggest features
- Contribute code
- Improve documentation

Visit the GitHub repository to get involved.

## About

**Polestar Journey Log Explorer**  
Built by Kinn Coelho Juliao

A tool for Polestar owners and EV enthusiasts to better understand their electric vehicle usage and efficiency.

---

*Happy analyzing! Drive electric, drive efficient!* ⚡🚗
