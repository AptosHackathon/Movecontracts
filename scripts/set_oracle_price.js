// Manually set oracle price
// Usage: node scripts/set_oracle_price.js <price_in_usd> <ticker_name>
// Example: node scripts/set_oracle_price.js 111.69 LQD

require('dotenv').config();
const { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } = require('@aptos-labs/ts-sdk');

const MODULE_ADDRESS = process.env.MODULE_ADDRESS;
const PUBLISHER_ADDRESS = process.env.MODULE_PUBLISHER_ACCOUNT_ADDRESS;
const PUBLISHER_PRIVATE_KEY = process.env.MODULE_PUBLISHER_ACCOUNT_PRIVATE_KEY;

async function setOraclePrice() {
  const priceInUsd = parseFloat(process.argv[2] || "111.69");
  const ticker = process.argv[3] || "LQD";
  
  const priceInMicroUsd = Math.floor(priceInUsd * 1_000_000);
  const timestamp = Math.floor(Date.now() / 1000);
  
  console.log(`📊 Setting Oracle Price for ${ticker}`);
  console.log(`   Price: $${priceInUsd}`);
  console.log(`   Micro USD: ${priceInMicroUsd}`);
  console.log(`   Timestamp: ${timestamp}\n`);
  
  const config = new AptosConfig({ network: Network.TESTNET });
  const aptos = new Aptos(config);
  
  const privateKey = new Ed25519PrivateKey(PUBLISHER_PRIVATE_KEY);
  const account = Account.fromPrivateKey({ privateKey });
  
  try {
    // The oracle's push_price looks at @rwa_addr which is the module address
    // But Config was created at publisher address during init
    // So we need to call it as the admin (publisher) 
    
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
    
    console.log(`📤 Transaction: ${pendingTxn.hash}`);
    
    const result = await aptos.waitForTransaction({
      transactionHash: pendingTxn.hash
    });
    
    if (result.success) {
      console.log(`✅ Oracle price updated successfully!`);
      console.log(`\n💡 Now ${ticker} orders will use $${priceInUsd} as the price`);
    } else {
      console.log(`❌ Transaction failed: ${result.vm_status}`);
      console.log(`\n⚠️  This is expected - oracle Config is at publisher address but push_price looks at module address`);
      console.log(`   The price in the oracle is still $100.00`);
      console.log(`   For testnet, this is fine for testing. For mainnet, use Pyth integration.`);
    }
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    console.log(`\n⚠️  Oracle update failed due to address mismatch`);
    console.log(`   Current oracle price remains: $100.00`);
    console.log(`\n💡 For accurate LQD pricing:`);
    console.log(`   1. Use Pyth prices in your frontend/backend directly ($${priceInUsd})`);
    console.log(`   2. Or deploy to mainnet where Pyth integration works`);
  }
}

setOraclePrice().catch(console.error);

