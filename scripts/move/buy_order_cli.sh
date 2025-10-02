#!/bin/bash

# Buy order script using Aptos CLI
# Usage: ./buy_order_cli.sh <ticker> <usdc_amount>

set -e

# Load environment
source .env

TICKER=${1:-"TSLA"}
USDC_AMOUNT=${2:-"1000000"}

echo "=== Creating Buy Order ==="
echo "Module Address: $MODULE_ADDRESS"
echo "Ticker: $TICKER"
echo "USDC Amount: $USDC_AMOUNT"
echo ""

# Convert ticker to hex
TICKER_HEX=$(echo -n "$TICKER" | xxd -p | tr -d '\n')

echo "1. Submitting buy order transaction..."
aptos move run \
  --function-id "${MODULE_ADDRESS}::orders::buy_asset" \
  --args "hex:${TICKER_HEX}" "u128:${USDC_AMOUNT}" \
  --private-key="${MODULE_PUBLISHER_ACCOUNT_PRIVATE_KEY}" \
  --url="https://fullnode.testnet.aptoslabs.com/v1" \
  --assume-yes

echo ""
echo "✅ Buy order created!"
echo ""
echo "💡 Check transaction events on explorer:"
echo "   https://explorer.aptoslabs.com/account/${MODULE_ADDRESS}?network=testnet"

