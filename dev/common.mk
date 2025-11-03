# Common definitions for all Makefiles

# Guard: ensure pnpm is available
PNPM := $(shell command -v pnpm 2>/dev/null)

# Color definitions (can be overridden by parent)
GREEN ?= $(shell tput -Txterm setaf 2 2>/dev/null)
CYAN ?= $(shell tput -Txterm setaf 6 2>/dev/null)
RED ?= $(shell tput -Txterm setaf 1 2>/dev/null)
GREY ?= $(shell tput -Txterm setaf 7 2>/dev/null)
BOLD ?= $(shell tput -Txterm bold 2>/dev/null)
RESET ?= $(shell tput -Txterm sgr0 2>/dev/null)

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

