.PHONY: dev build test lint format check setup start stop

# ── Development ──────────────────────────────────────────────────

setup: ## Install dependencies and start PostgreSQL
	pnpm install
	docker compose up postgres -d
	@echo "Waiting for PostgreSQL..."
	@until docker compose exec postgres pg_isready -U prosperus -q 2>/dev/null; do sleep 0.5; done
	pnpm --filter @prosperus/server db:migrate

dev: ## Start server and web dev servers
	@echo "Starting server on :4100 and web on :4200"
	pnpm dev:server & pnpm dev:web

start: ## One-command cold start: install, DB, migrate, dev servers
	@$(MAKE) setup
	@$(MAKE) dev

stop: ## Stop dev servers and PostgreSQL
	-@pkill -f "tsx watch src/index.ts" 2>/dev/null
	-@pkill -f "vite" 2>/dev/null
	docker compose down

# ── Quality ──────────────────────────────────────────────────────

build: ## Build all packages
	pnpm -r build

test: ## Run all tests
	pnpm -r test
	cd packages/sdk-python && python -m pytest

lint: ## Lint all packages
	pnpm -r lint
	cd packages/sdk-python && ruff check src/

format: ## Format all code
	pnpm -r format
	cd packages/sdk-python && ruff format src/

check: build lint test ## Build, lint, and test everything

# ── Database ─────────────────────────────────────────────────────

db-migrate: ## Run database migrations
	pnpm --filter @prosperus/server db:migrate

db-generate: ## Generate migration from schema changes
	pnpm --filter @prosperus/server db:generate

# ── Docker ───────────────────────────────────────────────────────

up: ## Start all services via Docker Compose
	docker compose up

down: ## Stop all services
	docker compose down

# ── Help ─────────────────────────────────────────────────────────

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
