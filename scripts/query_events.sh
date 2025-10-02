#!/bin/bash

# Query BuyOrderCreated events using Aptos Indexer GraphQL API

cat << 'EOF' | curl -s https://api.testnet.aptoslabs.com/v1/graphql \
  -H "Content-Type: application/json" \
  -d @- | jq '.'
{
  "query": "query GetBuyOrders($event_type: String!) { events(where: {type: {_eq: $event_type}}, order_by: {transaction_version: desc}, limit: 10) { transaction_version indexed_type data sequence_number }}",
  "variables": {
    "event_type": "0x55816489757de1d92999dad0629734b877a22455a7fe05e1de36645389646ceb::orders::BuyOrderCreated"
  }
}
EOF

