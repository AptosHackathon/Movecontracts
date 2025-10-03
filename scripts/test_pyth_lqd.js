require('dotenv').config();
const { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } = require('@aptos-labs/ts-sdk');

const MODULE_ADDRESS = process.env.MODULE_ADDRESS;
const PUBLISHER_PRIVATE_KEY = process.env.MODULE_PUBLISHER_ACCOUNT_PRIVATE_KEY;

// LQD price feed ID (correct one from Pyth)
const LQD_PRICE_FEED_ID = "e4ff71a60c3d5d5d37c1bba559c2e92745c1501ebd81a97d150cf7cd5119aa9c";

async function fetchPriceUpdate() {
  console.log("📡 Fetching LQD price update from Pyth Hermes...\n");
  
  const hermesUrl = `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${LQD_PRICE_FEED_ID}`;
  
  try {
    const response = await fetch(hermesUrl);
    const data = await response.json();
    
    if (!data.binary || !data.binary.data || data.binary.data.length === 0) {
      console.error("❌ No price data available from Hermes");
      console.log("Response:", JSON.stringify(data, null, 2));
      return null;
    }
    
    console.log("✅ Price update fetched successfully");
    console.log("📊 Price data:", data.parsed?.[0]?.price);
    console.log("");
    
    // Return the VAA (Verifiable Action Approval) data
    return data.binary.data;
  } catch (error) {
    console.error("❌ Error fetching from Hermes:", error.message);
    return null;
  }
}

async function testLqdPrice() {
  console.log("🔍 Testing Pyth LQD Price Feed\n");
  console.log("=" .repeat(60));
  console.log("");
  
  // Fetch price update
  const priceUpdateData = await fetchPriceUpdate();
  
  if (!priceUpdateData) {
    console.log("\n⚠️  Could not fetch price update. Trying view function instead...\n");
    
    // Try the view function (unsafe - may not have fresh data)
    const config = new AptosConfig({ network: Network.TESTNET });
    const aptos = new Aptos(config);
    
    try {
      const result = await aptos.view({
        payload: {
          function: `${MODULE_ADDRESS}::pyth_oracle::get_lqd_price`,
          typeArguments: [],
          functionArguments: []
        }
      });
      
      const priceInMicroUsd = result[0];
      const timestamp = result[1];
      const priceInUsd = Number(priceInMicroUsd) / 1_000_000;
      
      console.log("📊 LQD/USD Price (from view function):");
      console.log(`   Price: $${priceInUsd.toFixed(2)}`);
      console.log(`   Timestamp: ${new Date(Number(timestamp) * 1000).toISOString()}`);
      console.log(`   Raw: ${priceInMicroUsd} micro USD`);
      
    } catch (error) {
      console.error("❌ View function also failed:", error.message);
    }
    
    return;
  }
  
  // Initialize Aptos client
  const config = new AptosConfig({ network: Network.TESTNET });
  const aptos = new Aptos(config);
  
  // Create signer from private key
  const privateKey = new Ed25519PrivateKey(PUBLISHER_PRIVATE_KEY);
  const account = Account.fromPrivateKey({ privateKey });
  
  console.log("💼 Using account:", account.accountAddress.toString());
  console.log("");
  
  // Check update fee
  console.log("💰 Checking Pyth update fee...");
  
  try {
    const feeResult = await aptos.view({
      payload: {
        function: `0x7e783b349d3e89cf5931af376ebeadbfab855b3fa239b7ada8f5a92fbea6b387::pyth::get_update_fee`,
        typeArguments: [],
        functionArguments: [priceUpdateData]
      }
    });
    
    const fee = feeResult[0];
    console.log(`   Update fee: ${fee} octas (${Number(fee) / 100_000_000} APT)`);
    console.log("");
    
  } catch (error) {
    console.log("   Could not fetch fee, continuing anyway...\n");
  }
  
  // Call get_lqd_price_with_update
  console.log("🚀 Calling get_lqd_price_with_update...");
  
  try {
    const transaction = await aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: {
        function: `${MODULE_ADDRESS}::pyth_oracle::get_lqd_price_with_update`,
        typeArguments: [],
        functionArguments: [priceUpdateData]
      }
    });
    
    const pendingTxn = await aptos.signAndSubmitTransaction({
      signer: account,
      transaction
    });
    
    console.log(`   Transaction hash: ${pendingTxn.hash}`);
    console.log(`   Explorer: https://explorer.aptoslabs.com/txn/${pendingTxn.hash}?network=testnet`);
    console.log("");
    
    const result = await aptos.waitForTransaction({
      transactionHash: pendingTxn.hash
    });
    
    if (result.success) {
      console.log("✅ Transaction successful!");
      console.log("");
      console.log("📊 LQD Price fetched from Pyth Network!");
      
      // Now try to view the price
      const viewResult = await aptos.view({
        payload: {
          function: `${MODULE_ADDRESS}::pyth_oracle::get_lqd_price`,
          typeArguments: [],
          functionArguments: []
        }
      });
      
      const priceInMicroUsd = viewResult[0];
      const timestamp = viewResult[1];
      const priceInUsd = Number(priceInMicroUsd) / 1_000_000;
      
      console.log(`   Price: $${priceInUsd.toFixed(2)}`);
      console.log(`   Timestamp: ${new Date(Number(timestamp) * 1000).toISOString()}`);
      console.log(`   Raw: ${priceInMicroUsd} micro USD`);
      
    } else {
      console.log("❌ Transaction failed:", result.vm_status);
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.data) {
      console.error("   Details:", JSON.stringify(error.data, null, 2));
    }
  }
  
  console.log("");
  console.log("=" .repeat(60));
}

testLqdPrice().catch(console.error);

