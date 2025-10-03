const { Aptos, AptosConfig, Network } = require("@aptos-labs/ts-sdk");

const config = new AptosConfig({ network: Network.TESTNET });
const aptos = new Aptos(config);

const MODULE_ADDRESS = "0x59affcd91dd0fae47f7504f827c16482f3e7839974c8a370594de284ad043b4f";

async function getBalance(ownerAddress, tokenType) {
  const result = await aptos.view({
    payload: {
      function: `${MODULE_ADDRESS}::SpoutTokenV2::balance`,
      typeArguments: [`${MODULE_ADDRESS}::SpoutTokenV2::${tokenType}`],
      functionArguments: [ownerAddress],
    },
  });
  
  const rawBalance = Number(result[0]);
  const formattedBalance = rawBalance / 1_000_000; // 6 decimals
  
  return {
    token: tokenType,
    raw: rawBalance,
    formatted: formattedBalance,
    display: `${formattedBalance.toLocaleString()} ${tokenType}`
  };
}

async function main() {
  const userAddress = "0x2cb284956406fac1d787a0e67612838e8961b08df177ce9e7354560e35b58f10";
  
  console.log("🔍 Testing All Token Balances");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  
  console.log(`📍 User Address: ${userAddress}`);
  console.log(`📦 Module Address: ${MODULE_ADDRESS}\n`);
  
  const tokens = ["USDT", "USDC"];
  
  for (const token of tokens) {
    try {
      const balance = await getBalance(userAddress, token);
      
      console.log(`✅ ${balance.token} Balance:`);
      console.log(`   Raw: ${balance.raw}`);
      console.log(`   Formatted: ${balance.formatted}`);
      console.log(`   Display: ${balance.display}\n`);
      
    } catch (error) {
      console.error(`❌ Error fetching ${token} balance:`, error.message);
    }
  }
}

main();

