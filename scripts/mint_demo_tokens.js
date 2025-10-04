#!/usr/bin/env node

const { execSync } = require('child_process');
require('dotenv').config();

const MODULE_ADDRESS = "0xf21ca0578f286a0ce5e9f43eab0387a9b7ee1b9ffd1f4634a772d415561fa0fd";
const MODULE_PUBLISHER_ACCOUNT_PRIVATE_KEY = process.env.MODULE_PUBLISHER_ACCOUNT_PRIVATE_KEY;

// Demo token amounts (6 decimals)
const DEMO_AMOUNTS = {
  USDC_NEW: 1000000000,  // 1000 USDC_NEW
  USDT_NEW: 1000000000,  // 1000 USDT_NEW  
  LQD_NEW: 5000000       // 5 LQD_NEW
};

async function mintDemoTokens(targetAddress) {
  console.log("🎯 Minting Demo Tokens");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  console.log(`📍 Target Address: ${targetAddress}`);
  console.log(`📦 Module Address: ${MODULE_ADDRESS}\n`);

  const results = {};

  try {
    // Mint USDC_NEW
    console.log("1️⃣ Minting 1000 USDC_NEW...");
    const usdcTx = execSync(
      `aptos move run --function-id "${MODULE_ADDRESS}::SpoutTokenV2::mint" ` +
      `--type-args "${MODULE_ADDRESS}::SpoutTokenV2::USDC_NEW" ` +
      `--args address:${targetAddress} u64:${DEMO_AMOUNTS.USDC_NEW} ` +
      `--private-key="${MODULE_PUBLISHER_ACCOUNT_PRIVATE_KEY}" ` +
      `--url="https://fullnode.testnet.aptoslabs.com/v1" ` +
      `--assume-yes`,
      { encoding: 'utf8' }
    );
    
    const usdcTxHash = usdcTx.match(/"transaction_hash":\s*"([^"]+)"/)?.[1];
    results.USDC_NEW = {
      amount: 1000,
      txHash: usdcTxHash,
      explorer: `https://explorer.aptoslabs.com/txn/${usdcTxHash}?network=testnet`
    };
    console.log(`   ✅ USDC_NEW: 1000 tokens`);
    console.log(`   🔗 TX: https://explorer.aptoslabs.com/txn/${usdcTxHash}?network=testnet\n`);

    // Mint USDT_NEW
    console.log("2️⃣ Minting 1000 USDT_NEW...");
    const usdtTx = execSync(
      `aptos move run --function-id "${MODULE_ADDRESS}::SpoutTokenV2::mint" ` +
      `--type-args "${MODULE_ADDRESS}::SpoutTokenV2::USDT_NEW" ` +
      `--args address:${targetAddress} u64:${DEMO_AMOUNTS.USDT_NEW} ` +
      `--private-key="${MODULE_PUBLISHER_ACCOUNT_PRIVATE_KEY}" ` +
      `--url="https://fullnode.testnet.aptoslabs.com/v1" ` +
      `--assume-yes`,
      { encoding: 'utf8' }
    );
    
    const usdtTxHash = usdtTx.match(/"transaction_hash":\s*"([^"]+)"/)?.[1];
    results.USDT_NEW = {
      amount: 1000,
      txHash: usdtTxHash,
      explorer: `https://explorer.aptoslabs.com/txn/${usdtTxHash}?network=testnet`
    };
    console.log(`   ✅ USDT_NEW: 1000 tokens`);
    console.log(`   🔗 TX: https://explorer.aptoslabs.com/txn/${usdtTxHash}?network=testnet\n`);

    // Mint LQD_NEW
    console.log("3️⃣ Minting 5 LQD_NEW...");
    const lqdTx = execSync(
      `aptos move run --function-id "${MODULE_ADDRESS}::SpoutTokenV2::mint" ` +
      `--type-args "${MODULE_ADDRESS}::SpoutTokenV2::LQD_NEW" ` +
      `--args address:${targetAddress} u64:${DEMO_AMOUNTS.LQD_NEW} ` +
      `--private-key="${MODULE_PUBLISHER_ACCOUNT_PRIVATE_KEY}" ` +
      `--url="https://fullnode.testnet.aptoslabs.com/v1" ` +
      `--assume-yes`,
      { encoding: 'utf8' }
    );
    
    const lqdTxHash = lqdTx.match(/"transaction_hash":\s*"([^"]+)"/)?.[1];
    results.LQD_NEW = {
      amount: 5,
      txHash: lqdTxHash,
      explorer: `https://explorer.aptoslabs.com/txn/${lqdTxHash}?network=testnet`
    };
    console.log(`   ✅ LQD_NEW: 5 tokens`);
    console.log(`   🔗 TX: https://explorer.aptoslabs.com/txn/${lqdTxHash}?network=testnet\n`);

    // Summary
    console.log("🎉 Demo Tokens Minted Successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log(`📍 Target Address: ${targetAddress}\n`);
    console.log("📊 Tokens Minted:");
    console.log(`   💰 USDC_NEW: ${results.USDC_NEW.amount} tokens`);
    console.log(`   💰 USDT_NEW: ${results.USDT_NEW.amount} tokens`);
    console.log(`   💰 LQD_NEW: ${results.LQD_NEW.amount} tokens\n`);
    console.log("🔗 Transaction Links:");
    console.log(`   USDC_NEW: ${results.USDC_NEW.explorer}`);
    console.log(`   USDT_NEW: ${results.USDT_NEW.explorer}`);
    console.log(`   LQD_NEW: ${results.LQD_NEW.explorer}\n`);

    return results;

  } catch (error) {
    console.error("❌ Error minting demo tokens:", error.message);
    process.exit(1);
  }
}

// Main execution
async function main() {
  const targetAddress = process.argv[2];
  
  if (!targetAddress) {
    console.log("Usage: node mint_demo_tokens.js <target_address>");
    console.log("Example: node mint_demo_tokens.js 0x1234567890abcdef...");
    process.exit(1);
  }

  if (!MODULE_PUBLISHER_ACCOUNT_PRIVATE_KEY) {
    console.error("❌ MODULE_PUBLISHER_ACCOUNT_PRIVATE_KEY not found in .env file");
    process.exit(1);
  }

  await mintDemoTokens(targetAddress);
}

main();

