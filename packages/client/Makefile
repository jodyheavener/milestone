include ../../make/common.mk

.DEFAULT_GOAL := help

.PHONY: build
build: ## Build client
	@[ -n "$(PNPM)" ] || (echo "$(RED)pnpm not installed$(RESET)"; exit 1)
	@pnpm run build

.PHONY: dev
dev: ## Run client dev server
	@[ -n "$(PNPM)" ] || (echo "$(RED)pnpm not installed$(RESET)"; exit 1)
	@pnpm run dev

.PHONY: lint/check
lint/check: ## Check client linting
	@[ -n "$(PNPM)" ] || (echo "$(RED)pnpm not installed$(RESET)"; exit 1)
	@pnpm run lint/check

.PHONY: lint/fix
lint/fix: ## Fix client linting issues
	@[ -n "$(PNPM)" ] || (echo "$(RED)pnpm not installed$(RESET)"; exit 1)
	@pnpm run lint/fix

.PHONY: format/check
format/check: ## Check client formatting
	@[ -n "$(PNPM)" ] || (echo "$(RED)pnpm not installed$(RESET)"; exit 1)
	@pnpm run format/check

.PHONY: format/fix
format/fix: ## Fix client formatting
	@[ -n "$(PNPM)" ] || (echo "$(RED)pnpm not installed$(RESET)"; exit 1)
	@pnpm run format/fix

.PHONY: router/routes
router/routes: ## Show React Router routes
	@[ -n "$(PNPM)" ] || (echo "$(RED)pnpm not installed$(RESET)"; exit 1)
	@pnpm run router/routes

.PHONY: router/types
router/types: ## Generate React Router types
	@[ -n "$(PNPM)" ] || (echo "$(RED)pnpm not installed$(RESET)"; exit 1)
	@pnpm run router/types

.PHONY: clean/build
clean/build: ## Clean build artifacts
	@pnpm run clean/build

.PHONY: clean/deps
clean/deps: ## Clean dependencies
	@pnpm run clean/deps

.PHONY: outdated
outdated: ## Check for outdated dependencies
	@[ -n "$(PNPM)" ] || (echo "$(RED)pnpm not installed$(RESET)"; exit 1)
	@pnpm outdated

.PHONY: help
help: ## Show help for client package
	@printf "\n${BOLD}Client Package Commands${RESET}\n"
	@grep -Eh '^[a-zA-Z0-9_/-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort \
	| awk 'BEGIN {FS = ":.*?## "}; {printf "  ${CYAN}%-20s ${GREEN}%s${RESET}\n", $$1, $$2}'
