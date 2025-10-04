#!/usr/bin/env node

const { execSync } = require('child_process');
require('dotenv').config();

const MODULE_PUBLISHER_ACCOUNT_PRIVATE_KEY = process.env.MODULE_PUBLISHER_ACCOUNT_PRIVATE_KEY;

async function deploySimpleToken() {
  console.log("🚀 Deploying Simple Token Contract");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  try {
    // Create a temporary Move.toml for the simple token
    const moveTomlContent = `[package]
name = "SimpleToken"
version = "1.0.0"
authors = []

[addresses]
rwa_addr = "0xc50c45c8cf451cf262827f258bba2254c94487311c326fa097ce30c39beda4ea"

[dependencies]
AptosFramework = { git = "https://github.com/aptos-labs/aptos-framework.git", rev = "testnet", subdir = "aptos-framework" }`;

    // Write temporary Move.toml
    const fs = require('fs');
    const path = require('path');
    const tempDir = path.join(__dirname, '..', 'contract', 'temp_simple_token');
    
    // Create temp directory
    execSync(`mkdir -p ${tempDir}/sources`, { stdio: 'inherit' });
    
    // Write Move.toml
    fs.writeFileSync(path.join(tempDir, 'Move.toml'), moveTomlContent);
    
    // Copy the regularToken.move file
    execSync(`cp ${path.join(__dirname, '..', 'contract', 'sources', 'token', 'regularToken.move')} ${tempDir}/sources/simpleToken.move`, { stdio: 'inherit' });

    console.log("📦 Compiling simple token contract...");
    
    // Compile
    execSync(`cd ${tempDir} && aptos move compile --override-std testnet`, { stdio: 'inherit' });

    console.log("🚀 Publishing simple token contract...");
    
    // Deploy
    const deployOutput = execSync(
      `cd ${tempDir} && aptos move publish --override-std testnet --private-key="${MODULE_PUBLISHER_ACCOUNT_PRIVATE_KEY}" --url="https://fullnode.testnet.aptoslabs.com/v1" --assume-yes`,
      { encoding: 'utf8' }
    );

    console.log("✅ Simple token contract deployed successfully!");
    console.log("📋 Deploy output:", deployOutput);

    // Clean up temp directory
    execSync(`rm -rf ${tempDir}`, { stdio: 'inherit' });

    return true;

  } catch (error) {
    console.error("❌ Error deploying simple token:", error.message);
    return false;
  }
}

// Main execution
async function main() {
  if (!MODULE_PUBLISHER_ACCOUNT_PRIVATE_KEY) {
    console.error("❌ MODULE_PUBLISHER_ACCOUNT_PRIVATE_KEY not found in .env file");
    process.exit(1);
  }

  const success = await deploySimpleToken();
  if (success) {
    console.log("\n🎉 Simple token contract is ready!");
    console.log("📍 Module Address: 0xc50c45c8cf451cf262827f258bba2254c94487311c326fa097ce30c39beda4ea");
    console.log("📝 Module Name: simpleToken");
  } else {
    process.exit(1);
  }
}

main();
