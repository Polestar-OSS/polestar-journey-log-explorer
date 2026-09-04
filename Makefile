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

audit: ## Dependency vulnerability audit (production deps, high and above)
	$(NPM) audit --omit=dev --audit-level=high

check: lint test build ## Everything CI runs on a pull request

screenshots: ## Render every view with Playwright against a running `make preview` (FILES=a.xlsx,b.csv OUT=dir)
	cd $(APP_DIR) && node ../tests/e2e/screenshots.mjs "$(FILES)" "$(or $(OUT),../screenshots)"

clean: ## Remove build output and caches
	rm -rf $(APP_DIR)/dist $(APP_DIR)/node_modules/.vite $(APP_DIR)/coverage
