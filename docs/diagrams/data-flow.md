# Data Flow - Polestar Journey Log Explorer

This diagram shows how data flows through the application from upload to visualization.

```mermaid
flowchart TD
    Start([User Opens App]) --> Upload{File Uploaded?}
    
    Upload -->|No| ShowUploader[Display File Uploader]
    ShowUploader --> WaitFile[Wait for File]
    WaitFile --> Upload
    
    Upload -->|Yes| DetectType{File Type?}
    
    DetectType -->|CSV| ParseCSV[PapaParse<br/>Parse CSV]
    DetectType -->|XLSX| ParseXLSX[XLSX.js<br/>Parse Excel]
    
    ParseCSV --> RawData[Raw JSON Data]
    ParseXLSX --> RawData
    
    RawData --> Process[Data Processing]
    
    Process --> Validate[Validate Records<br/>- Filter zero distance<br/>- Check required fields]
    Validate --> Transform[Transform Data<br/>- Parse dates<br/>- Convert types<br/>- Calculate efficiency]
    Transform --> Enrich[Enrich Data<br/>- Add calculated fields<br/>- Generate IDs]
    
    Enrich --> CalcStats[Calculate Statistics<br/>- Total trips<br/>- Total distance<br/>- Efficiency metrics]
    
    CalcStats --> UpdateState[Update React State]
    
    UpdateState --> RenderDash[Render Dashboard]
    
    RenderDash --> ShowStats[Display Stats Cards]
    RenderDash --> ShowCharts[Display Charts View]
    RenderDash --> ShowMap[Display Map View]
    RenderDash --> ShowTable[Display Table View]
    
    ShowStats --> UserInteract{User Action?}
    ShowCharts --> UserInteract
    ShowMap --> UserInteract
    ShowTable --> UserInteract
    
    UserInteract -->|Switch Tab| RenderDash
    UserInteract -->|Sort/Filter| ShowTable
    UserInteract -->|Select Trip| ShowMap
    UserInteract -->|Upload New| Upload
    UserInteract -->|View Details| ShowCharts
    
    style Start fill:#4caf50
    style Upload fill:#2196f3
    style RawData fill:#ff9800
    style UpdateState fill:#9c27b0
    style RenderDash fill:#e91e63
    style UserInteract fill:#00bcd4
```

---

**Author**: Kinn Coelho Juliao  
**Last Updated**: November 21, 2025
