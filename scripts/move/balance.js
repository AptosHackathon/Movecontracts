require("dotenv").config();
const { Aptos, AptosConfig, Network } = require("@aptos-labs/ts-sdk");

(async () => {
  const { MODULE_ADDRESS, MODULE_PUBLISHER_ACCOUNT_ADDRESS, APP_NETWORK } = process.env;
  if (!MODULE_ADDRESS) throw new Error("MODULE_ADDRESS not set. Run publish.js first or set it manually.");
  if (!MODULE_PUBLISHER_ACCOUNT_ADDRESS) throw new Error("MODULE_PUBLISHER_ACCOUNT_ADDRESS not set.");

  const owner = process.argv[2] || MODULE_PUBLISHER_ACCOUNT_ADDRESS;

  const cfg = new AptosConfig({ network: APP_NETWORK || Network.TESTNET });
  const aptos = new Aptos(cfg);

  const result = await aptos.view({
    payload: {
      function: `${MODULE_ADDRESS}::fa_token::balance_of`,
      functionArguments: [MODULE_PUBLISHER_ACCOUNT_ADDRESS, owner],
      typeArguments: [],
    },
  });

  console.log("Balance:", result[0].toString());
})();
