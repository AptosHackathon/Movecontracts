require("dotenv").config();
const { Aptos, AptosConfig, Network, Account, Hex } = require("@aptos-labs/ts-sdk");

(async () => {
  const { MODULE_ADDRESS, MODULE_PUBLISHER_ACCOUNT_PRIVATE_KEY, MODULE_PUBLISHER_ACCOUNT_ADDRESS, APP_NETWORK } = process.env;
  if (!MODULE_ADDRESS) throw new Error("MODULE_ADDRESS not set. Run publish.js first or set it manually.");
  if (!MODULE_PUBLISHER_ACCOUNT_PRIVATE_KEY) throw new Error("MODULE_PUBLISHER_ACCOUNT_PRIVATE_KEY not set.");
  if (!MODULE_PUBLISHER_ACCOUNT_ADDRESS) throw new Error("MODULE_PUBLISHER_ACCOUNT_ADDRESS not set.");

  const recipient = process.argv[2];
  const amountStr = process.argv[3];
  if (!recipient || !amountStr) {
    console.log("Usage: node scripts/move/mint.js <recipient_address> <amount>");
    process.exit(1);
  }
  const amount = BigInt(amountStr);

  const cfg = new AptosConfig({ network: APP_NETWORK || Network.TESTNET });
  const aptos = new Aptos(cfg);
  const admin = Account.fromPrivateKey({ privateKey: new Hex(MODULE_PUBLISHER_ACCOUNT_PRIVATE_KEY) });

  const payload = {
    function: `${MODULE_ADDRESS}::fa_token::mint`,
    functionArguments: [MODULE_PUBLISHER_ACCOUNT_ADDRESS, recipient, amount],
    typeArguments: [],
  };

  const txn = await aptos.transaction.build.simple({ sender: admin.accountAddress, data: payload });
  const signed = await aptos.sign({ signer: admin, transaction: txn });
  const committed = await aptos.transaction.submit.simple({ transaction: signed });
  const res = await aptos.waitForTransaction({ transactionHash: committed.hash });
  console.log("Mint executed. Hash:", res.hash);
})();
