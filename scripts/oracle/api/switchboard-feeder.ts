// Load .env from project root (three levels up from scripts/oracle/api/)
import { config as dotenvConfig } from "dotenv";
import path from "path";
dotenvConfig({ path: path.resolve(process.cwd(), "../../../.env") });
import {
  CrossbarClient,
  SwitchboardClient,
  Aggregator,
  ON_DEMAND_MAINNET_QUEUE,
  ON_DEMAND_TESTNET_QUEUE,
  waitForTx,
} from "@switchboard-xyz/aptos-sdk";
import { OracleJob } from "@switchboard-xyz/common";
import { Aptos, Account, AptosConfig, Network, Ed25519PrivateKey } from "@aptos-labs/ts-sdk";

// get the aptos client
const config = new AptosConfig({
  network: Network.TESTNET, // network a necessary param / if not passed in, full node url is required
});
// create a SwitchboardClient using the aptos client
const aptos = new Aptos(config);
const client = new SwitchboardClient(aptos as any);

// Try different Crossbar endpoints
const crossbarClient = new CrossbarClient("https://api.switchboard.xyz");

// ... define some jobs using proper OracleJob format ...
const jobs = [
  OracleJob.fromObject({
    tasks: [
      {
        httpTask: {
          url: "https://data.alpaca.markets/v2/stocks/quotes/latest?symbols=AAPL",
          headers: [
            { key: 'accept', value: 'application/json' },
            { key: 'APCA-API-KEY-ID', value: 'PKUAON9P15H5CI7E59O7' },
            { key: 'APCA-API-SECRET-KEY', value: 'AyjwmRAooIdtF3duPoX6AnfAzmotxikWwgQdFdoU' }
          ]
        }
      },
      {
        jsonParseTask: {
          path: "$.quotes.AAPL.bp"
        }
      },
      {
        multiplyTask: {
          scalar: 100
        }
      }
    ]
  })
];

const isMainnet = false; // set to false for testnet
const queue = isMainnet
  ? ON_DEMAND_MAINNET_QUEUE
  : ON_DEMAND_TESTNET_QUEUE;

// Store some job definition
console.log("Storing jobs:", JSON.stringify(jobs, null, 2));
console.log("Queue:", queue);
let feedHash;
try {
  const result = await crossbarClient.store(queue, jobs);
  feedHash = result.feedHash;
  console.log("✅ Feed hash received:", feedHash);
} catch (error) {
  console.error("❌ Crossbar store error:", error);
  console.log("Trying alternative Crossbar endpoint...");
  
  // Try alternative endpoint
  const altCrossbarClient = new CrossbarClient("https://crossbar.switchboard.xyz");
  try {
    const altResult = await altCrossbarClient.store(queue, jobs);
    feedHash = altResult.feedHash;
    console.log("✅ Feed hash received from alternative endpoint:", feedHash);
  } catch (altError) {
    console.error("❌ Alternative endpoint also failed:", altError);
    throw new Error("Both Crossbar endpoints failed. Cannot proceed without valid feedHash from CrossbarClient.");
  }
}

// try creating a feed
const feedName = "LQD/USD";

// Require only one oracle response needed
const minSampleSize = 1;

// Allow update data to be up to 60 seconds old
const maxStalenessSeconds = 60;

// If jobs diverge more than 1%, don't allow the feed to produce a valid update
const maxVariance = 1e9;

// Require only 1 job response
const minResponses = 1;

//==========================================================
// Feed Initialization On-Chain
//==========================================================

// ... get the account object for your signer with relevant key / address ...

// Use existing account - using the private key from .env file
const PRIVATE_KEY = "0x2935bb6b8694b6599dbea525864eab25f87cad41d11b5a477974a4f104af5e52";
console.log("Using existing account from hardcoded private key");
const privateKey = new Ed25519PrivateKey(PRIVATE_KEY);
const account = Account.fromPrivateKey({ privateKey });
const signerAddress = account.accountAddress.toString();
console.log("Using existing account address:", signerAddress);

// Fund the account with testnet APT
try {
  console.log("Funding account with testnet APT...");
  await aptos.fundAccount({
    accountAddress: signerAddress,
    amount: 100000000, // 0.1 APT
  });
  console.log("Account funded successfully!");
} catch (error) {
  console.error("Failed to fund account:", error);
  console.log("Please fund the account manually at:", signerAddress);
  console.log("Go to: https://aptos.dev/network/faucet");
}

const aggregatorInitTx = await Aggregator.initTx(client, signerAddress, {
  name: feedName,
  minSampleSize,
  maxStalenessSeconds,
  maxVariance,
  feedHash,
  minResponses,
});

const res = await aptos.signAndSubmitTransaction({
  signer: account,
  transaction: aggregatorInitTx as any,
});

const result = await aptos.waitForTransaction({
  transactionHash: res.hash,
  options: {
    timeoutSecs: 30,
    checkSuccess: true,
  },
});

// Log the transaction results
console.log("=== TRANSACTION RESULT ===");
console.log("Success:", result.success);
console.log("Transaction Hash:", result.hash);

// Extract aggregator ID from AggregatorCreated event
if (result.type === 'user_transaction' && 'events' in result && result.events) {
  for (const event of result.events) {
    if (event.type.includes("AggregatorCreated")) {
      console.log("\n🎯 Found AggregatorCreated event!");
      console.log("Event data:", JSON.stringify(event.data, null, 2));
      
      // The aggregator address should be in the event data
      if (event.data && event.data.aggregator) {
        console.log("\n🎉 AGGREGATOR ID FOUND!");
        console.log("Aggregator ID:", event.data.aggregator);
        console.log("\n📋 Use this in your orders.move contract:");
        console.log(`aggregator_address: ${event.data.aggregator}`);
      }
    }
  }
}

// Use existing aggregator ID (don't create new one every time)
const aggregatorId = "0x23abd02a9626fb84525f534e25eac2721b14f6753d398f4d07f419c00d4ab21"; // Use existing aggregator

// Updating Feeds
const aggregator = new Aggregator(client, aggregatorId);

// Fetch and log the oracle responses
console.log("🔍 Fetching updates from Switchboard aggregator...");
const { updates } = await aggregator.fetchUpdate();

console.log("\n" + "=".repeat(60));
console.log("📊 SWITCHBOARD UPDATES DATA:");
console.log("=".repeat(60));
console.log("Number of updates:", updates.length);
console.log("\nUpdates array:");
console.log(JSON.stringify(updates, null, 2));

console.log("\n" + "=".repeat(60));
console.log("🔍 DETAILED ANALYSIS:");
console.log("=".repeat(60));

updates.forEach((update, index) => {
  console.log(`\nUpdate ${index + 1}:`);
  console.log("Type:", typeof update);
  console.log("Is Buffer:", Buffer.isBuffer(update));
  console.log("Length:", update.length);
  console.log("Content:", update);
  console.log("As hex string:", update.toString('hex'));
  console.log("As string:", update.toString('utf8'));
});

console.log("\n" + "=".repeat(60));
console.log("📋 WHAT THIS MEANS:");
console.log("=".repeat(60));
console.log("• Each update is a byte array (Buffer)");
console.log("• Contains oracle response data from Switchboard");
console.log("• Usually contains price data, timestamps, and validation info");
console.log("• Your oracle contract will receive this as vector<vector<u8>>");
console.log("• You can extract price information from these byte arrays");

// Script completed - no infinite loop
console.log("\n✅ Script completed successfully!");
console.log("📋 To see the updates data structure, check the output above.");
