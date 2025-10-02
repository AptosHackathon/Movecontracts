/**
 * Production-Ready Backend Event Listener
 * Fetches BuyOrderCreated and SellOrderCreated events from Aptos blockchain
 */

require("dotenv").config();
const { Aptos, AptosConfig, Network } = require("@aptos-labs/ts-sdk");

// Configuration
const MODULE_ADDRESS = process.env.MODULE_ADDRESS;
const GEOMI_API_KEY = process.env.GEOMI_API_KEY || "aptoslabs_dAgHVB1m2rt_JEqKp2hxFUL6wpKmdyR4bBsbNzAUeT2f";

// Initialize Aptos client with API key
const config = new AptosConfig({
  network: Network.TESTNET,
  clientConfig: {
    API_KEY: GEOMI_API_KEY
  }
});
const aptos = new Aptos(config);

// Event types
const BUY_ORDER_EVENT = `${MODULE_ADDRESS}::orders::BuyOrderCreated`;
const SELL_ORDER_EVENT = `${MODULE_ADDRESS}::orders::SellOrderCreated`;

/**
 * PRODUCTION METHOD: Real-time event listener
 * This continuously polls for new transactions and processes events
 */
async function startEventListener() {
  console.log("🎧 Starting Real-Time Event Listener");
  console.log(`📍 Module Address: ${MODULE_ADDRESS}`);
  console.log(`🔑 Using Geomi API Key: ${GEOMI_API_KEY ? "✓" : "✗"}`);
  console.log("");
  
  let lastCheckedVersion = BigInt(
    await aptos.getLedgerInfo().then(info => info.ledger_version)
  );
  
  console.log(`📊 Starting from version: ${lastCheckedVersion}\n`);
  
  const pollInterval = setInterval(async () => {
    try {
      // Fetch new transactions since last check
      const transactions = await aptos.getTransactions({
        options: {
          start: lastCheckedVersion,
          limit: 100
        }
      });
      
      if (transactions.length === 0) {
        return;
      }
      
      // Process each transaction
      for (const txn of transactions) {
        if (!txn.events || txn.events.length === 0) continue;
        
        for (const event of txn.events) {
          // Handle Buy Orders
          if (event.type === BUY_ORDER_EVENT) {
            await handleBuyOrder(event, txn);
          }
          
          // Handle Sell Orders
          if (event.type === SELL_ORDER_EVENT) {
            await handleSellOrder(event, txn);
          }
        }
      }
      
      // Update checkpoint
      lastCheckedVersion = BigInt(transactions[transactions.length - 1].version) + 1n;
      
    } catch (error) {
      console.error("❌ Polling error:", error.message);
    }
  }, 3000); // Poll every 3 seconds
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log("\n🛑 Shutting down event listener...");
    clearInterval(pollInterval);
    process.exit(0);
  });
}

/**
 * Handle Buy Order Event
 */
async function handleBuyOrder(event, transaction) {
  const data = event.data;
  const ticker = hexToString(data.ticker);
  
  console.log("🟢 NEW BUY ORDER");
  console.log("─────────────────────────────────────");
  console.log(`📌 Transaction: ${transaction.hash}`);
  console.log(`👤 User:        ${data.user}`);
  console.log(`🏷️  Ticker:      ${ticker}`);
  console.log(`💵 USDC Amount: ${data.usdc_amount}`);
  console.log(`📊 Asset Amt:   ${data.asset_amount}`);
  console.log(`💰 Price:       ${data.price}`);
  console.log(`⏰ Oracle TS:   ${data.oracle_ts}`);
  console.log(`🕐 Block Time:  ${new Date(Number(transaction.timestamp) / 1000).toISOString()}`);
  console.log("");
  
  // YOUR BUSINESS LOGIC HERE:
  // -------------------------
  
  // 1. Save to database
  // await db.orders.create({
  //   type: 'BUY',
  //   user: data.user,
  //   ticker: ticker,
  //   usdc_amount: data.usdc_amount,
  //   asset_amount: data.asset_amount,
  //   price: data.price,
  //   tx_hash: transaction.hash,
  //   status: 'PENDING'
  // });
  
  // 2. Trigger payment processing
  // await processPayment(data.user, data.usdc_amount);
  
  // 3. Verify KYC/compliance
  // await verifyCompliance(data.user, ticker);
  
  // 4. Mint tokens to user (after payment confirmed)
  // await mintTokens(data.user, ticker, data.asset_amount);
  
  // 5. Send notification
  // await sendEmail(data.user, 'Buy order received', { ticker, amount: data.usdc_amount });
}

/**
 * Handle Sell Order Event
 */
async function handleSellOrder(event, transaction) {
  const data = event.data;
  const ticker = hexToString(data.ticker);
  
  console.log("🔴 NEW SELL ORDER");
  console.log("─────────────────────────────────────");
  console.log(`📌 Transaction: ${transaction.hash}`);
  console.log(`👤 User:        ${data.user}`);
  console.log(`🏷️  Ticker:      ${ticker}`);
  console.log(`💵 USDC Amount: ${data.usdc_amount}`);
  console.log(`📊 Token Amt:   ${data.asset_amount}`);
  console.log(`💰 Price:       ${data.price}`);
  console.log(`⏰ Oracle TS:   ${data.oracle_ts}`);
  console.log(`🕐 Block Time:  ${new Date(Number(transaction.timestamp) / 1000).toISOString()}`);
  console.log("");
  
  // YOUR BUSINESS LOGIC HERE:
  // -------------------------
  
  // 1. Save to database
  // await db.orders.create({ ... });
  
  // 2. Verify user has tokens
  // await verifyTokenBalance(data.user, ticker, data.asset_amount);
  
  // 3. Burn tokens from user
  // await burnTokens(data.user, ticker, data.asset_amount);
  
  // 4. Process USDC payment to user
  // await sendUSDC(data.user, data.usdc_amount);
  
  // 5. Send notification
  // await sendEmail(data.user, 'Sell order received', { ticker, amount: data.usdc_amount });
}

/**
 * Alternative: Fetch historical orders (for backfill or reporting)
 */
async function getHistoricalOrders(limit = 100) {
  console.log(`📜 Fetching last ${limit} orders...\n`);
  
  const transactions = await aptos.getAccountTransactions({
    accountAddress: MODULE_ADDRESS,
    options: { limit }
  });
  
  const orders = [];
  
  for (const txn of transactions) {
    if (!txn.events) continue;
    
    for (const event of txn.events) {
      if (event.type === BUY_ORDER_EVENT || event.type === SELL_ORDER_EVENT) {
        const ticker = hexToString(event.data.ticker);
        orders.push({
          type: event.type.includes("Buy") ? "BUY" : "SELL",
          ticker,
          user: event.data.user,
          usdc_amount: event.data.usdc_amount,
          asset_amount: event.data.asset_amount,
          price: event.data.price,
          oracle_ts: event.data.oracle_ts,
          tx_hash: txn.hash,
          timestamp: new Date(Number(txn.timestamp) / 1000).toISOString()
        });
      }
    }
  }
  
  console.log(`Found ${orders.length} orders`);
  console.table(orders);
  
  return orders;
}

/**
 * Alternative: Get specific transaction events
 */
async function getTransactionEvents(txHash) {
  console.log(`🔍 Fetching events for transaction: ${txHash}\n`);
  
  const txn = await aptos.getTransactionByHash({ transactionHash: txHash });
  
  if (!txn.events || txn.events.length === 0) {
    console.log("No events found in this transaction");
    return [];
  }
  
  const orderEvents = txn.events.filter(e => 
    e.type === BUY_ORDER_EVENT || e.type === SELL_ORDER_EVENT
  );
  
  orderEvents.forEach(event => {
    const ticker = hexToString(event.data.ticker);
    console.log(`Event: ${event.type.includes("Buy") ? "BUY" : "SELL"} ${ticker}`);
    console.log(JSON.stringify(event.data, null, 2));
  });
  
  return orderEvents;
}

/**
 * Utility: Convert hex string to ASCII
 */
function hexToString(hex) {
  if (!hex || hex === "0x") return "";
  const hexString = hex.startsWith("0x") ? hex.slice(2) : hex;
  let str = "";
  for (let i = 0; i < hexString.length; i += 2) {
    str += String.fromCharCode(parseInt(hexString.substr(i, 2), 16));
  }
  return str;
}

// CLI Interface
if (require.main === module) {
  const command = process.argv[2] || "listen";
  
  switch (command) {
    case "listen":
      startEventListener();
      break;
      
    case "history":
      const limit = parseInt(process.argv[3]) || 100;
      getHistoricalOrders(limit).then(() => process.exit(0));
      break;
      
    case "tx":
      const txHash = process.argv[3];
      if (!txHash) {
        console.error("Usage: node event_listener.js tx <transaction_hash>");
        process.exit(1);
      }
      getTransactionEvents(txHash).then(() => process.exit(0));
      break;
      
    default:
      console.log("Usage:");
      console.log("  node event_listener.js listen          # Start real-time listener");
      console.log("  node event_listener.js history [n]     # Get last n orders");
      console.log("  node event_listener.js tx <hash>       # Get specific transaction");
      process.exit(0);
  }
}

module.exports = {
  startEventListener,
  getHistoricalOrders,
  getTransactionEvents
};

