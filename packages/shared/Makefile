include ../../dev/common.mk

.DEFAULT_GOAL := help

.PHONY: build
build: ## Build shared package
	@[ -n "$(PNPM)" ] || (echo "$(RED)pnpm not installed$(RESET)"; exit 1)
	@pnpm run build

.PHONY: dev
dev: ## Run shared dev (watch mode)
	@[ -n "$(PNPM)" ] || (echo "$(RED)pnpm not installed$(RESET)"; exit 1)
	@pnpm run dev

.PHONY: lint/check
lint/check: ## Check shared package linting
	@[ -n "$(PNPM)" ] || (echo "$(RED)pnpm not installed$(RESET)"; exit 1)
	@pnpm run lint/check

.PHONY: lint/fix
lint/fix: ## Fix shared package linting issues
	@[ -n "$(PNPM)" ] || (echo "$(RED)pnpm not installed$(RESET)"; exit 1)
	@pnpm run lint/fix

.PHONY: format/check
format/check: ## Check shared package formatting
	@[ -n "$(PNPM)" ] || (echo "$(RED)pnpm not installed$(RESET)"; exit 1)
	@pnpm run format/check

.PHONY: format/fix
format/fix: ## Fix shared package formatting
	@[ -n "$(PNPM)" ] || (echo "$(RED)pnpm not installed$(RESET)"; exit 1)
	@pnpm run format/fix

.PHONY: lint/types
lint/types: ## Type-check shared package
	@[ -n "$(PNPM)" ] || (echo "$(RED)pnpm not installed$(RESET)"; exit 1)
	@pnpm run lint/types

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
help: ## Show help for shared package
	@printf "\n${BOLD}Shared Package Commands${RESET}\n"
	@grep -Eh '^[a-zA-Z0-9_/-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort \
	| awk 'BEGIN {FS = ":.*?## "}; {printf "  ${CYAN}%-20s ${GREEN}%s${RESET}\n", $$1, $$2}'
