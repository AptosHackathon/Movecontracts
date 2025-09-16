require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey, Hex, FaucetClient } = require("@aptos-labs/ts-sdk");

(async () => {
  const networkName = process.env.APP_NETWORK || Network.TESTNET;
  const cfg = new AptosConfig({ network: networkName });
  const aptos = new Aptos(cfg);

  // Generate a new Ed25519 account
  const privateKey = Ed25519PrivateKey.generate();
  const account = Account.fromPrivateKey({ privateKey });
  const address = account.accountAddress.toString();
  const privateKeyHex = privateKey.toString();

  console.log("Generated account:");
  console.log("  Address:", address);
  console.log("  Private Key:", privateKeyHex);

  // Fund on non-mainnet
  if (networkName !== Network.MAINNET) {
    try {
      const faucet = new FaucetClient({ aptosConfig: cfg });
      await faucet.fundAccount({ accountAddress: address, amount: 1_000_000_000 }); // 1 APT
      console.log("Funded account via faucet.");
    } catch (e) {
      console.warn("Faucet funding failed or not available:", e?.message || e);
    }
  }

  // Write/update .env
  const envPath = path.resolve(process.cwd(), ".env");
  let env = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";

  function upsert(k, v) {
    const re = new RegExp(`^${k}=.*$`, "m");
    const line = `${k}=${v}`;
    if (env.match(re)) env = env.replace(re, line); else env += (env.endsWith("\n") ? "" : "\n") + line + "\n";
  }

  upsert("APP_NETWORK", networkName);
  upsert("MODULE_PUBLISHER_ACCOUNT_ADDRESS", address);
  upsert("MODULE_PUBLISHER_ACCOUNT_PRIVATE_KEY", privateKeyHex);

  fs.writeFileSync(envPath, env, "utf8");
  console.log(".env updated with MODULE_PUBLISHER_ACCOUNT_ADDRESS and PRIVATE_KEY.");
})();
