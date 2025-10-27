include ../../make/common.mk

.DEFAULT_GOAL := help

.PHONY: build
build: ## Build shared package
	@[ -n "$(PNPM)" ] || (echo "$(RED)pnpm not installed$(RESET)"; exit 1)
	$(call START_TASK,CYAN,📦,Building shared)
	@pnpm run build
	$(call END_TASK,building shared)

.PHONY: dev
dev: ## Run shared dev (watch mode)
	@[ -n "$(PNPM)" ] || (echo "$(RED)pnpm not installed$(RESET)"; exit 1)
	$(call START_TASK,CYAN,🚀,Starting shared dev)
	@pnpm run dev

.PHONY: lint/check
lint/check: ## Check shared package linting
	@[ -n "$(PNPM)" ] || (echo "$(RED)pnpm not installed$(RESET)"; exit 1)
	$(call START_TASK,CYAN,🔎,Checking shared linting)
	@pnpm run lint/check
	$(call END_TASK,checking shared linting)

.PHONY: lint/fix
lint/fix: ## Fix shared package linting issues
	@[ -n "$(PNPM)" ] || (echo "$(RED)pnpm not installed$(RESET)"; exit 1)
	$(call START_TASK,CYAN,🔧,Fixing shared linting issues)
	@pnpm run lint/fix
	$(call END_TASK,fixing shared linting issues)

.PHONY: format/check
format/check: ## Check shared package formatting
	@[ -n "$(PNPM)" ] || (echo "$(RED)pnpm not installed$(RESET)"; exit 1)
	$(call START_TASK,CYAN,📝,Checking shared formatting)
	@pnpm run format/check
	$(call END_TASK,checking shared formatting)

.PHONY: format/fix
format/fix: ## Fix shared package formatting
	@[ -n "$(PNPM)" ] || (echo "$(RED)pnpm not installed$(RESET)"; exit 1)
	$(call START_TASK,CYAN,📝,Fixing shared formatting)
	@pnpm run format/fix
	$(call END_TASK,fixing shared formatting)

.PHONY: lint/types
lint/types: ## Type-check shared package
	@[ -n "$(PNPM)" ] || (echo "$(RED)pnpm not installed$(RESET)"; exit 1)
	$(call START_TASK,CYAN,🔍,Type-checking shared)
	@pnpm run lint/types
	$(call END_TASK,type-checking shared)

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
help: ## Show help for shared package
	@printf "\n${BOLD}Shared Package Commands${RESET}\n"
	@grep -Eh '^[a-zA-Z0-9_/-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort \
	| awk 'BEGIN {FS = ":.*?## "}; {printf "  ${CYAN}%-20s ${GREEN}%s${RESET}\n", $$1, $$2}'
