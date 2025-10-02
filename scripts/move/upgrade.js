require("dotenv").config();
const cli = require("@aptos-labs/ts-sdk/dist/common/cli/index.js");
const aptosSDK = require("@aptos-labs/ts-sdk")

async function publish() {
  if (!process.env.MODULE_ADDRESS) {
    throw new Error(
      "MODULE_ADDRESS variable is not set, make sure you have published the module before upgrading it",
    );
  }

  const move = new cli.Move();

  move.upgradeObjectPackage({
    packageDirectoryPath: "contract",
    objectAddress: process.env.MODULE_ADDRESS,
    namedAddresses: {
      // Upgrade module from an object - use MODULE_ADDRESS for object deployment
      message_board_addr: process.env.MODULE_ADDRESS,
      rwa_addr: process.env.MODULE_ADDRESS,
    },
    extraArguments: [
      `--private-key=${process.env.MODULE_PUBLISHER_ACCOUNT_PRIVATE_KEY}`,
      `--url=${aptosSDK.NetworkToNodeAPI[process.env.APP_NETWORK]}`,
      "--assume-yes",
      "--override-std", process.env.APP_NETWORK || "testnet"
    ],
  });
}
publish();
