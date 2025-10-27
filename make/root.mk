# -------------------------------------------------------------
# Root commands
# -------------------------------------------------------------

.PHONY: install i
install i: ## Install all dependencies
	$(call START_TASK,CYAN,📦,Installing dependencies)
	@pnpm install
	$(call END_TASK,installing dependencies)

.PHONY: build
build: ## Build all packages
	$(call START_TASK,CYAN,📦,Building all packages)
	@pnpm -r run build
	$(call END_TASK,building packages)

.PHONY: dev
dev: ## Run dev servers for all packages
	$(call START_TASK,CYAN,🚀,Starting all package dev servers)
	@npx concurrently -c "auto" "pnpm --filter=@m/client run dev" "pnpm --filter=@m/server run dev" "pnpm --filter=@m/shared run dev"

.PHONY: lint/check
lint/check: ## Check linting for all packages
	$(call START_TASK,CYAN,🔍,Checking linting for all packages)
	@pnpm -r run lint/check
	$(call END_TASK,checking linting for packages)

.PHONY: lint/fix
lint/fix: ## Fix linting issues for all packages
	$(call START_TASK,CYAN,🔧,Fixing linting issues for all packages)
	@pnpm -r run lint/fix
	$(call END_TASK,fixing linting issues for packages)

.PHONY: lint/types
lint/types: ## Type-check all packages
	$(call START_TASK,CYAN,🔍,Type-checking all packages)
	@pnpm -r run lint/types
	$(call END_TASK,type-checking packages)

.PHONY: format/check
format/check: ## Check formatting for all packages
	$(call START_TASK,CYAN,📝,Checking formatting for all packages)
	@pnpm -r run format/check
	$(call END_TASK,checking formatting for packages)

.PHONY: format/fix
format/fix: ## Fix formatting for all packages
	$(call START_TASK,CYAN,📝,Fixing formatting for all packages)
	@pnpm -r run format/fix
	$(call END_TASK,fixing formatting for packages)

.PHONY: clean/build
clean/build: ## Clean all build artifacts
	$(call START_TASK,CYAN,🧹,Cleaning all build artifacts)
	@pnpm -r run clean/build
	$(call END_TASK,cleaning build artifacts)

.PHONY: clean/deps
clean/deps: ## Clean all dependencies
	$(call START_TASK,CYAN,🧹,Cleaning all dependencies)
	@pnpm -r run clean/deps
	$(call END_TASK,cleaning dependencies)

.PHONY: outdated
outdated: ## Check for outdated dependencies in all packages
	$(call START_TASK,CYAN,📊,Checking for outdated dependencies)
	@pnpm -r outdated
	$(call END_TASK,checking outdated dependencies)

# -------------------------------------------------------------
# Help
# -------------------------------------------------------------

.PHONY: help
help: ## Show comprehensive help menu
	@printf "\n${BOLD}${CYAN}Milestone Project Help${RESET}\n"
	@printf "${GREEN}Available commands across all packages:${RESET}\n\n"
	
	@# Show root commands
	@printf "${BOLD}Root Commands:${RESET}\n"
	@grep -Eh '^[a-zA-Z0-9_/.-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort \
	| awk 'BEGIN {FS = ":.*?## "}; {printf "  ${CYAN}%-35s ${GREEN}%s${RESET}\n", $$1, $$2}'
	
	@# Show package commands
	@printf "\n${BOLD}Package Commands:${RESET}\n"
	@for pkg in client server shared; do \
		if [ -f "$(PACKAGES_DIR)/$$pkg/Makefile" ]; then \
			printf "\n${BOLD}Package: $$pkg${RESET}\n"; \
			printf "  Use: ${CYAN}make $$pkg/<command>${RESET}\n"; \
			grep -Eh '^[a-zA-Z0-9_/-]+:.*?## .*$$' "$(PACKAGES_DIR)/$$pkg/Makefile" | sort \
			| awk 'BEGIN {FS = ":.*?## "}; {printf "    ${CYAN}%-23s ${GREEN}%s${RESET}\n", $$1, $$2}'; \
		fi; \
	done
