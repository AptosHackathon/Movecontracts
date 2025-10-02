/**
 * Modern Event Listening Patterns for Aptos #[event] attributes
 * 
 * Your BuyOrderCreated and SellOrderCreated events can be queried using:
 */

// ============================================
// METHOD 1: TypeScript SDK (RECOMMENDED)
// ============================================

const { Aptos, AptosConfig, Network } = require("@aptos-labs/ts-sdk");

const config = new AptosConfig({ network: Network.TESTNET });
const aptos = new Aptos(config);

// Get recent transactions and filter for your events
async function listenForBuyOrders() {
  const moduleAddress = "0x55816489757de1d92999dad0629734b877a22455a7fe05e1de36645389646ceb";
  const eventType = `${moduleAddress}::orders::BuyOrderCreated`;
  
  // Poll for new transactions
  let lastVersion = await aptos.getLedgerInfo().then(info => info.ledger_version);
  
  setInterval(async () => {
    try {
      const transactions = await aptos.getTransactions({ 
        options: { 
          start: lastVersion,
          limit: 100 
        } 
      });
      
      for (const txn of transactions) {
        if (txn.events) {
          for (const event of txn.events) {
            if (event.type === eventType) {
              console.log("🎉 New Buy Order:", {
                user: event.data.user,
                ticker: Buffer.from(event.data.ticker.slice(2), 'hex').toString(),
                usdc_amount: event.data.usdc_amount,
                asset_amount: event.data.asset_amount,
                price: event.data.price,
                oracle_ts: event.data.oracle_ts,
                tx_hash: txn.hash
              });
              
              // Process the order here
              // e.g., save to database, trigger payment flow, etc.
            }
          }
        }
      }
      
      lastVersion = transactions[transactions.length - 1]?.version || lastVersion;
    } catch (error) {
      console.error("Error fetching transactions:", error.message);
    }
  }, 5000); // Poll every 5 seconds
}

// ============================================
// METHOD 2: REST API Direct Polling
// ============================================

async function pollTransactionsForEvents() {
  const moduleAddress = "0x55816489757de1d92999dad0629734b877a22455a7fe05e1de36645389646ceb";
  
  const response = await fetch(
    `https://fullnode.testnet.aptoslabs.com/v1/transactions?limit=100`
  );
  const transactions = await response.json();
  
  const buyOrders = [];
  
  for (const txn of transactions) {
    if (txn.events) {
      for (const event of txn.events) {
        if (event.type.includes("::orders::BuyOrderCreated")) {
          buyOrders.push({
            ...event.data,
            ticker: Buffer.from(event.data.ticker.slice(2), 'hex').toString(),
            tx_hash: txn.hash,
            timestamp: txn.timestamp
          });
        }
      }
    }
  }
  
  return buyOrders;
}

// ============================================
// METHOD 3: GraphQL Query (Use with proper indexer)
// ============================================

const GRAPHQL_QUERY = `
  query GetBuyOrders($eventType: String!, $limit: Int!) {
    events(
      where: { type: { _eq: $eventType } }
      order_by: { transaction_version: desc }
      limit: $limit
    ) {
      transaction_version
      type
      data
      indexed_type
      sequence_number
    }
  }
`;

async function queryGraphQL() {
  const response = await fetch("https://api.testnet.aptoslabs.com/v1/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: GRAPHQL_QUERY,
      variables: {
        eventType: "0x55816489757de1d92999dad0629734b877a22455a7fe05e1de36645389646ceb::orders::BuyOrderCreated",
        limit: 10
      }
    })
  });
  
  const result = await response.json();
  return result.data.events;
}

// ============================================
// METHOD 4: Account-based Transaction Query
// ============================================

async function getAccountTransactions() {
  const moduleAddress = "0x55816489757de1d92999dad0629734b877a22455a7fe05e1de36645389646ceb";
  
  const response = await fetch(
    `https://fullnode.testnet.aptoslabs.com/v1/accounts/${moduleAddress}/transactions?limit=25`
  );
  const transactions = await response.json();
  
  // Filter for transactions with your events
  return transactions.filter(txn => 
    txn.events?.some(e => e.type.includes("::orders::"))
  );
}

// ============================================
// EXAMPLE: Run a simple listener
// ============================================

if (require.main === module) {
  console.log("🎧 Starting event listener...");
  console.log("Listening for BuyOrderCreated events...\n");
  
  // Use Method 2 (REST API) for simplicity
  setInterval(async () => {
    try {
      const orders = await pollTransactionsForEvents();
      if (orders.length > 0) {
        console.log(`Found ${orders.length} buy orders in last 100 transactions`);
        orders.forEach(order => {
          console.log(`  - ${order.ticker}: ${order.usdc_amount} USDC @ price ${order.price}`);
        });
      }
    } catch (error) {
      console.error("Error:", error.message);
    }
  }, 10000); // Check every 10 seconds
}

module.exports = {
  listenForBuyOrders,
  pollTransactionsForEvents,
  queryGraphQL,
  getAccountTransactions
};

