# Data Model - Polestar Journey Log Explorer

This diagram shows the data structures used throughout the application.

```mermaid
erDiagram
    JOURNEY_RECORD {
        number id PK "Unique identifier"
        string startDate "Format: YYYY-MM-DD, HH:mm"
        string endDate "Format: YYYY-MM-DD, HH:mm"
        string startAddress "Full address string"
        string endAddress "Full address string"
        number distanceKm "Distance in kilometers"
        number consumptionKwh "Energy in kWh"
        string category "Trip category"
        number startLat "Start latitude"
        number startLng "Start longitude"
        number endLat "End latitude"
        number endLng "End longitude"
        number startOdometer "Odometer at start"
        number endOdometer "Odometer at end"
        string tripType "SINGLE, ROUND, etc"
        number socSource "Battery % at start"
        number socDestination "Battery % at end"
        string comments "User comments"
        number efficiency "Calculated: kWh/100km"
        number socDrop "Calculated: SOC difference"
    }
    
    STATISTICS {
        number totalTrips "Count of journeys"
        number totalDistance "Sum of distances (km)"
        number totalConsumption "Sum of energy (kWh)"
        number avgEfficiency "Mean kWh/100km"
        number bestEfficiency "Minimum kWh/100km"
        number worstEfficiency "Maximum kWh/100km"
        number avgTripDistance "Mean distance per trip"
        number odometerStart "Lowest odometer"
        number odometerEnd "Highest odometer"
    }
    
    CHART_DATA {
        string date "Date key"
        number distance "Daily distance"
        number consumption "Daily consumption"
        number trips "Daily trip count"
    }
    
    MAP_POSITION {
        array coordinates "lat, lng pair"
        string type "start or end"
        object popup "Marker popup data"
    }
    
    FILTER_PARAMS {
        string searchText "Search query"
        string sortBy "Sort field"
        string sortOrder "asc or desc"
    }
    
    JOURNEY_RECORD ||--o{ STATISTICS : "aggregates to"
    JOURNEY_RECORD ||--o{ CHART_DATA : "transforms to"
    JOURNEY_RECORD ||--o{ MAP_POSITION : "maps to"
    JOURNEY_RECORD ||--o{ FILTER_PARAMS : "filtered by"
```

## Data Transformations

```mermaid
graph LR
    subgraph Input
        CSV[CSV File]
        XLSX[XLSX File]
    end
    
    subgraph Parsing
        CSVParser[PapaParse<br/>CSV → JSON]
        XLSXParser[XLSX.js<br/>XLSX → JSON]
    end
    
    subgraph Processing
        RawJSON[Raw JSON Array]
        Validate[Validation<br/>Filter & Clean]
        Transform[Transformation<br/>Type Conversion]
        Calculate[Calculation<br/>Derived Fields]
    end
    
    subgraph Output
        Records[Journey Records<br/>Array]
        Stats[Statistics<br/>Object]
        ChartData[Chart Data<br/>Arrays]
        MapData[Map Data<br/>GeoJSON-like]
    end
    
    CSV --> CSVParser
    XLSX --> XLSXParser
    CSVParser --> RawJSON
    XLSXParser --> RawJSON
    RawJSON --> Validate
    Validate --> Transform
    Transform --> Calculate
    Calculate --> Records
    Records --> Stats
    Records --> ChartData
    Records --> MapData
    
    style Input fill:#e3f2fd
    style Parsing fill:#fff3e0
    style Processing fill:#f3e5f5
    style Output fill:#e8f5e9
```

---

**Author**: Kinn Coelho Juliao  
**Last Updated**: November 21, 2025
