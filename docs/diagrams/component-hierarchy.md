# Component Hierarchy - Polestar Journey Log Explorer

This diagram shows the React component structure and relationships.

```mermaid
graph TD
    Root[main.jsx<br/>React Root<br/>Mantine Provider] --> App[App.jsx<br/>Main App Component<br/>State: journeyData]
    
    App -->|No Data| FileUploader[FileUploader.jsx<br/>File Upload Interface<br/>Dropzone Component]
    App -->|Has Data| Dashboard[Dashboard.jsx<br/>Main Dashboard<br/>Tab Navigation]
    
    Dashboard --> StatsCards[StatsCards.jsx<br/>Statistics Display<br/>8 Metric Cards]
    Dashboard --> TabPanel{Tab Selection}
    
    TabPanel -->|Charts| ChartsView[ChartsView.jsx<br/>Data Visualizations<br/>5 Chart Types]
    TabPanel -->|Map| MapView[MapView.jsx<br/>Geographic Display<br/>Interactive Map]
    TabPanel -->|Table| TableView[TableView.jsx<br/>Data Grid<br/>Search & Sort]
    
    FileUploader -.->|Uses| ParserUtil[dataParser.js<br/>Utility Functions<br/>CSV/XLSX Parsing]
    
    ChartsView -.->|Uses| Recharts[Recharts Library<br/>Chart Components]
    MapView -.->|Uses| OpenLayers[OpenLayers<br/>Map Components]
    TableView -.->|Uses| MantineTable[Mantine Table<br/>Table Components]
    
    StatsCards -.->|Uses| Icons[Tabler Icons<br/>Icon Components]
    
    ParserUtil -->|Returns| DataModel[Journey Data Array<br/>Statistics Object]
    DataModel -->|Flows To| Dashboard
    
    style Root fill:#1976d2,color:#fff
    style App fill:#1976d2,color:#fff
    style FileUploader fill:#f57c00,color:#fff
    style Dashboard fill:#7b1fa2,color:#fff
    style StatsCards fill:#00897b
    style ChartsView fill:#00897b
    style MapView fill:#00897b
    style TableView fill:#00897b
    style ParserUtil fill:#d32f2f,color:#fff
    style DataModel fill:#fbc02d
```

---

**Author**: Kinn Coelho Juliao  
**Last Updated**: November 21, 2025
