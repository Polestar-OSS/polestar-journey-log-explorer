# System Architecture - Polestar Journey Log Explorer

This diagram illustrates the high-level architecture of the application.

```mermaid
graph TB
    subgraph Browser["🌐 Browser Environment"]
        subgraph UI["React Application"]
            App[App Component<br/>State Management]
            
            subgraph Upload["📁 Upload Layer"]
                FileUpload[FileUploader Component<br/>Drag & Drop Interface]
            end
            
            subgraph Processing["⚙️ Data Processing"]
                Parser[Data Parser<br/>CSV/XLSX Processing]
                Stats[Statistics Calculator<br/>Metrics & Analytics]
            end
            
            subgraph Visualization["📊 Visualization Layer"]
                Dashboard[Dashboard Component<br/>Tab Navigation]
                StatsCards[Statistics Cards<br/>Key Metrics Display]
                Charts[Charts View<br/>Recharts Integration]
                Map[Map View<br/>OpenLayers Maps]
                Table[Table View<br/>Data Grid]
            end
        end
        
        subgraph Storage["💾 Storage"]
            State[React State<br/>In-Memory Data]
            LocalFile[User's Local Files<br/>CSV/XLSX]
        end
    end
    
    subgraph External["🌍 External Services"]
        OSM[OpenStreetMap<br/>Map Tiles]
        CDN[CDN Resources<br/>Icons & Fonts]
    end
    
    LocalFile -->|User Upload| FileUpload
    FileUpload -->|File Object| Parser
    Parser -->|Parsed Data| Stats
    Parser -->|Journey Records| State
    Stats -->|Calculated Metrics| State
    State -->|Data Flow| Dashboard
    Dashboard --> StatsCards
    Dashboard --> Charts
    Dashboard --> Map
    Dashboard --> Table
    Map -.->|Fetch Tiles| OSM
    UI -.->|Load Assets| CDN
    
    style Browser fill:#e3f2fd
    style UI fill:#bbdefb
    style Upload fill:#fff3e0
    style Processing fill:#f3e5f5
    style Visualization fill:#e8f5e9
    style Storage fill:#fce4ec
    style External fill:#fff9c4
```

---

**Author**: Kinn Coelho Juliao  
**Last Updated**: November 21, 2025
