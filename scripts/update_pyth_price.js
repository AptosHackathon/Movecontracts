/**
 * Update Pyth Price On-Chain
 * 
 * This script demonstrates:
 * 1. Fetching price update from Pyth Hermes API
 * 2. Submitting it to the Pyth contract on-chain
 * 3. Reading the updated price
 */

require('dotenv').config();
const { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } = require('@aptos-labs/ts-sdk');

const MODULE_ADDRESS = process.env.MODULE_ADDRESS;
const PUBLISHER_PRIVATE_KEY = process.env.MODULE_PUBLISHER_ACCOUNT_PRIVATE_KEY;

// Pyth Hermes API
const HERMES_API = 'https://hermes.pyth.network';

// Price Feed IDs
const PRICE_FEEDS = {
  LQD: 'e4ff71a60c3d5d5d37c1bba559c2e92745c1501ebd81a97d150cf7cd5119aa9c',
  BTC: 'e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
  ETH: 'ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
};

/**
 * Fetch price update from Pyth Hermes
 */
async function fetchPriceUpdate(priceId) {
  const url = `${HERMES_API}/v2/updates/price/latest?ids[]=${priceId}`;
  
  console.log(`📡 Fetching price from Hermes: ${url.substring(0, 60)}...`);
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Hermes error: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  // Get price info for display
  const priceInfo = data.parsed[0].price;
  const price = Number(priceInfo.price) / (10 ** -priceInfo.expo);
  
  console.log(`✅ Fetched price: $${price.toFixed(2)}`);
  console.log(`   Publish time: ${new Date(priceInfo.publish_time * 1000).toISOString()}`);
  
  // Return VAA data with 0x prefix
  return data.binary.data.map(vaa => '0x' + vaa);
}

/**
 * Update price on Pyth contract
 */
async function updatePythPrice(ticker) {
  const config = new AptosConfig({ network: Network.TESTNET });
  const aptos = new Aptos(config);
  
  const privateKey = new Ed25519PrivateKey(PUBLISHER_PRIVATE_KEY);
  const account = Account.fromPrivateKey({ privateKey });
  
  console.log(`\n🔄 Updating ${ticker} price on Pyth contract...`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  
  // 1. Fetch price update from Hermes
  const priceId = PRICE_FEEDS[ticker];
  const priceUpdateData = await fetchPriceUpdate(priceId);
  
  console.log(`\n📦 Price update data: ${priceUpdateData.length} VAAs`);
  
  // 2. Get update fee
  try {
    const pythAddress = '0x7e783b349d3e89cf5931af376ebeadbfab855b3fa239b7ada8f5a92fbea6b387';
    const feeResult = await aptos.view({
      payload: {
        function: `${pythAddress}::pyth::get_update_fee`,
        functionArguments: [priceUpdateData],
      }
    });
    console.log(`💰 Update fee: ${feeResult[0]} octas`);
  } catch (err) {
    console.log(`⚠️  Could not fetch update fee: ${err.message}`);
  }
  
  // 3. Submit price update to Pyth contract
  try {
    const transaction = await aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: {
        function: `${MODULE_ADDRESS}::pyth_oracle::update_${ticker.toLowerCase()}_price`,
        typeArguments: [],
        functionArguments: [priceUpdateData]
      }
    });
    
    const pendingTxn = await aptos.signAndSubmitTransaction({
      signer: account,
      transaction
    });
    
    console.log(`\n📤 Transaction submitted: ${pendingTxn.hash}`);
    console.log(`   Explorer: https://explorer.aptoslabs.com/txn/${pendingTxn.hash}?network=testnet`);
    
    const result = await aptos.waitForTransaction({
      transactionHash: pendingTxn.hash
    });
    
    if (result.success) {
      console.log(`✅ SUCCESS! ${ticker} price updated on-chain via Pyth`);
      
      // 4. Read the updated price
      const priceResult = await aptos.view({
        payload: {
          function: `${MODULE_ADDRESS}::pyth_oracle::get_${ticker.toLowerCase()}_price`,
          functionArguments: [],
        }
      });
      
      const priceMicroUsd = Number(priceResult[0]);
      const timestamp = Number(priceResult[1]);
      
      console.log(`\n📊 On-chain ${ticker} price: $${(priceMicroUsd / 1_000_000).toFixed(2)}`);
      console.log(`   Timestamp: ${new Date(timestamp * 1000).toISOString()}`);
      
    } else {
      console.log(`❌ Transaction failed: ${result.vm_status}`);
    }
    
  } catch (error) {
    console.error(`\n❌ Error updating price:`, error.message);
    
    if (error.message.includes('BACKWARD_INCOMPATIBLE')) {
      console.log(`\n💡 Note: update_${ticker.toLowerCase()}_price function may not exist yet.`);
      console.log(`   Check pyth_oracle.move for available functions.`);
    } else if (error.message.includes('0x60008')) {
      console.log(`\n💡 Note: Pyth testnet limitation - price feed not available on-chain.`);
      console.log(`   This will work on mainnet where Pyth has active price feeds.`);
    } else if (error.message.includes('WRONG_VERSION')) {
      console.log(`\n💡 Note: Wormhole VAA version mismatch (known Pyth testnet issue).`);
      console.log(`   Use mainnet for production or use multi_oracle for testnet.`);
    }
  }
}

/**
 * Main
 */
async function main() {
  const ticker = process.argv[2] || 'LQD';
  
  console.log(`\n╔═══════════════════════════════════════════╗`);
  console.log(`║   Pyth Price Update Demo (${ticker.toUpperCase().padEnd(4)})          ║`);
  console.log(`╚═══════════════════════════════════════════╝`);
  
  await updatePythPrice(ticker.toUpperCase());
  
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`\n💡 For frontend integration:`);
  console.log(`   1. Import from frontend/utils/pythPriceUpdate.ts`);
  console.log(`   2. Call updatePythPrice(aptos, account, 'LQD')`);
  console.log(`   3. Use the updated price in your orders\n`);
}

main().catch(console.error);

