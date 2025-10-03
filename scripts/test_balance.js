const { Aptos, AptosConfig, Network } = require("@aptos-labs/ts-sdk");

const config = new AptosConfig({ network: Network.TESTNET });
const aptos = new Aptos(config);

const MODULE_ADDRESS = "0x59affcd91dd0fae47f7504f827c16482f3e7839974c8a370594de284ad043b4f";

async function getUSDTBalance(ownerAddress) {
  const result = await aptos.view({
    payload: {
      function: `${MODULE_ADDRESS}::SpoutTokenV2::balance`,
      typeArguments: [`${MODULE_ADDRESS}::SpoutTokenV2::USDT`],
      functionArguments: [ownerAddress],
    },
  });
  
  const rawBalance = Number(result[0]); // 10000000000
  const usdtBalance = rawBalance / 1_000_000; // 10000 USDT (6 decimals)
  
  return {
    raw: rawBalance,
    formatted: usdtBalance,
    display: `${usdtBalance.toLocaleString()} USDT`
  };
}

async function main() {
  const userAddress = "0x2cb284956406fac1d787a0e67612838e8961b08df177ce9e7354560e35b58f10";
  
  console.log("🔍 Testing USDT Balance Fetch");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  
  console.log(`📍 User Address: ${userAddress}`);
  console.log(`📦 Module Address: ${MODULE_ADDRESS}`);
  console.log(`🪙 Token Type: USDT\n`);
  
  try {
    const balance = await getUSDTBalance(userAddress);
    
    console.log("✅ Balance fetch successful!\n");
    console.log("📊 Results:");
    console.log(`   Raw Balance: ${balance.raw}`);
    console.log(`   Formatted: ${balance.formatted} USDT`);
    console.log(`   Display: ${balance.display}`);
    
  } catch (error) {
    console.error("❌ Error fetching balance:", error.message);
    process.exit(1);
  }
}

main();

