include ../../make/common.mk

.DEFAULT_GOAL := help

.PHONY: dev
dev: ## Run server dev
	@[ -n "$(PNPM)" ] || (echo "$(RED)pnpm not installed$(RESET)"; exit 1)
	$(call START_TASK,CYAN,🚀,Starting server dev)
	@pnpm run dev

.PHONY: lint/check
lint/check: ## Check server linting
	@[ -n "$(PNPM)" ] || (echo "$(RED)pnpm not installed$(RESET)"; exit 1)
	$(call START_TASK,CYAN,🔎,Checking server linting)
	@pnpm run lint/check
	$(call END_TASK,checking server linting)

.PHONY: lint/fix
lint/fix: ## Fix server linting issues
	@[ -n "$(PNPM)" ] || (echo "$(RED)pnpm not installed$(RESET)"; exit 1)
	$(call START_TASK,CYAN,🔧,Fixing server linting issues)
	@pnpm run lint/fix
	$(call END_TASK,fixing server linting issues)

.PHONY: format/check
format/check: ## Check server formatting
	@[ -n "$(PNPM)" ] || (echo "$(RED)pnpm not installed$(RESET)"; exit 1)
	$(call START_TASK,CYAN,📝,Checking server formatting)
	@pnpm run format/check
	$(call END_TASK,checking server formatting)

.PHONY: format/fix
format/fix: ## Fix server formatting
	@[ -n "$(PNPM)" ] || (echo "$(RED)pnpm not installed$(RESET)"; exit 1)
	$(call START_TASK,CYAN,📝,Fixing server formatting)
	@pnpm run format/fix
	$(call END_TASK,fixing server formatting)

.PHONY: clean/deps
clean/deps: ## Clean dependencies
	$(call START_TASK,CYAN,🧹,Cleaning dependencies)
	@pnpm run clean/deps
	$(call END_TASK,cleaning dependencies)

.PHONY: outdated
outdated: ## Check for outdated dependencies
	@[ -n "$(PNPM)" ] || (echo "$(RED)pnpm not installed$(RESET)"; exit 1)
	$(call START_TASK,CYAN,📊,Checking for outdated dependencies)
	@pnpm outdated
	$(call END_TASK,checking outdated dependencies)

# Supabase lifecycle
.PHONY: start
start: ## Start development server
	$(call START_TASK,CYAN,🚀,Starting development server)
	@pnpm run start
	$(call END_TASK,starting development server)

.PHONY: stop
stop: ## Stop development server
	$(call START_TASK,CYAN,🛑,Stopping development server)
	@pnpm run stop
	$(call END_TASK,stopping development server)

.PHONY: info
info: ## Display server information
	$(call START_TASK,CYAN,ℹ️,Displaying server information)
	@pnpm run info
	$(call END_TASK,displaying server information)

.PHONY: reset
reset: ## Reset development server
	$(call START_TASK,CYAN,🧹,Resetting development server)
	@$(MAKE) db/reset && \
	$(MAKE) stripe/reset
	$(call END_TASK,resetting development server)

.PHONY: db/reset
db/reset: ## Reset development server database
	$(call START_TASK,CYAN,🗑️,Resetting development server database)
	@read -p "Are you sure you want to reset the local database? (Y/n): " confirm && \
	if [ "$$confirm" = "Y" ]; then \
		supabase db reset && \
		$(MAKE) db/types && \
		$(MAKE) functions/sync-catalog && \
		echo "${GREEN}✅ Finished resetting database${RESET}"; \
	else \
		echo "${CYAN}ℹ️ Database reset cancelled${RESET}"; \
	fi

.PHONY: db/new-migration
db/new-migration: ## Create a new migration (Usage: make db/new-migration name=YOUR_NAME)
	@if [ -z "$(name)" ]; then \
		echo "${RED}Error: Provide a migration name. Usage: make db/new-migration name=YOUR_NAME${RESET}"; \
		exit 1; \
	fi
	$(call START_TASK,CYAN,📝,Creating new migration file: $(name))
	@supabase migration new $(name)
	$(call END_TASK,creating migration file)

.PHONY: db/migrate
db/migrate: ## Run all pending migrations
	$(call START_TASK,CYAN,🔄,Running all pending migrations)
	@supabase migration up
	$(MAKE) db/types
	$(call END_TASK,running migrations)

.PHONY: db/types
db/types: ## Generate TypeScript types from database schema
	$(call START_TASK,CYAN,🔄,Generating database TypeScript types)
	@supabase gen types --lang typescript --local > ../shared/src/db-types.ts
	$(call END_TASK,generating database TypeScript types)

.PHONY: functions/new
functions/new: ## Create a new Supabase function (Usage: make functions/new name=YOUR_NAME)
	@if [ -z "$(name)" ]; then \
		echo "${RED}Error: Provide a function name. Usage: make functions/new name=YOUR_NAME${RESET}"; \
		exit 1; \
	fi
	$(call START_TASK,CYAN,📝,Creating new Supabase function)
	@supabase functions new $(name)
	$(call END_TASK,creating function)

.PHONY: functions/start
functions/start: ## Start Supabase functions watcher
	$(call START_TASK,CYAN,🔄,Starting Supabase functions watcher)
	@supabase functions serve --no-verify-jwt

.PHONY: functions/sync-catalog
functions/sync-catalog: ## Sync Stripe catalog (products and prices)
	$(call START_TASK,CYAN,🔄,Syncing Stripe catalog)
	@curl -X POST http://127.0.0.1:54321/functions/v1/stripe-sync-catalog \
		-H "Content-Type: application/json" \
		-d '{}' || echo "${RED}Failed to sync catalog. Make sure Supabase is running.${RESET}"
	$(call END_TASK,syncing Stripe catalog)

.PHONY: functions/file-cleanup
functions/file-cleanup: ## Run file cleanup job
	$(call START_TASK,CYAN,🧹,Running file cleanup)
	@curl -X POST http://127.0.0.1:54321/functions/v1/file-cleanup \
		-H "Content-Type: application/json" \
		-d '{}' || echo "${RED}Failed to run cleanup. Make sure Supabase is running.${RESET}"
	$(call END_TASK,running file cleanup)

.PHONY: stripe/reset
stripe/reset: ## Reset Stripe test data for test@example.com
	$(call START_TASK,CYAN,🧹,Resetting Stripe test data)
	@./scripts/reset-seed-stripe.sh
	$(call END_TASK,resetting Stripe test data)

.PHONY: help
help: ## Show help for server package
	@printf "\n${BOLD}Server Package Commands${RESET}\n"
	@grep -Eh '^[a-zA-Z0-9_/-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort \
	| awk 'BEGIN {FS = ":.*?## "}; {printf "  ${CYAN}%-25s ${GREEN}%s${RESET}\n", $$1, $$2}'
