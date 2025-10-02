/**
 * Simple REST API Event Fetcher (No SDK - Pure HTTP)
 * Works 100% reliably without SDK issues
 */

require("dotenv").config();
const https = require("https");

const MODULE_ADDRESS = process.env.MODULE_ADDRESS;
const API_KEY = process.env.GEOMI_API_KEY;
const USE_GEOMI = false; // Set to true when API key is configured properly

/**
 * Make HTTP request to Aptos API
 */
function fetchAPI(path) {
  return new Promise((resolve, reject) => {
    const hostname = USE_GEOMI && API_KEY ? "api.testnet.aptoslabs.com" : "fullnode.testnet.aptoslabs.com";
    
    const options = {
      hostname,
      path: `/v1${path}`,
      method: "GET",
      headers: (USE_GEOMI && API_KEY) ? { "Authorization": `Bearer ${API_KEY}` } : {}
    };
    
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Parse error: ${data}`));
        }
      });
    });
    
    req.on("error", reject);
    req.end();
  });
}

/**
 * Convert hex to ASCII string
 */
function hexToString(hex) {
  if (!hex || hex === "0x") return "";
  const str = hex.startsWith("0x") ? hex.slice(2) : hex;
  let result = "";
  for (let i = 0; i < str.length; i += 2) {
    result += String.fromCharCode(parseInt(str.substr(i, 2), 16));
  }
  return result;
}

/**
 * Fetch events from a specific transaction
 */
async function getTransactionEvents(txHash) {
  console.log(`🔍 Fetching transaction: ${txHash}\n`);
  
  const txn = await fetchAPI(`/transactions/by_hash/${txHash}`);
  
  if (!txn.events || txn.events.length === 0) {
    console.log("No events in transaction");
    return [];
  }
  
  const orderEvents = txn.events.filter(e => 
    e.type.includes("::orders::Buy") || e.type.includes("::orders::Sell")
  );
  
  console.log(`Found ${orderEvents.length} order event(s):\n`);
  
  orderEvents.forEach(event => {
    const isBuy = event.type.includes("Buy");
    const ticker = hexToString(event.data.ticker);
    
    console.log(`${isBuy ? "🟢 BUY" : "🔴 SELL"} ORDER: ${ticker}`);
    console.log(`  User:        ${event.data.user}`);
    console.log(`  USDC Amount: ${event.data.usdc_amount}`);
    console.log(`  Asset Amount: ${event.data.asset_amount}`);
    console.log(`  Price:       ${event.data.price}`);
    console.log(`  Oracle TS:   ${event.data.oracle_ts}`);
    console.log("");
  });
  
  return orderEvents;
}

/**
 * Fetch recent account transactions and filter for events
 */
async function getRecentOrders(limit = 25) {
  console.log(`📜 Fetching last ${limit} transactions from ${MODULE_ADDRESS}\n`);
  
  const transactions = await fetchAPI(`/accounts/${MODULE_ADDRESS}/transactions?limit=${limit}`);
  
  const orders = [];
  
  for (const txn of transactions) {
    if (!txn.events) continue;
    
    for (const event of txn.events) {
      if (event.type.includes("::orders::BuyOrderCreated") || 
          event.type.includes("::orders::SellOrderCreated")) {
        
        const ticker = hexToString(event.data.ticker);
        const isBuy = event.type.includes("Buy");
        
        orders.push({
          type: isBuy ? "BUY" : "SELL",
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
  
  console.log(`✅ Found ${orders.length} orders:\n`);
  console.table(orders);
  
  return orders;
}

/**
 * Real-time polling listener
 */
async function startListener() {
  console.log("🎧 Starting Real-Time Event Listener");
  console.log(`📍 Module: ${MODULE_ADDRESS}`);
  console.log(`🔑 API Key: ${API_KEY ? "✓" : "✗"}`);
  console.log("");
  
  const ledger = await fetchAPI("/");
  let lastVersion = BigInt(ledger.ledger_version);
  
  console.log(`📊 Starting from version: ${lastVersion}\n`);
  
  setInterval(async () => {
    try {
      // Fetch new transactions
      const txns = await fetchAPI(`/transactions?start=${lastVersion}&limit=100`);
      
      if (!txns || txns.length === 0) return;
      
      // Process events
      for (const txn of txns) {
        if (!txn.events) continue;
        
        for (const event of txn.events) {
          if (event.type.includes("::orders::BuyOrderCreated")) {
            const ticker = hexToString(event.data.ticker);
            console.log(`🟢 NEW BUY ORDER: ${ticker}`);
            console.log(`   User: ${event.data.user}`);
            console.log(`   USDC: ${event.data.usdc_amount}`);
            console.log(`   TX:   ${txn.hash}`);
            console.log("");
            
            // YOUR BUSINESS LOGIC HERE
          }
          
          if (event.type.includes("::orders::SellOrderCreated")) {
            const ticker = hexToString(event.data.ticker);
            console.log(`🔴 NEW SELL ORDER: ${ticker}`);
            console.log(`   User: ${event.data.user}`);
            console.log(`   USDC: ${event.data.usdc_amount}`);
            console.log(`   TX:   ${txn.hash}`);
            console.log("");
            
            // YOUR BUSINESS LOGIC HERE
          }
        }
      }
      
      lastVersion = BigInt(txns[txns.length - 1].version) + 1n;
      
    } catch (error) {
      console.error("❌ Error:", error.message);
    }
  }, 3000); // Poll every 3 seconds
  
  process.on('SIGINT', () => {
    console.log("\n🛑 Stopping...");
    process.exit(0);
  });
}

// CLI
if (require.main === module) {
  const command = process.argv[2];
  const arg = process.argv[3];
  
  if (command === "tx") {
    getTransactionEvents(arg).then(() => process.exit(0));
  } else if (command === "history") {
    getRecentOrders(parseInt(arg) || 25).then(() => process.exit(0));
  } else if (command === "listen") {
    startListener();
  } else {
    console.log("Usage:");
    console.log("  node fetch_events.js tx <hash>       # Get specific transaction");
    console.log("  node fetch_events.js history [n]     # Get last n orders");
    console.log("  node fetch_events.js listen          # Real-time listener");
  }
}

module.exports = { getTransactionEvents, getRecentOrders, startListener };

