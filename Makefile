# Change this if your packages live somewhere else
PACKAGES_DIR ?= packages

.DEFAULT_GOAL := help

# Include common definitions
include make/common.mk

# Root commands
include make/root.mk

# -------------------------------------------------------------
# Package-specific commands
# -------------------------------------------------------------

# Pattern rule for package/command format
.PHONY: client/% server/% shared/%
client/%:
	@$(MAKE) -C "$(PACKAGES_DIR)/client" "$*"

server/%:
	@$(MAKE) -C "$(PACKAGES_DIR)/server" "$*"

shared/%:
	@$(MAKE) -C "$(PACKAGES_DIR)/shared" "$*"
