# Polestar Journey Log Explorer - repository entry points
#
# CI calls these targets; contributors should too. Everything runs against
# the application under ./app so the commands are identical locally and in
# GitHub Actions.

APP_DIR := app
NPM     := npm --prefix $(APP_DIR)

.DEFAULT_GOAL := help

.PHONY: help install dev build preview lint lint-fix test test-watch coverage audit clean check screenshots

help: ## List targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies from the lockfile
	$(NPM) ci --no-audit --no-fund

dev: ## Start the Vite dev server (http://localhost:5173)
	$(NPM) run dev

build: ## Production build into app/dist
	$(NPM) run build

preview: ## Serve the production build locally (http://localhost:4173)
	$(NPM) run preview

lint: ## ESLint (warnings fail CI)
	$(NPM) run lint -- --max-warnings=0

lint-fix: ## ESLint with --fix
	$(NPM) run lint:fix

test: ## Unit tests (tests/unit) once
	$(NPM) run test

test-watch: ## Unit tests in watch mode
	$(NPM) run test:watch

coverage: ## Unit tests with coverage report
	$(NPM) run test:coverage

AUDIT_LOG := $(APP_DIR)/node_modules/.cache/audit.log

audit: ## Dependency vulnerability audit, high and above; retries registry outages, fails only on findings
	@mkdir -p $(dir $(AUDIT_LOG)); \
	for attempt in 1 2 3; do \
	  if $(NPM) audit --audit-level=high --fetch-retries=1 --fetch-retry-maxtimeout=15000 >$(AUDIT_LOG) 2>&1; then cat $(AUDIT_LOG); exit 0; fi; \
	  if grep -qE "audit endpoint returned an error|ENOAUDIT|E5[0-9]{2}|ECONNRESET|ETIMEDOUT|EAI_AGAIN|Service Unavailable" $(AUDIT_LOG); then \
	    echo "npm audit: registry unavailable (attempt $$attempt of 3)"; sleep $$((attempt * 15)); continue; \
	  fi; \
	  cat $(AUDIT_LOG); exit 1; \
	done; \
	cat $(AUDIT_LOG); \
	echo "::warning title=Dependency audit skipped::npm audit endpoint unavailable after 3 attempts; no vulnerability verdict for this run. Dependabot alerts still cover the lockfile."; \
	exit 0

check: lint test build ## Everything CI runs on a pull request

screenshots: ## Render every view with Playwright against a running `make preview` (FILES=a.xlsx,b.csv OUT=dir)
	cd $(APP_DIR) && node ../tests/e2e/screenshots.mjs "$(FILES)" "$(or $(OUT),../screenshots)"

clean: ## Remove build output and caches
	rm -rf $(APP_DIR)/dist $(APP_DIR)/node_modules/.vite $(APP_DIR)/coverage
