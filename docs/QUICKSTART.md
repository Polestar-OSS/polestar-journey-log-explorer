# Quick Start Guide

**Get started with the Polestar Journey Log Explorer in 5 minutes!**

## 🎯 For End Users

### Access the App
Visit: `https://kinncj.github.io/polestar-journey-log-explorer/`

### Upload Your Data
1. Prepare your journey log file (CSV or XLSX format)
2. Drag and drop it onto the upload area
3. Your dashboard appears automatically!

### Explore Your Data
- **Statistics**: View key metrics at the top
- **Charts Tab**: See trends and patterns
- **Map Tab**: View trips geographically
- **Table Tab**: Search and sort your data

That's it! 🎉

---

## 💻 For Developers

### Setup (2 minutes)

```bash
# Clone the repository
git clone https://github.com/polestar-oss/polestar-journey-log-explorer.git
cd polestar-journey-log-explorer

# Install dependencies
cd app
npm install

# Start development server
npm run dev
```

Open `http://localhost:5173` in your browser.

### Project Structure

```
app/
├── src/
│   ├── components/    # React components
│   ├── utils/         # Utility functions
│   ├── App.jsx        # Main app
│   └── main.jsx       # Entry point
├── package.json
└── vite.config.js
```

### Make Your First Change

1. Edit a component in `app/src/components/`
2. Save the file
3. See changes instantly in the browser (Hot Module Replacement)

### Deploy Your Changes

```bash
npm run build       # Build for production
npm run deploy      # Deploy to GitHub Pages
```

---

## 📚 Need More Help?

- **Users**: See [docs/USER_GUIDE.md](docs/USER_GUIDE.md)
- **Developers**: See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)
- **Architecture**: See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

**Happy analyzing!** ⚡🚗

*Kinn Coelho Juliao*
