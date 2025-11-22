# Documentation Index

![Polestar Journey Log Explorer](../assets/black_transparent.png)

**Polestar Journey Log Explorer Documentation**  
**Author**: Kinn Coelho Juliao <kinncj@gmail.com>  
**License**: MIT

Welcome to the comprehensive documentation for the Polestar Journey Log Explorer! This directory contains guides for users, developers, and contributors.

---

## 📑 Table of Contents

- [For Users](#-for-users)
- [For Developers](#-for-developers)
- [For Contributors](#-for-contributors)
- [Visual Documentation](#-visual-documentation)
- [Quick Start Guides](#-quick-start-guides)
- [Key Features](#-key-features-documented)
- [Technical Overview](#-technical-overview)
- [Support & Community](#-support--community)

---

## 👥 For Users

### [📘 User Guide](./USER_GUIDE.md)
Complete guide for end users covering:
- Uploading and analyzing journey data
- Understanding dashboard features and statistics
- Using interactive charts and maps
- Filtering and exporting trip data
- Cost calculator and carbon savings
- Trip annotations with notes and tags
- Tips for improving EV efficiency
- Troubleshooting common issues

### [⚡ Quick Start Guide](./QUICKSTART.md)
Get started in minutes:
- Live demo access
- File upload instructions
- Basic feature overview
- Sample data walkthrough

---

## 🛠️ For Developers

### [💻 Development Guide](./DEVELOPMENT.md)
Complete developer setup and guidelines:
- Environment setup and prerequisites
- Project structure and file organization
- Component development guidelines
- State management patterns
- Testing and debugging strategies
- Build and deployment process
- Performance optimization tips

### [🏗️ Architecture Documentation](./ARCHITECTURE.md)
Deep dive into system design:
- Technology stack overview
- Component architecture and patterns
- Data flow and state management
- Client-side processing approach
- Security and privacy considerations
- Performance optimizations
- Future enhancement roadmap

### [📋 Project Summary](./PROJECT_SUMMARY.md)
High-level project overview:
- Project goals and objectives
- Feature list and capabilities
- Technical decisions and rationale
- Development milestones

---

## 🤝 For Contributors

### [🔧 Contributing Guide](./CONTRIBUTING.md)
How to contribute to the project:
- Code of conduct
- Development workflow
- Pull request process
- Coding standards and style guide
- Issue reporting guidelines
- Feature request process

---

## 📊 Visual Documentation

Interactive Mermaid diagrams visualizing system components:

### System Design
- **[System Architecture](./diagrams/system-architecture.md)** - High-level architecture overview
- **[Component Hierarchy](./diagrams/component-hierarchy.md)** - React component tree structure
- **[Data Model](./diagrams/data-model.md)** - Data structures and transformations

### Process Flows
- **[Data Flow](./diagrams/data-flow.md)** - How data flows through the application
- **[User Journey](./diagrams/user-journey.md)** - Typical user interaction patterns
- **[Deployment Process](./diagrams/deployment-process.md)** - CI/CD and deployment workflow

---

## 🚀 Quick Start Guides

### I'm a New User
1. Visit the [live demo](https://kinncj.github.io/polestar-journey-log-explorer/)
2. Read the [Quick Start Guide](./QUICKSTART.md)
3. Upload your journey log and explore!

### I'm a Developer
1. Clone the repository
2. Follow the [Development Guide](./DEVELOPMENT.md) setup instructions
3. Review the [Architecture Documentation](./ARCHITECTURE.md)
4. Check the [visual diagrams](./diagrams/) for reference

### I Want to Contribute
1. Read the [Contributing Guide](./CONTRIBUTING.md)
2. Browse [open issues](https://github.com/polestar-oss/polestar-journey-log-explorer/issues)
3. Fork, develop, and submit a pull request!

---

## 🎯 Key Features Documented

### Data Management
- **File Upload**: CSV and XLSX support with drag-and-drop
- **Client-Side Processing**: All data stays on your device
- **Data Validation**: Automatic format detection and error handling
- **Export Functionality**: Download filtered data as CSV

### Visualizations
- **Statistics Dashboard**: 11+ key metrics including carbon savings
- **Interactive Charts**: Distance, consumption, and efficiency trends
- **Map View**: Geographic trip visualization with route linking
- **Data Table**: Searchable, sortable, filterable trip list

### Analysis Tools
- **Cost Calculator**: Estimate charging costs with global electricity rates
- **Carbon Savings**: Compare emissions vs ICE vehicles
- **Efficiency Tracking**: Monitor and optimize consumption patterns
- **Trip Annotations**: Add custom notes and tags to organize trips
- **Advanced Filtering**: Filter by date, distance, efficiency, SOC, tags

### User Experience
- **Dark/Light Theme**: Toggle for comfortable viewing
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Date Range Picker**: Calendar-based date filtering
- **Trip Linking**: Connect consecutive trips on map view

---

## 🔧 Technical Overview

### Technology Stack
```
Frontend Framework:    React 18.3.1
Build Tool:           Vite 5.4.9
UI Library:           Mantine UI 7.13.2
Charts:               Recharts 2.12.7
Maps:                 Leaflet 1.9.4 + React-Leaflet 4.2.1
Data Parsing:         PapaParse 5.4.1, XLSX 0.18.5
Date Handling:        DayJS 1.11.13
Icons:                Tabler Icons 3.19.0
```

### Architecture Highlights
- **100% Client-Side**: No backend, all processing in browser
- **Privacy First**: Data never leaves your device
- **Component-Based**: Modular React architecture
- **Performance Optimized**: Memoization and lazy loading
- **Responsive**: Mobile-first design approach

### Deployment
- **Hosting**: GitHub Pages
- **CI/CD**: GitHub Actions automated deployment
- **Static Generation**: Pre-built assets for fast loading

---

## 📖 Documentation Standards

All documentation follows these principles:
- **Clarity**: Clear, concise language
- **Completeness**: Comprehensive coverage of topics
- **Currency**: Regularly updated with new features
- **Accessibility**: Easy to navigate with clear structure
- **Examples**: Real-world code samples and use cases

---

## 📞 Support & Community

### Get Help
- **Issues**: [Report bugs or request features](https://github.com/polestar-oss/polestar-journey-log-explorer/issues)
- **Discussions**: [Ask questions and share ideas](https://github.com/polestar-oss/polestar-journey-log-explorer/discussions)

### Stay Updated
- **Repository**: [github.com/polestar-oss/polestar-journey-log-explorer](https://github.com/polestar-oss/polestar-journey-log-explorer)
- **Live Demo**: [kinncj.github.io/polestar-journey-log-explorer](https://kinncj.github.io/polestar-journey-log-explorer/)

---

## ⚠️ Disclaimer

**This is a community-driven project and is not affiliated with, endorsed by, or in any way officially connected with Polestar, the Polestar brand, Geely, or any of their subsidiaries or affiliates.**

This tool is created by the community for analyzing journey log data exported from Polestar vehicles. All trademarks, logos, and brand names are the property of their respective owners.

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](../LICENSE) file for details.

**Copyright (c) 2025 Kinn Coelho Juliao <kinncj@gmail.com>**

---

Made with ⚡ for Polestar drivers by the community

1. **Clear and Concise**: Technical accuracy without unnecessary jargon
2. **Well-Organized**: Logical structure with clear navigation
3. **Visual Aids**: Diagrams to complement written explanations
4. **Up-to-Date**: Regular updates to reflect current functionality
5. **Accessible**: Written for various technical levels

## 🤝 Contributing to Documentation

Documentation improvements are always welcome! If you find:

- Typos or grammatical errors
- Unclear explanations
- Missing information
- Outdated content

Please submit a pull request or open an issue.

### Documentation Style Guide

- Use Markdown formatting
- Include code examples where relevant
- Add screenshots for UI elements (coming soon)
- Keep diagrams updated when features change
- Write in clear, active voice
- Use headings for easy navigation

## 📝 Viewing Mermaid Diagrams

The diagrams are written in Mermaid syntax and can be viewed:

1. **In GitHub**: GitHub renders Mermaid automatically
2. **In VS Code**: Install the Mermaid Preview extension
3. **Online**: Use [Mermaid Live Editor](https://mermaid.live/)
4. **In Markdown Viewers**: Most modern viewers support Mermaid

## 🔄 Documentation Updates

This documentation is maintained alongside the codebase. When making code changes:

1. Update relevant documentation
2. Add new diagrams if architecture changes
3. Update version numbers and dates
4. Keep examples current with actual implementation

## 📧 Contact

For questions or suggestions about the documentation:

- Open an issue on GitHub
- Submit a pull request with improvements
- Contact the maintainer: Kinn Coelho Juliao

## 📄 License

This documentation is part of the Polestar Journey Log Explorer project and is licensed under the MIT License.

---

**Last Updated**: November 21, 2025  
**Documentation Version**: 1.0.0  
**Application Version**: 1.0.0

---

*Built with ❤️ for the EV community*
