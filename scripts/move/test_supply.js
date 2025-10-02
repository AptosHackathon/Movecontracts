require("dotenv").config();
const { Aptos, AptosConfig, Network, Account, Hex } = require("@aptos-labs/ts-sdk");

(async () => {
  const { 
    MODULE_ADDRESS, 
    MODULE_PUBLISHER_ACCOUNT_PRIVATE_KEY, 
    MODULE_PUBLISHER_ACCOUNT_ADDRESS,
    APP_NETWORK 
  } = process.env;

  if (!MODULE_ADDRESS) throw new Error("MODULE_ADDRESS not set.");
  if (!MODULE_PUBLISHER_ACCOUNT_PRIVATE_KEY) throw new Error("MODULE_PUBLISHER_ACCOUNT_PRIVATE_KEY not set.");

  const cfg = new AptosConfig({ network: APP_NETWORK || Network.TESTNET });
  const aptos = new Aptos(cfg);
  const admin = Account.fromPrivateKey({ privateKey: new Hex(MODULE_PUBLISHER_ACCOUNT_PRIVATE_KEY) });

  console.log("\n=== Token Supply Test ===");
  console.log("Module Address:", MODULE_ADDRESS);
  console.log("Admin Address:", admin.accountAddress.toString());

  try {
    // 1. Initialize KYC registry
    console.log("\n1. Initializing KYC registry...");
    const kycInitPayload = {
      function: `${MODULE_ADDRESS}::kyc_registry::init`,
      functionArguments: [],
      typeArguments: [],
    };
    
    try {
      const kycTxn = await aptos.transaction.build.simple({ sender: admin.accountAddress, data: kycInitPayload });
      const kycSigned = await aptos.sign({ signer: admin, transaction: kycTxn });
      const kycCommitted = await aptos.transaction.submit.simple({ transaction: kycSigned });
      await aptos.waitForTransaction({ transactionHash: kycCommitted.hash });
      console.log("✅ KYC registry initialized");
    } catch (e) {
      if (e.message?.includes("RESOURCE_ALREADY_EXISTS")) {
        console.log("✅ KYC registry already initialized");
      } else {
        throw e;
      }
    }

    // 2. Verify admin in KYC
    console.log("\n2. Adding admin to KYC whitelist...");
    const kycVerifyPayload = {
      function: `${MODULE_ADDRESS}::kyc_registry::set_verified`,
      functionArguments: [admin.accountAddress.toString(), true],
      typeArguments: [],
    };
    
    const kycVerifyTxn = await aptos.transaction.build.simple({ sender: admin.accountAddress, data: kycVerifyPayload });
    const kycVerifySigned = await aptos.sign({ signer: admin, transaction: kycVerifyTxn });
    const kycVerifyCommitted = await aptos.transaction.submit.simple({ transaction: kycVerifySigned });
    await aptos.waitForTransaction({ transactionHash: kycVerifyCommitted.hash });
    console.log("✅ Admin verified in KYC");

    // 3. Initialize Token (using a test type parameter)
    console.log("\n3. Initializing token...");
    const symbol = Buffer.from("TSPT"); // Test SPT
    const name = Buffer.from("Test SpoutToken");
    const decimals = 6;

    const initPayload = {
      function: `${MODULE_ADDRESS}::SpoutToken::init`,
      functionArguments: [symbol, name, decimals],
      typeArguments: ["0x1::string::String"], // Use String as phantom type
    };

    try {
      const initTxn = await aptos.transaction.build.simple({ sender: admin.accountAddress, data: initPayload });
      const initSigned = await aptos.sign({ signer: admin, transaction: initTxn });
      const initCommitted = await aptos.transaction.submit.simple({ transaction: initSigned });
      await aptos.waitForTransaction({ transactionHash: initCommitted.hash });
      console.log("✅ Token initialized");
    } catch (e) {
      if (e.message?.includes("RESOURCE_ALREADY_EXISTS") || e.message?.includes("already_exists")) {
        console.log("✅ Token already initialized");
      } else {
        throw e;
      }
    }

    // 4. Check initial supply
    console.log("\n4. Checking initial total supply...");
    const supplyBefore = await aptos.view({
      payload: {
        function: `${MODULE_ADDRESS}::SpoutToken::total_supply`,
        typeArguments: ["0x1::string::String"],
        functionArguments: [],
      }
    });
    console.log("Total supply before mint:", supplyBefore);

    // 5. Mint tokens
    console.log("\n5. Minting 1,000,000 tokens to admin...");
    const mintAmount = 1000000; // 1 million (with 6 decimals = 1 token)
    const mintPayload = {
      function: `${MODULE_ADDRESS}::SpoutToken::mint`,
      functionArguments: [admin.accountAddress.toString(), mintAmount],
      typeArguments: ["0x1::string::String"],
    };

    const mintTxn = await aptos.transaction.build.simple({ sender: admin.accountAddress, data: mintPayload });
    const mintSigned = await aptos.sign({ signer: admin, transaction: mintTxn });
    const mintCommitted = await aptos.transaction.submit.simple({ transaction: mintSigned });
    const mintResult = await aptos.waitForTransaction({ transactionHash: mintCommitted.hash });
    console.log("✅ Minted tokens. Hash:", mintResult.hash);

    // 6. Check balance
    console.log("\n6. Checking admin balance...");
    const balance = await aptos.view({
      payload: {
        function: `${MODULE_ADDRESS}::SpoutToken::balance`,
        typeArguments: ["0x1::string::String"],
        functionArguments: [admin.accountAddress.toString()],
      }
    });
    console.log("Admin balance:", balance[0], "tokens");

    // 7. Check total supply after mint
    console.log("\n7. Checking total supply after mint...");
    const supplyAfter = await aptos.view({
      payload: {
        function: `${MODULE_ADDRESS}::SpoutToken::total_supply`,
        typeArguments: ["0x1::string::String"],
        functionArguments: [],
      }
    });
    console.log("Total supply after mint:", supplyAfter);

    // 8. Mint more tokens
    console.log("\n8. Minting another 500,000 tokens...");
    const mintAmount2 = 500000;
    const mintPayload2 = {
      function: `${MODULE_ADDRESS}::SpoutToken::mint`,
      functionArguments: [admin.accountAddress.toString(), mintAmount2],
      typeArguments: ["0x1::string::String"],
    };

    const mintTxn2 = await aptos.transaction.build.simple({ sender: admin.accountAddress, data: mintPayload2 });
    const mintSigned2 = await aptos.sign({ signer: admin, transaction: mintTxn2 });
    const mintCommitted2 = await aptos.transaction.submit.simple({ transaction: mintSigned2 });
    await aptos.waitForTransaction({ transactionHash: mintCommitted2.hash });
    console.log("✅ Minted additional tokens");

    // 9. Check final state
    console.log("\n9. Final state:");
    const finalBalance = await aptos.view({
      payload: {
        function: `${MODULE_ADDRESS}::SpoutToken::balance`,
        typeArguments: ["0x1::string::String"],
        functionArguments: [admin.accountAddress.toString()],
      }
    });
    const finalSupply = await aptos.view({
      payload: {
        function: `${MODULE_ADDRESS}::SpoutToken::total_supply`,
        typeArguments: ["0x1::string::String"],
        functionArguments: [],
      }
    });

    console.log("Final admin balance:", finalBalance[0], "tokens");
    console.log("Final total supply:", finalSupply);

    console.log("\n✅ All tests passed!");

  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    if (error.transaction) {
      console.error("Transaction:", error.transaction);
    }
    process.exit(1);
  }
})();

