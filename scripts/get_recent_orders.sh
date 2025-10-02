#!/bin/bash

# Get recent buy orders from the blockchain
# This queries transactions and filters for BuyOrderCreated events

source .env

echo "🔍 Fetching recent buy orders..."
echo ""

# Get recent transactions from the module account
curl -s "https://fullnode.testnet.aptoslabs.com/v1/accounts/${MODULE_ADDRESS}/transactions?limit=50" | \
jq -r '
  .[] | 
  select(.events != null) | 
  .events[] | 
  select(.type | contains("BuyOrderCreated")) | 
  {
    ticker: (.data.ticker | gsub("^0x"; "") | [scan(".{2}")] | map(tonumber) | implode),
    user: .data.user,
    usdc_amount: .data.usdc_amount,
    asset_amount: .data.asset_amount,
    price: .data.price,
    oracle_ts: .data.oracle_ts
  }
' | jq -s '.'

echo ""
echo "💡 These events are queryable via:"
echo "   1. REST API: /v1/transactions (poll for new txns)"
echo "   2. GraphQL: Indexer API (when it's not timing out)"
echo "   3. SDK: Use transaction stream listeners"

