# Deployment and CI

```mermaid
flowchart LR
    subgraph PR["Pull request / push to main — ci.yml"]
        I1[make install] --> L[make lint<br/>--max-warnings=0] --> T[make test<br/>88 vitest cases] --> B[make build] --> Art[upload app/dist artifact]
        I1 --> Au[make audit<br/>whole tree, non-blocking]
    end
    subgraph Release["Release published / manual — deploy.yml"]
        I2[make install] --> LT[make lint test] --> B2[make build] --> Pages[configure-pages<br/>upload-pages-artifact] --> Deploy[deploy-pages]
    end
    Dep[Dependabot<br/>npm weekly, grouped<br/>github-actions weekly] --> PR
    Deploy --> Site["https://polestar-oss.github.io/polestar-journey-log-explorer/"]
```

- Node 22 in both workflows (Vite 7 does not run on Node 18).
- Every step is a Makefile target; running `make check` locally reproduces the
  pull-request gate.
- The site is static; the only runtime dependencies are tile servers.
