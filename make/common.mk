# Common definitions for all Makefiles

# Guard: ensure pnpm is available
PNPM := $(shell command -v pnpm 2>/dev/null)

# Color definitions (can be overridden by parent)
GREEN ?= $(shell tput -Txterm setaf 2 2>/dev/null)
CYAN ?= $(shell tput -Txterm setaf 6 2>/dev/null)
RED ?= $(shell tput -Txterm setaf 1 2>/dev/null)
RESET ?= $(shell tput -Txterm sgr0 2>/dev/null)
BOLD ?= $(shell tput -Txterm bold 2>/dev/null)

# Load and export env vars if the chosen file exists
# If we're inside ./packages/* use ../../.env
# Else (repo root or anywhere else) use ./.env
ENV_FILE := $(if $(wildcard ../../.env),../../.env,.env)
ifneq (,$(wildcard $(ENV_FILE)))
	# Load values into Make variables
	-include $(ENV_FILE)
	# Export the keys so child processes inherit them
	export $(shell sed -n 's/^\s*\([A-Za-z_][A-Za-z0-9_]*\)\s*=.*/\1/p' "$(ENV_FILE)")
endif

# Task messaging macros
define START_TASK
	@printf "\n${$(2)}$(3) ${BOLD}$(4)${RESET}\n"
endef

define END_TASK
	@printf "${GREEN}✅ Finished $(1)${RESET}\n"
endef

# Helper function for printing help
define PRINT_HELP
	@printf "\n${BOLD}%s${RESET}\n" "$(1)"
	@grep -Eh '^[a-zA-Z0-9_/.-]+:.*?## .*$$' $(2) | sort \
	| awk 'BEGIN {FS = ":.*?## "}; {printf "  ${CYAN}%-35s ${GREEN}%s${RESET}\n", $$1, $$2}'
endef
