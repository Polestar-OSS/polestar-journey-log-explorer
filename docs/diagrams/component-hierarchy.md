# Component hierarchy

```mermaid
flowchart TB
    App --> AppHeader
    AppHeader --> LevelSwitch
    App --> Landing
    Landing --> FileDropzone
    Landing --> HelpModal
    App --> Dashboard
    App --> Footer
    App --> AddFilesModal["Modal: FileDropzone (compact)"]

    Dashboard --> SourcesBar
    Dashboard --> FilterBar
    Dashboard --> StatsCards
    StatsCards --> StatTile --> Sparkline
    StatsCards --> CostCalculatorModal
    Dashboard --> Tabs

    Tabs --> StoryView["StoryView (Simple)"]
    StoryView --> StoryCard
    Tabs --> ChartsView["ChartsView (Detailed+)"]
    ChartsView --> ChartCard
    ChartCard --> ChartTooltip
    ChartCard --> DataTableToggle
    ChartsView --> Heatmap
    Tabs --> InsightsView["InsightsView (Detailed+)"]
    Tabs --> ExploreView["ExploreView (Expert)"]
    ExploreView --> ChartCard
    Tabs --> MapView["MapView (lazy)"]
    Tabs --> TableView
    TableView --> TripNotesModal
    Tabs --> DataGuide
```

Shared primitives: `Eyebrow`, `DeltaBadge`, `ChartCard`, `ChartTooltip`,
`DataTable`, `Sparkline`. Every chart in every level is composed from the
same three chart pieces so the look cannot drift.
