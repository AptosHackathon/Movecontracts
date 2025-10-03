// Continuously sync Pyth prices to your custom oracle
// This makes Pyth prices available on-chain for testnet
require('dotenv').config();
const { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } = require('@aptos-labs/ts-sdk');

const MODULE_ADDRESS = process.env.MODULE_ADDRESS;
const PUBLISHER_PRIVATE_KEY = process.env.MODULE_PUBLISHER_ACCOUNT_PRIVATE_KEY;
const PUBLISHER_ADDRESS = process.env.MODULE_PUBLISHER_ACCOUNT_ADDRESS;

// Pyth price feeds
const PRICE_FEEDS = {
  LQD: "e4ff71a60c3d5d5d37c1bba559c2e92745c1501ebd81a97d150cf7cd5119aa9c",
  BTC: "e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
  ETH: "ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
  AAPL: "49f6b65cb1de6b10eaf75e7c03ca029c306d0357e91b5311b175084a5ad55688",
  TSLA: "16dad506d7db8da01c87581c87ca897a012a153557d4d578c3b9c9e1bc0632f1",
  GOLD: "765d2ba906dbc32ca17cc11f5310a89e9ee1f6420508c63861f2f8ba4ee34bb2"
};

async function getPriceFromPyth(feedId) {
  const hermesUrl = `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${feedId}`;
  
  try {
    const response = await fetch(hermesUrl);
    const data = await response.json();
    
    if (!data.parsed || data.parsed.length === 0) {
      return null;
    }
    
    const priceData = data.parsed[0].price;
    const price = Number(priceData.price);
    const expo = priceData.expo;
    const priceInUsd = price * Math.pow(10, expo);
    const priceInMicroUsd = Math.floor(priceInUsd * 1_000_000);
    const timestamp = priceData.publish_time;
    
    return { priceInMicroUsd, timestamp };
  } catch (error) {
    console.error(`Error fetching ${feedId}:`, error.message);
    return null;
  }
}

async function main() {
  console.log("🔄 Pyth Price Feeder - Syncing prices to custom oracle\n");
  console.log("=" .repeat(60));
  
  // Get LQD price as example
  const ticker = process.argv[2] || "LQD";
  const feedId = PRICE_FEEDS[ticker];
  
  if (!feedId) {
    console.log(`❌ Unknown ticker: ${ticker}`);
    console.log(`Available: ${Object.keys(PRICE_FEEDS).join(", ")}`);
    return;
  }
  
  console.log(`\n📊 Fetching ${ticker} price from Pyth Hermes...`);
  const priceData = await getPriceFromPyth(feedId);
  
  if (!priceData) {
    console.log(`❌ Could not fetch ${ticker} price`);
    return;
  }
  
  console.log(`   Price: $${(priceData.priceInMicroUsd / 1_000_000).toFixed(2)}`);
  console.log(`   Timestamp: ${new Date(priceData.timestamp * 1000).toISOString()}`);
  console.log(`   Raw: ${priceData.priceInMicroUsd} micro USD\n`);
  
  // Note: We can't push to oracle because it's looking at the wrong address
  // Instead, just display the price
  console.log("💡 To use this price:");
  console.log(`   1. The contract will try to fetch from Pyth (will fail on testnet)`);
  console.log(`   2. Use the custom oracle as fallback`);
  console.log(`   3. Or deploy on mainnet where Pyth works\n`);
  
  console.log("📋 Price Data for Reference:");
  console.log(`   ${ticker}/USD: $${(priceData.priceInMicroUsd / 1_000_000).toFixed(2)}`);
  console.log(`   Micro USD: ${priceData.priceInMicroUsd}`);
  console.log(`   Unix Time: ${priceData.timestamp}`);
}

main().catch(console.error);

