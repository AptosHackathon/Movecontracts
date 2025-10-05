const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '../.env' });

const MODULE_PUBLISHER_ACCOUNT_PRIVATE_KEY = process.env.MODULE_PUBLISHER_ACCOUNT_PRIVATE_KEY;
const MODULE_PUBLISHER_ACCOUNT_ADDRESS = "0xc50c45c8cf451cf262827f258bba2254c94487311c326fa097ce30c39beda4ea";

async function deployUSDCContract() {
  console.log("🚀 Deploying USDC Token Contract");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const tempDir = path.join(__dirname, '..', 'contract', 'temp_usdc_token');
  const tempSourcesDir = path.join(tempDir, 'sources');
  const tempMoveTomlPath = path.join(tempDir, 'Move.toml');
  const simpleTokenSourcePath = path.join(__dirname, '..', 'contract', 'sources', 'token', 'simpleToken.move');
  const tempSimpleTokenDestPath = path.join(tempSourcesDir, 'usdcToken.move');

  try {
    // Create temp directory structure
    fs.mkdirSync(tempSourcesDir, { recursive: true });

    // Create a temporary Move.toml for the USDC token
    const moveTomlContent = `[package]
name = "USDCToken"
version = "1.0.0"
authors = []

[addresses]
rwa_addr = "${MODULE_PUBLISHER_ACCOUNT_ADDRESS}"

[dependencies]
AptosFramework = { git = "https://github.com/aptos-labs/aptos-framework.git", rev = "testnet", subdir = "aptos-framework" }`;

    fs.writeFileSync(tempMoveTomlPath, moveTomlContent);

    // Copy and modify the simpleToken.move to usdcToken.move
    let simpleTokenContent = fs.readFileSync(simpleTokenSourcePath, 'utf8');
    
    // Change module name from simpleToken to usdcToken
    simpleTokenContent = simpleTokenContent.replace(
      'module rwa_addr::simpleToken',
      'module rwa_addr::usdcToken'
    );

    fs.writeFileSync(tempSimpleTokenDestPath, simpleTokenContent);

    console.log("📦 Compiling USDC token contract...");
    execSync(`cd ${tempDir} && aptos move compile --override-std testnet`, { stdio: 'inherit' });

    console.log("🚀 Publishing USDC token contract...");
    const deployOutput = execSync(
      `cd ${tempDir} && aptos move publish --override-std testnet --private-key="${MODULE_PUBLISHER_ACCOUNT_PRIVATE_KEY}" --url="https://fullnode.testnet.aptoslabs.com/v1" --assume-yes`,
      { encoding: 'utf8' }
    );

    console.log("✅ USDC token contract deployed successfully!");
    console.log("📋 Deploy output:", deployOutput);

    const moduleAddress = MODULE_PUBLISHER_ACCOUNT_ADDRESS;
    const moduleName = "usdcToken";

    console.log("\n🎉 USDC token contract is ready!");
    console.log(`📍 Module Address: ${moduleAddress}`);
    console.log(`📝 Module Name: ${moduleName}\n`);

    console.log("🔧 Next steps:");
    console.log("1. Initialize USDC token:");
    console.log(`   aptos move run --function-id "${moduleAddress}::${moduleName}::init" --args string:"USDC" string:"USD Coin" u8:6 --private-key="YOUR_PRIVATE_KEY" --url="https://fullnode.testnet.aptoslabs.com/v1" --assume-yes`);
    
    console.log("\n2. Mint USDC to users:");
    console.log(`   aptos move run --function-id "${moduleAddress}::${moduleName}::mint" --args address:USER_ADDRESS u64:AMOUNT --private-key="YOUR_PRIVATE_KEY" --url="https://fullnode.testnet.aptoslabs.com/v1" --assume-yes`);

  } catch (error) {
    console.error("❌ Error deploying USDC token:", error.message);
    process.exit(1);
  } finally {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

deployUSDCContract();
