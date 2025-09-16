require("dotenv").config();
const { Aptos, AptosConfig, Network, Account, Hex } = require("@aptos-labs/ts-sdk");

(async () => {
  const { MODULE_ADDRESS, MODULE_PUBLISHER_ACCOUNT_PRIVATE_KEY, MODULE_PUBLISHER_ACCOUNT_ADDRESS, APP_NETWORK } = process.env;
  const argModule = process.argv[2];
  const moduleAddress = argModule || MODULE_ADDRESS || MODULE_PUBLISHER_ACCOUNT_ADDRESS;
  if (!moduleAddress) throw new Error("Module address not provided. Pass as argv[2], or set MODULE_ADDRESS or MODULE_PUBLISHER_ACCOUNT_ADDRESS.");
  if (!MODULE_PUBLISHER_ACCOUNT_PRIVATE_KEY) throw new Error("MODULE_PUBLISHER_ACCOUNT_PRIVATE_KEY not set.");

  const cfg = new AptosConfig({ network: APP_NETWORK || Network.TESTNET });
  const aptos = new Aptos(cfg);
  const admin = Account.fromPrivateKey({ privateKey: new Hex(MODULE_PUBLISHER_ACCOUNT_PRIVATE_KEY) });

  // Defaults; override by passing envs if desired
  const symbol = Buffer.from(process.env.TOKEN_SYMBOL || "SPT");
  const name = Buffer.from(process.env.TOKEN_NAME || "SpoutToken");
  const decimals = Number(process.env.TOKEN_DECIMALS || 6);

  const payload = {
    function: `${moduleAddress}::fa_token::init`,
    functionArguments: [symbol, name, decimals],
    typeArguments: [],
  };

  const txn = await aptos.transaction.build.simple({ sender: admin.accountAddress, data: payload });
  const signed = await aptos.sign({ signer: admin, transaction: txn });
  const committed = await aptos.transaction.submit.simple({ transaction: signed });
  const res = await aptos.waitForTransaction({ transactionHash: committed.hash });
  console.log("Init executed. Hash:", res.hash);
})();
