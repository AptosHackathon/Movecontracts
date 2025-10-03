require('dotenv').config();
const { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } = require('@aptos-labs/ts-sdk');

const MODULE_ADDRESS = process.env.MODULE_ADDRESS;
const PUBLISHER_PRIVATE_KEY = process.env.MODULE_PUBLISHER_ACCOUNT_PRIVATE_KEY;
const LQD_PRICE_FEED_ID = "e4ff71a60c3d5d5d37c1bba559c2e92745c1501ebd81a97d150cf7cd5119aa9c";

async function getLqdPriceFromPyth() {
  const hermesUrl = `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${LQD_PRICE_FEED_ID}`;
  
  const response = await fetch(hermesUrl);
  const data = await response.json();
  
  const priceData = data.parsed[0].price;
  const price = Number(priceData.price);
  const expo = priceData.expo;
  const priceInUsd = price * Math.pow(10, expo);
  const priceInMicroUsd = Math.floor(priceInUsd * 1_000_000); // Convert to micro USD
  const timestamp = priceData.publish_time;
  
  return { priceInMicroUsd, timestamp };
}

async function pushToCustomOracle() {
  console.log("🔄 Syncing Pyth LQD price to custom oracle...\n");
  
  // Fetch price from Pyth
  const { priceInMicroUsd, timestamp } = await getLqdPriceFromPyth();
  console.log(`📊 Pyth LQD Price: $${(priceInMicroUsd / 1_000_000).toFixed(2)}`);
  console.log(`⏰ Timestamp: ${new Date(timestamp * 1000).toISOString()}\n`);
  
  // Initialize Aptos client
  const config = new AptosConfig({ network: Network.TESTNET });
  const aptos = new Aptos(config);
  
  // Create signer
  const privateKey = new Ed25519PrivateKey(PUBLISHER_PRIVATE_KEY);
  const account = Account.fromPrivateKey({ privateKey });
  
  console.log("📤 Pushing to custom oracle...");
  
  // Push price to oracle
  const transaction = await aptos.transaction.build.simple({
    sender: account.accountAddress,
    data: {
      function: `${MODULE_ADDRESS}::oracle::push_price`,
      typeArguments: [],
      functionArguments: [priceInMicroUsd.toString(), timestamp.toString()]
    }
  });
  
  const pendingTxn = await aptos.signAndSubmitTransaction({
    signer: account,
    transaction
  });
  
  console.log(`   Transaction: ${pendingTxn.hash}`);
  
  const result = await aptos.waitForTransaction({
    transactionHash: pendingTxn.hash
  });
  
  if (result.success) {
    console.log("✅ Price synced successfully!\n");
    console.log(`🎯 Custom oracle now has LQD price: $${(priceInMicroUsd / 1_000_000).toFixed(2)}`);
    console.log(`   You can now use ticker "LQD" but it will use custom oracle (fallback)`);
  } else {
    console.log("❌ Transaction failed:", result.vm_status);
  }
}

pushToCustomOracle().catch(console.error);

