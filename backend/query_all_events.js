/**
 * Query ALL Buy/Sell Order Events Without Transaction Hashes
 * Scans the blockchain for all events from your contract
 */

require("dotenv").config();
const https = require("https");

const MODULE_ADDRESS = process.env.MODULE_ADDRESS;

/**
 * Make HTTP request to Aptos API
 */
function fetchAPI(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "fullnode.testnet.aptoslabs.com",
      path: `/v1${path}`,
      method: "GET",
      headers: {}
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
 * Scan recent transactions for ALL order events
 * No transaction hash needed!
 */
async function scanForAllEvents(numTransactions = 1000) {
  console.log(`🔍 Scanning last ${numTransactions} transactions for order events...\n`);
  
  const allOrders = [];
  let scanned = 0;
  let foundEvents = 0;
  
  // Get current ledger version
  const ledger = await fetchAPI("/");
  let currentVersion = BigInt(ledger.ledger_version);
  
  // Scan backwards from current version
  const batchSize = 100;
  const batches = Math.ceil(numTransactions / batchSize);
  
  for (let i = 0; i < batches; i++) {
    try {
      const start = currentVersion - BigInt(batchSize);
      const txns = await fetchAPI(`/transactions?start=${start}&limit=${batchSize}`);
      
      for (const txn of txns) {
        scanned++;
        
        if (!txn.events) continue;
        
        for (const event of txn.events) {
          // Check for BuyOrderCreated
          if (event.type.includes("::orders::BuyOrderCreated")) {
            foundEvents++;
            const ticker = hexToString(event.data.ticker);
            allOrders.push({
              type: "BUY",
              ticker,
              user: event.data.user,
              usdc_amount: event.data.usdc_amount,
              asset_amount: event.data.asset_amount,
              price: event.data.price,
              oracle_ts: event.data.oracle_ts,
              tx_hash: txn.hash,
              version: txn.version,
              timestamp: new Date(Number(txn.timestamp) / 1000).toISOString()
            });
          }
          
          // Check for SellOrderCreated
          if (event.type.includes("::orders::SellOrderCreated")) {
            foundEvents++;
            const ticker = hexToString(event.data.ticker);
            allOrders.push({
              type: "SELL",
              ticker,
              user: event.data.user,
              usdc_amount: event.data.usdc_amount,
              asset_amount: event.data.asset_amount,
              price: event.data.price,
              oracle_ts: event.data.oracle_ts,
              tx_hash: txn.hash,
              version: txn.version,
              timestamp: new Date(Number(txn.timestamp) / 1000).toISOString()
            });
          }
        }
      }
      
      currentVersion = start;
      
      // Show progress
      if ((i + 1) % 5 === 0) {
        console.log(`Progress: Scanned ${scanned} transactions, found ${foundEvents} events...`);
      }
      
    } catch (error) {
      console.error(`Error scanning batch ${i}:`, error.message);
    }
  }
  
  console.log(`\n✅ Scan complete!`);
  console.log(`📊 Scanned ${scanned} transactions`);
  console.log(`🎯 Found ${foundEvents} order events\n`);
  
  if (allOrders.length > 0) {
    console.log("All Orders:");
    console.table(allOrders);
  } else {
    console.log("No orders found in the scanned range.");
    console.log("Try increasing the scan range or the events may be older.");
  }
  
  return allOrders;
}

/**
 * Get orders for a specific user (no tx hash needed)
 */
async function getOrdersForUser(userAddress, scanLimit = 1000) {
  console.log(`🔍 Finding orders for user: ${userAddress}\n`);
  
  const allOrders = await scanForAllEvents(scanLimit);
  const userOrders = allOrders.filter(order => 
    order.user.toLowerCase() === userAddress.toLowerCase()
  );
  
  console.log(`\n📦 Found ${userOrders.length} orders for this user:`);
  console.table(userOrders);
  
  return userOrders;
}

/**
 * Get orders for a specific ticker (no tx hash needed)
 */
async function getOrdersForTicker(ticker, scanLimit = 1000) {
  console.log(`🔍 Finding orders for ticker: ${ticker}\n`);
  
  const allOrders = await scanForAllEvents(scanLimit);
  const tickerOrders = allOrders.filter(order => 
    order.ticker.toUpperCase() === ticker.toUpperCase()
  );
  
  console.log(`\n📊 Found ${tickerOrders.length} orders for ${ticker}:`);
  console.table(tickerOrders);
  
  return tickerOrders;
}

/**
 * Get recent N orders (no tx hash needed)
 */
async function getRecentOrders(count = 10) {
  console.log(`🔍 Getting ${count} most recent orders...\n`);
  
  // Scan enough transactions to hopefully find the orders
  const scanSize = Math.max(count * 100, 1000);
  const allOrders = await scanForAllEvents(scanSize);
  
  // Sort by version (most recent first)
  allOrders.sort((a, b) => Number(b.version) - Number(a.version));
  
  const recentOrders = allOrders.slice(0, count);
  
  console.log(`\n📋 ${recentOrders.length} Most Recent Orders:`);
  console.table(recentOrders);
  
  return recentOrders;
}

// CLI
if (require.main === module) {
  const command = process.argv[2];
  const arg1 = process.argv[3];
  const arg2 = process.argv[4];
  
  if (command === "all") {
    const limit = parseInt(arg1) || 1000;
    scanForAllEvents(limit).then(() => process.exit(0));
    
  } else if (command === "user") {
    if (!arg1) {
      console.error("Usage: node query_all_events.js user <address> [scan_limit]");
      process.exit(1);
    }
    const scanLimit = parseInt(arg2) || 1000;
    getOrdersForUser(arg1, scanLimit).then(() => process.exit(0));
    
  } else if (command === "ticker") {
    if (!arg1) {
      console.error("Usage: node query_all_events.js ticker <SYMBOL> [scan_limit]");
      process.exit(1);
    }
    const scanLimit = parseInt(arg2) || 1000;
    getOrdersForTicker(arg1, scanLimit).then(() => process.exit(0));
    
  } else if (command === "recent") {
    const count = parseInt(arg1) || 10;
    getRecentOrders(count).then(() => process.exit(0));
    
  } else {
    console.log("Query ALL events without transaction hashes!");
    console.log("\nUsage:");
    console.log("  node query_all_events.js all [n]           # Scan last n transactions (default: 1000)");
    console.log("  node query_all_events.js recent [n]        # Get n most recent orders (default: 10)");
    console.log("  node query_all_events.js ticker <SYMBOL>   # Get all orders for a ticker");
    console.log("  node query_all_events.js user <address>    # Get all orders for a user");
    console.log("\nExamples:");
    console.log("  node query_all_events.js all 2000          # Scan last 2000 transactions");
    console.log("  node query_all_events.js recent 5          # Get 5 most recent orders");
    console.log("  node query_all_events.js ticker TSLA       # Get all TSLA orders");
    console.log("  node query_all_events.js user 0xc50c...    # Get all orders for this user");
    process.exit(0);
  }
}

module.exports = {
  scanForAllEvents,
  getOrdersForUser,
  getOrdersForTicker,
  getRecentOrders
};

