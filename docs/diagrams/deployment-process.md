# Deployment Process - Polestar Journey Log Explorer

This diagram shows the CI/CD deployment workflow to GitHub Pages.

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant Git as Git Repository
    participant GHA as GitHub Actions
    participant Build as Build Process
    participant Pages as GitHub Pages
    participant User as End User

    Dev->>Git: Push code to main branch
    Git->>GHA: Trigger workflow
    
    Note over GHA: deploy.yml workflow starts
    
    GHA->>GHA: Checkout repository
    GHA->>GHA: Setup Node.js 18
    GHA->>GHA: Install dependencies<br/>(npm ci)
    
    GHA->>Build: Run build process<br/>(npm run build)
    
    Build->>Build: Vite bundling
    Build->>Build: Minify assets
    Build->>Build: Optimize images
    Build->>Build: Generate static files
    
    Build-->>GHA: Return dist/ folder
    
    GHA->>GHA: Configure Pages
    GHA->>GHA: Upload artifact<br/>(dist/ folder)
    
    GHA->>Pages: Deploy to GitHub Pages
    
    Pages->>Pages: Process deployment
    Pages->>Pages: Update live site
    
    Pages-->>GHA: Deployment successful
    GHA-->>Git: Update status
    
    User->>Pages: Visit application URL
    Pages-->>User: Serve static files
    
    Note over User: Application runs<br/>in browser
```

## Alternative: Manual Deployment

```mermaid
flowchart LR
    Start([Developer]) --> Local[Local Development]
    Local --> Test[Test Changes<br/>npm run dev]
    Test --> Build[Build Production<br/>npm run build]
    Build --> Deploy[Deploy<br/>npm run deploy]
    Deploy --> GHPages[gh-pages Branch]
    GHPages --> Live[Live Site]
    Live --> Verify{Verify?}
    Verify -->|Issues| Local
    Verify -->|Success| Done([Complete])
    
    style Start fill:#4caf50
    style Done fill:#4caf50
    style Live fill:#2196f3
    style Verify fill:#ff9800
```

---

**Author**: Kinn Coelho Juliao  
**Last Updated**: November 21, 2025
