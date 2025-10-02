require("dotenv").config();
const { Aptos, AptosConfig, Network } = require("@aptos-labs/ts-sdk");

const config = new AptosConfig({ network: Network.TESTNET });
const aptos = new Aptos(config);

const MODULE_ADDRESS = process.env.MODULE_ADDRESS;
const BUY_ORDER_EVENT_TYPE = `${MODULE_ADDRESS}::orders::BuyOrderCreated`;
const SELL_ORDER_EVENT_TYPE = `${MODULE_ADDRESS}::orders::SellOrderCreated`;

/**
 * Method 1: Poll for new transactions continuously
 */
async function pollForNewOrders() {
  console.log("🎧 Polling for new buy/sell orders...\n");
  
  let lastCheckedVersion = BigInt(await aptos.getLedgerInfo().then(i => i.ledger_version));
  
  setInterval(async () => {
    try {
      // Fetch transactions since last check
      const transactions = await aptos.getTransactions({
        options: {
          start: lastCheckedVersion,
          limit: 100
        }
      });
      
      if (transactions.length === 0) return;
      
      // Process each transaction
      for (const txn of transactions) {
        if (!txn.events) continue;
        
        for (const event of txn.events) {
          // Check for BuyOrderCreated
          if (event.type === BUY_ORDER_EVENT_TYPE) {
            const ticker = Buffer.from(event.data.ticker.slice(2), 'hex').toString();
            console.log("🟢 NEW BUY ORDER:");
            console.log(`   Ticker: ${ticker}`);
            console.log(`   User: ${event.data.user}`);
            console.log(`   USDC Amount: ${event.data.usdc_amount}`);
            console.log(`   Asset Amount: ${event.data.asset_amount}`);
            console.log(`   Price: ${event.data.price}`);
            console.log(`   TX: ${txn.hash}`);
            console.log("");
            
            // YOUR BUSINESS LOGIC HERE:
            // - Save to database
            // - Trigger payment processing
            // - Send notification
            // - Mint tokens to user
          }
          
          // Check for SellOrderCreated
          if (event.type === SELL_ORDER_EVENT_TYPE) {
            const ticker = Buffer.from(event.data.ticker.slice(2), 'hex').toString();
            console.log("🔴 NEW SELL ORDER:");
            console.log(`   Ticker: ${ticker}`);
            console.log(`   User: ${event.data.user}`);
            console.log(`   USDC Amount: ${event.data.usdc_amount}`);
            console.log(`   Asset Amount: ${event.data.asset_amount}`);
            console.log(`   Price: ${event.data.price}`);
            console.log(`   TX: ${txn.hash}`);
            console.log("");
            
            // YOUR BUSINESS LOGIC HERE:
            // - Burn tokens from user
            // - Process USDC payment
            // - Send notification
          }
        }
      }
      
      // Update last checked version
      lastCheckedVersion = BigInt(transactions[transactions.length - 1].version) + 1n;
      
    } catch (error) {
      console.error("❌ Error polling transactions:", error.message);
    }
  }, 5000); // Poll every 5 seconds
}

/**
 * Method 2: Get historical orders
 */
async function getHistoricalOrders(limit = 50) {
  console.log(`📜 Fetching last ${limit} transactions from module...\n`);
  
  try {
    const transactions = await aptos.getAccountTransactions({
      accountAddress: MODULE_ADDRESS,
      options: { limit }
    });
    
    const orders = [];
    
    for (const txn of transactions) {
      if (!txn.events) continue;
      
      for (const event of txn.events) {
        if (event.type === BUY_ORDER_EVENT_TYPE || event.type === SELL_ORDER_EVENT_TYPE) {
          const ticker = Buffer.from(event.data.ticker.slice(2), 'hex').toString();
          orders.push({
            type: event.type.includes("Buy") ? "BUY" : "SELL",
            ticker,
            user: event.data.user,
            usdc_amount: event.data.usdc_amount,
            asset_amount: event.data.asset_amount,
            price: event.data.price,
            oracle_ts: event.data.oracle_ts,
            tx_hash: txn.hash,
            timestamp: txn.timestamp
          });
        }
      }
    }
    
    console.log(`Found ${orders.length} orders:`);
    console.table(orders);
    
    return orders;
    
  } catch (error) {
    console.error("❌ Error fetching historical orders:", error.message);
    return [];
  }
}

/**
 * Method 3: Get specific transaction events
 */
async function getTransactionEvents(txHash) {
  try {
    const txn = await aptos.getTransactionByHash({ transactionHash: txHash });
    
    if (!txn.events) {
      console.log("No events in this transaction");
      return [];
    }
    
    const orderEvents = txn.events.filter(e => 
      e.type.includes("::orders::BuyOrderCreated") || 
      e.type.includes("::orders::SellOrderCreated")
    );
    
    console.log(`Found ${orderEvents.length} order events in transaction ${txHash}`);
    orderEvents.forEach(event => {
      console.log(JSON.stringify(event, null, 2));
    });
    
    return orderEvents;
    
  } catch (error) {
    console.error("❌ Error fetching transaction:", error.message);
    return [];
  }
}

// Run examples
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0] || "poll";
  
  if (command === "poll") {
    console.log("Starting real-time event listener...");
    pollForNewOrders();
  } else if (command === "history") {
    const limit = parseInt(args[1]) || 50;
    getHistoricalOrders(limit).then(() => process.exit(0));
  } else if (command === "tx") {
    const txHash = args[1];
    if (!txHash) {
      console.error("Usage: node poll_events_example.js tx <transaction_hash>");
      process.exit(1);
    }
    getTransactionEvents(txHash).then(() => process.exit(0));
  } else {
    console.log("Usage:");
    console.log("  node poll_events_example.js poll           # Start real-time listener");
    console.log("  node poll_events_example.js history [n]    # Get last n orders");
    console.log("  node poll_events_example.js tx <hash>      # Get events from specific tx");
  }
}

module.exports = {
  pollForNewOrders,
  getHistoricalOrders,
  getTransactionEvents
};

