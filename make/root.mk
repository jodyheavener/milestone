# -------------------------------------------------------------
# Root commands
# -------------------------------------------------------------

.PHONY: install i
install i: ## Install all dependencies
	@pnpm install

.PHONY: build
build: ## Build all packages
	@pnpm -r run build

.PHONY: dev
dev: ## Run dev servers for all packages
	@npx concurrently -c "auto" "pnpm --filter=@m/client run dev" "pnpm --filter=@m/server run dev" "pnpm --filter=@m/shared run dev"

.PHONY: lint/check
lint/check: ## Check linting for all packages
	@pnpm -r run lint/check

.PHONY: lint/fix
lint/fix: ## Fix linting issues for all packages
	@pnpm -r run lint/fix

.PHONY: lint/types
lint/types: ## Type-check all packages
	@pnpm -r run lint/types

.PHONY: format/check
format/check: ## Check formatting for all packages
	@pnpm -r run format/check

.PHONY: format/fix
format/fix: ## Fix formatting for all packages
	@pnpm -r run format/fix

.PHONY: analysis/check
analysis/check: ## Run analysis checks for all packages
	@$(MAKE) format/check && \
	$(MAKE) lint/types && \
	$(MAKE) lint/check

.PHONY: analysis/fix
analysis/fix: ## Fix analysis issues for all packages
	@$(MAKE) format/fix && \
	$(MAKE) lint/fix

.PHONY: clean/build
clean/build: ## Clean all build artifacts
	@pnpm -r run clean/build

.PHONY: clean/deps
clean/deps: ## Clean all dependencies
	@pnpm -r run clean/deps

.PHONY: outdated
outdated: ## Check for outdated dependencies in all packages
	@pnpm -r outdated

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
