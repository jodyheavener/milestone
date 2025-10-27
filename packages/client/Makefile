include ../../make/common.mk

.DEFAULT_GOAL := help

.PHONY: build
build: ## Build client
	@[ -n "$(PNPM)" ] || (echo "$(RED)pnpm not installed$(RESET)"; exit 1)
	$(call START_TASK,CYAN,📦,Building client)
	@pnpm run build
	$(call END_TASK,building client)

.PHONY: dev
dev: ## Run client dev server
	@[ -n "$(PNPM)" ] || (echo "$(RED)pnpm not installed$(RESET)"; exit 1)
	$(call START_TASK,CYAN,🚀,Starting client dev server)
	@pnpm run dev

.PHONY: lint/check
lint/check: ## Check client linting
	@[ -n "$(PNPM)" ] || (echo "$(RED)pnpm not installed$(RESET)"; exit 1)
	$(call START_TASK,CYAN,🔎,Checking client linting)
	@pnpm run lint/check
	$(call END_TASK,checking client linting)

.PHONY: lint/fix
lint/fix: ## Fix client linting issues
	@[ -n "$(PNPM)" ] || (echo "$(RED)pnpm not installed$(RESET)"; exit 1)
	$(call START_TASK,CYAN,🔧,Fixing client linting issues)
	@pnpm run lint/fix
	$(call END_TASK,fixing client linting issues)

.PHONY: format/check
format/check: ## Check client formatting
	@[ -n "$(PNPM)" ] || (echo "$(RED)pnpm not installed$(RESET)"; exit 1)
	$(call START_TASK,CYAN,📝,Checking client formatting)
	@pnpm run format/check
	$(call END_TASK,checking client formatting)

.PHONY: format/fix
format/fix: ## Fix client formatting
	@[ -n "$(PNPM)" ] || (echo "$(RED)pnpm not installed$(RESET)"; exit 1)
	$(call START_TASK,CYAN,📝,Fixing client formatting)
	@pnpm run format/fix
	$(call END_TASK,fixing client formatting)

.PHONY: router/routes
router/routes: ## Show React Router routes
	@[ -n "$(PNPM)" ] || (echo "$(RED)pnpm not installed$(RESET)"; exit 1)
	$(call START_TASK,CYAN,🛣️,Showing React Router routes)
	@pnpm run router/routes
	$(call END_TASK,showing React Router routes)

.PHONY: router/types
router/types: ## Generate React Router types
	@[ -n "$(PNPM)" ] || (echo "$(RED)pnpm not installed$(RESET)"; exit 1)
	$(call START_TASK,CYAN,🔄,Generating React Router types)
	@pnpm run router/types
	$(call END_TASK,generating React Router types)

.PHONY: clean/build
clean/build: ## Clean build artifacts
	$(call START_TASK,CYAN,🧹,Cleaning build artifacts)
	@pnpm run clean/build
	$(call END_TASK,cleaning build artifacts)

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

.PHONY: help
help: ## Show help for client package
	@printf "\n${BOLD}Client Package Commands${RESET}\n"
	@grep -Eh '^[a-zA-Z0-9_/-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort \
	| awk 'BEGIN {FS = ":.*?## "}; {printf "  ${CYAN}%-20s ${GREEN}%s${RESET}\n", $$1, $$2}'
