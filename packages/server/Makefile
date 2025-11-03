include ../../dev/common.mk

.DEFAULT_GOAL := help

.PHONY: dev
dev: ## Run server dev
	@[ -n "$(PNPM)" ] || (echo "$(RED)pnpm not installed$(RESET)"; exit 1)
	@pnpm run dev

.PHONY: lint/check
lint/check: ## Check server linting
	@[ -n "$(PNPM)" ] || (echo "$(RED)pnpm not installed$(RESET)"; exit 1)
	@pnpm run lint/check

.PHONY: lint/fix
lint/fix: ## Fix server linting issues
	@[ -n "$(PNPM)" ] || (echo "$(RED)pnpm not installed$(RESET)"; exit 1)
	@pnpm run lint/fix

.PHONY: lint/types
lint/types: ## Type-check server package
	@[ -n "$(PNPM)" ] || (echo "$(RED)pnpm not installed$(RESET)"; exit 1)
	@pnpm run lint/types

.PHONY: format/check
format/check: ## Check server formatting
	@[ -n "$(PNPM)" ] || (echo "$(RED)pnpm not installed$(RESET)"; exit 1)
	@pnpm run format/check

.PHONY: format/fix
format/fix: ## Fix server formatting
	@[ -n "$(PNPM)" ] || (echo "$(RED)pnpm not installed$(RESET)"; exit 1)
	@pnpm run format/fix

.PHONY: clean/deps
clean/deps: ## Clean dependencies
	@pnpm run clean/deps

.PHONY: outdated
outdated: ## Check for outdated dependencies
	@[ -n "$(PNPM)" ] || (echo "$(RED)pnpm not installed$(RESET)"; exit 1)
	@pnpm outdated

# Supabase lifecycle
.PHONY: start
start: ## Start development server
	@pnpm run start

.PHONY: stop
stop: ## Stop development server
	@pnpm run stop

.PHONY: info
info: ## Display server information
	@pnpm run info

.PHONY: reset
reset: ## Reset development server
	@$(MAKE) db/reset && \
	$(MAKE) stripe/reset

.PHONY: db/reset
db/reset: ## Reset development server database
	@read -p "Are you sure you want to reset the local database? (Y/n): " confirm && \
	if [ "$$confirm" = "Y" ]; then \
		supabase db reset && \
		$(MAKE) db/types && \
		$(MAKE) functions/sync-catalog && \
		echo "${GREEN}Database reset complete${RESET}"; \
	else \
		echo "${CYAN}Database reset cancelled${RESET}"; \
	fi

.PHONY: db/new-migration
db/new-migration: ## Create a new migration (Usage: make db/new-migration name=YOUR_NAME)
	@if [ -z "$(name)" ]; then \
		echo "${RED}Error: Provide a migration name. Usage: make db/new-migration name=YOUR_NAME${RESET}"; \
		exit 1; \
	fi
	@supabase migration new $(name)

.PHONY: db/migrate
db/migrate: ## Run all pending migrations
	@supabase migration up
	@$(MAKE) db/types

.PHONY: db/types
db/types: ## Generate TypeScript types from database schema
	@supabase gen types --lang typescript --local > ../shared/src/db-types.ts

.PHONY: functions/new
functions/new: ## Create a new Supabase function (Usage: make functions/new name=YOUR_NAME)
	@if [ -z "$(name)" ]; then \
		echo "${RED}Error: Provide a function name. Usage: make functions/new name=YOUR_NAME${RESET}"; \
		exit 1; \
	fi
	@supabase functions new $(name)

.PHONY: functions/start
functions/start: ## Start Supabase functions watcher
	@supabase functions serve --no-verify-jwt

.PHONY: functions/sync-catalog
functions/sync-catalog: ## Sync Stripe catalog (products and prices)
	@curl -X POST http://127.0.0.1:54321/functions/v1/sync-stripe-catalog \
		-H "Content-Type: application/json" \
		-d '{}' || echo "${RED}Failed to sync catalog. Make sure Supabase is running.${RESET}"

.PHONY: functions/cleanup-files
functions/cleanup-files: ## Run file cleanup job
	@curl -X POST http://127.0.0.1:54321/functions/v1/cleanup-files \
		-H "Content-Type: application/json" \
		-d '{}' || echo "${RED}Failed to run cleanup. Make sure Supabase is running.${RESET}"

.PHONY: stripe/reset
stripe/reset: ## Reset Stripe test data for test@example.com
	@./scripts/reset-seed-stripe.sh

.PHONY: help
help: ## Show help for server package
	@printf "\n${BOLD}Server Package Commands${RESET}\n"
	@grep -Eh '^[a-zA-Z0-9_/-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort \
	| awk 'BEGIN {FS = ":.*?## "}; {printf "  ${CYAN}%-25s ${GREEN}%s${RESET}\n", $$1, $$2}'
