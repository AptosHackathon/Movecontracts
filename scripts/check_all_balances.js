/**
 * Check All Token Balances
 * 
 * Demonstrates all balance and supply payloads for RWA tokens
 */

require('dotenv').config();
const { Aptos, AptosConfig, Network } = require('@aptos-labs/ts-sdk');

const MODULE_ADDRESS = process.env.MODULE_ADDRESS;
const ACCOUNT_ADDRESS = process.env.MODULE_PUBLISHER_ACCOUNT_ADDRESS;

// Token Type Arguments
const TOKEN_TYPES = {
  USDC: 'u8',
  LQD: `${MODULE_ADDRESS}::SpoutToken::LQD`,
  TSLA: `${MODULE_ADDRESS}::SpoutToken::TSLA`,
  AAPL: `${MODULE_ADDRESS}::SpoutToken::AAPL`,
};

/**
 * Get balance for a token
 */
async function getBalance(aptos, ticker, ownerAddress) {
  const typeArg = TOKEN_TYPES[ticker];
  
  const payload = {
    function: `${MODULE_ADDRESS}::SpoutToken::balance`,
    typeArguments: [typeArg],
    functionArguments: [ownerAddress],
  };
  
  try {
    const result = await aptos.view({ payload });
    const balance = Number(result[0]);
    return balance / 100_000_000; // 8 decimals
  } catch (error) {
    return 0;
  }
}

/**
 * Get total supply for a token
 */
async function getSupply(aptos, ticker) {
  const typeArg = TOKEN_TYPES[ticker];
  
  const payload = {
    function: `${MODULE_ADDRESS}::SpoutToken::total_supply`,
    typeArguments: [typeArg],
    functionArguments: [],
  };
  
  try {
    const result = await aptos.view({ payload });
    const supply = Number(result[0]);
    return supply / 100_000_000; // 8 decimals
  } catch (error) {
    return 0;
  }
}

/**
 * Main
 */
async function main() {
  const config = new AptosConfig({ network: Network.TESTNET });
  const aptos = new Aptos(config);
  
  const userAddress = process.argv[2] || ACCOUNT_ADDRESS;
  
  console.log(`\n╔═══════════════════════════════════════════════════╗`);
  console.log(`║        RWA Token Balances & Supplies             ║`);
  console.log(`╚═══════════════════════════════════════════════════╝\n`);
  
  console.log(`📍 User Address: ${userAddress}\n`);
  
  // Fetch all balances
  console.log(`💰 User Balances:`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  
  const tickers = ['USDC', 'LQD', 'TSLA', 'AAPL'];
  const balances = {};
  
  for (const ticker of tickers) {
    const balance = await getBalance(aptos, ticker, userAddress);
    balances[ticker] = balance;
    
    const icon = ticker === 'USDC' ? '💵' : ticker === 'LQD' ? '🏦' : ticker === 'TSLA' ? '🚗' : '🍎';
    console.log(`${icon} ${ticker.padEnd(5)}: ${balance.toFixed(8).padStart(15)}`);
  }
  
  // Fetch all supplies
  console.log(`\n📊 Total Supplies:`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  
  const supplies = {};
  
  for (const ticker of tickers) {
    const supply = await getSupply(aptos, ticker);
    supplies[ticker] = supply;
    
    const icon = ticker === 'USDC' ? '💵' : ticker === 'LQD' ? '🏦' : ticker === 'TSLA' ? '🚗' : '🍎';
    console.log(`${icon} ${ticker.padEnd(5)}: ${supply.toFixed(8).padStart(15)}`);
  }
  
  // Show payloads
  console.log(`\n\n📝 Example Payloads:\n`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  
  console.log(`\n🔹 USDC Balance Payload:`);
  console.log(JSON.stringify({
    function: `${MODULE_ADDRESS}::SpoutToken::balance`,
    typeArguments: ['u8'],
    functionArguments: [userAddress],
  }, null, 2));
  
  console.log(`\n🔹 LQD Balance Payload:`);
  console.log(JSON.stringify({
    function: `${MODULE_ADDRESS}::SpoutToken::balance`,
    typeArguments: [`${MODULE_ADDRESS}::SpoutToken::LQD`],
    functionArguments: [userAddress],
  }, null, 2));
  
  console.log(`\n🔹 TSLA Balance Payload:`);
  console.log(JSON.stringify({
    function: `${MODULE_ADDRESS}::SpoutToken::balance`,
    typeArguments: [`${MODULE_ADDRESS}::SpoutToken::TSLA`],
    functionArguments: [userAddress],
  }, null, 2));
  
  console.log(`\n🔹 AAPL Balance Payload:`);
  console.log(JSON.stringify({
    function: `${MODULE_ADDRESS}::SpoutToken::balance`,
    typeArguments: [`${MODULE_ADDRESS}::SpoutToken::AAPL`],
    functionArguments: [userAddress],
  }, null, 2));
  
  console.log(`\n🔹 LQD Supply Payload:`);
  console.log(JSON.stringify({
    function: `${MODULE_ADDRESS}::SpoutToken::total_supply`,
    typeArguments: [`${MODULE_ADDRESS}::SpoutToken::LQD`],
    functionArguments: [],
  }, null, 2));
  
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  
  // Portfolio value (if we had prices)
  console.log(`💼 Portfolio Summary:\n`);
  const prices = { USDC: 1, LQD: 111.69, TSLA: 250.50, AAPL: 257.13 };
  let totalValue = 0;
  
  for (const ticker of tickers) {
    const value = balances[ticker] * prices[ticker];
    totalValue += value;
    console.log(`   ${ticker}: ${balances[ticker].toFixed(4)} × $${prices[ticker]} = $${value.toFixed(2)}`);
  }
  
  console.log(`   ${'─'.repeat(50)}`);
  console.log(`   Total Portfolio Value: $${totalValue.toFixed(2)}\n`);
}

main().catch(console.error);

