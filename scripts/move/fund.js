require("dotenv").config();
const { AptosConfig, Network, FaucetClient } = require("@aptos-labs/ts-sdk");

(async () => {
  const { MODULE_PUBLISHER_ACCOUNT_ADDRESS, APP_NETWORK } = process.env;
  if (!MODULE_PUBLISHER_ACCOUNT_ADDRESS) throw new Error("MODULE_PUBLISHER_ACCOUNT_ADDRESS not set");
  const network = APP_NETWORK || Network.TESTNET;
  if (network === Network.MAINNET) {
    console.log("Faucet not available on mainnet.");
    return;
  }
  const cfg = new AptosConfig({ network });
  const faucet = new FaucetClient({ aptosConfig: cfg });
  await faucet.fundAccount({ accountAddress: MODULE_PUBLISHER_ACCOUNT_ADDRESS, amount: 2_000_000_000 });
  console.log("Funded:", MODULE_PUBLISHER_ACCOUNT_ADDRESS);
})();
