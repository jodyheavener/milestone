#!/bin/bash

# Script to reset/clean up Stripe data for test@example.com
# This will delete the customer and all associated subscriptions/payments

set -e  # Exit on any error

EMAIL="test@example.com"

echo "Starting Stripe cleanup for $EMAIL..."

# Check if Stripe CLI is installed
if ! command -v stripe &> /dev/null; then
    echo "Error: Stripe CLI is not installed or not in PATH"
    echo "Please install it from: https://stripe.com/docs/stripe-cli"
    exit 1
fi

# Check if user is logged in to Stripe CLI
if ! stripe config --list | grep -q "test_mode"; then
    echo "Error: Not logged in to Stripe CLI"
    echo "Please run: stripe login"
    exit 1
fi

echo "Looking up customer with email: $EMAIL"

# Get customer ID by email
echo "Searching for customer..."
CUSTOMER_RESPONSE=$(stripe customers list --email="$EMAIL" --limit=1 2>&1)
STRIPE_EXIT_CODE=$?

if [ $STRIPE_EXIT_CODE -ne 0 ]; then
    echo "Error: Stripe CLI command failed with exit code $STRIPE_EXIT_CODE"
    echo "Response: $CUSTOMER_RESPONSE"
    echo ""
    echo "Common issues:"
    echo "  - Not logged in: Run 'stripe login'"
    echo "  - Wrong environment: Make sure you're using test mode"
    echo "  - Network issues: Check your internet connection"
    exit 1
fi

if [ -z "$CUSTOMER_RESPONSE" ]; then
    echo "Error: Empty response from Stripe API"
    exit 1
fi

CUSTOMER_ID=$(echo "$CUSTOMER_RESPONSE" | jq -r '.data[0].id // empty' 2>/dev/null)

if [ -z "$CUSTOMER_ID" ] || [ "$CUSTOMER_ID" = "null" ]; then
    echo "No customer found with email: $EMAIL"
    echo "Cleanup complete (nothing to clean)"
    exit 0
fi

echo "Found customer: $CUSTOMER_ID"

# Get all subscriptions for this customer
echo "Checking for active subscriptions..."
SUBSCRIPTION_RESPONSE=$(stripe subscriptions list --customer="$CUSTOMER_ID" --status=active 2>/dev/null)

if [ $? -eq 0 ] && [ -n "$SUBSCRIPTION_RESPONSE" ]; then
    SUBSCRIPTIONS=$(echo "$SUBSCRIPTION_RESPONSE" | jq -r '.data[].id' 2>/dev/null)
    
    if [ -n "$SUBSCRIPTIONS" ]; then
        echo "Found active subscriptions, canceling them..."
        for sub_id in $SUBSCRIPTIONS; do
            if [ "$sub_id" != "null" ] && [ -n "$sub_id" ]; then
                echo "  Canceling subscription: $sub_id"
                stripe subscriptions cancel "$sub_id" --confirm 2>/dev/null || echo "    Failed to cancel subscription: $sub_id"
            fi
        done
        echo "All subscriptions processed"
    else
        echo "No active subscriptions found"
    fi
else
    echo "No active subscriptions found or error querying subscriptions"
fi

# Delete the customer (this will also clean up associated data)
echo "Deleting customer: $CUSTOMER_ID"
if stripe customers delete "$CUSTOMER_ID" --confirm 2>/dev/null; then
    echo "Customer and all associated data deleted successfully"
    echo "Stripe cleanup complete for $EMAIL"
else
    echo "Failed to delete customer: $CUSTOMER_ID"
    echo "Please check the customer ID and try again"
    exit 1
fi
