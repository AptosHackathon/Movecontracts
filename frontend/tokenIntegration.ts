/**
 * Frontend Integration for SpoutToken (USDC, LQD, TSLA, etc.)
 * Access tokens from your Aptos wallet in the browser
 */

import { Aptos, AptosConfig, Network, Account } from "@aptos-labs/ts-sdk";

// Configuration
const MODULE_ADDRESS = "0x55816489757de1d92999dad0629734b877a22455a7fe05e1de36645389646ceb";
const PUBLISHER_ADDRESS = "0xc50c45c8cf451cf262827f258bba2254c94487311c326fa097ce30c39beda4ea";

// Initialize Aptos client
const config = new AptosConfig({ network: Network.TESTNET });
const aptos = new Aptos(config);

// Token type markers (matches your Move contract)
export enum TokenType {
  USDC = "u8",  // The generic type parameter
  LQD = "u8",
  TSLA = "u8",
  AAPL = "u8",
  GOLD = "u8"
}

/**
 * Get token balance for a user
 */
export async function getTokenBalance(
  userAddress: string,
  tokenType: TokenType = TokenType.USDC
): Promise<number> {
  try {
    const balance = await aptos.view({
      payload: {
        function: `${MODULE_ADDRESS}::SpoutToken::balance`,
        typeArguments: [tokenType],
        functionArguments: [userAddress]
      }
    });
    
    return Number(balance[0]);
  } catch (error) {
    console.error("Error fetching balance:", error);
    return 0;
  }
}

/**
 * Get token metadata (name, symbol, decimals)
 */
export async function getTokenMetadata(tokenType: TokenType = TokenType.USDC) {
  try {
    const metadata = await aptos.view({
      payload: {
        function: `${MODULE_ADDRESS}::SpoutToken::get_metadata`,
        typeArguments: [tokenType],
        functionArguments: []
      }
    });
    
    return metadata[0];
  } catch (error) {
    console.error("Error fetching metadata:", error);
    return null;
  }
}

/**
 * Get total supply of token
 */
export async function getTotalSupply(tokenType: TokenType = TokenType.USDC): Promise<bigint> {
  try {
    const supply = await aptos.view({
      payload: {
        function: `${MODULE_ADDRESS}::SpoutToken::total_supply`,
        typeArguments: [tokenType],
        functionArguments: []
      }
    });
    
    // Returns Option<u128>, check if Some
    if (supply[0] && supply[0].vec && supply[0].vec.length > 0) {
      return BigInt(supply[0].vec[0]);
    }
    return BigInt(0);
  } catch (error) {
    console.error("Error fetching total supply:", error);
    return BigInt(0);
  }
}

/**
 * Transfer tokens to another user
 * Requires wallet connection (Petra, Martian, etc.)
 */
export async function transferTokens(
  signer: Account,
  recipient: string,
  amount: number,
  tokenType: TokenType = TokenType.USDC
) {
  try {
    const transaction = await aptos.transaction.build.simple({
      sender: signer.accountAddress,
      data: {
        function: `${MODULE_ADDRESS}::SpoutToken::transfer`,
        typeArguments: [tokenType],
        functionArguments: [recipient, amount]
      }
    });

    const committedTxn = await aptos.signAndSubmitTransaction({
      signer,
      transaction
    });

    const executedTransaction = await aptos.waitForTransaction({
      transactionHash: committedTxn.hash
    });

    return executedTransaction;
  } catch (error) {
    console.error("Transfer failed:", error);
    throw error;
  }
}

/**
 * Create a buy order for an asset
 */
export async function createBuyOrder(
  signer: Account,
  ticker: string,
  usdcAmount: number
) {
  try {
    const transaction = await aptos.transaction.build.simple({
      sender: signer.accountAddress,
      data: {
        function: `${MODULE_ADDRESS}::orders::buy_asset`,
        typeArguments: [],
        functionArguments: [
          Buffer.from(ticker).toString('hex'),
          usdcAmount.toString()
        ]
      }
    });

    const committedTxn = await aptos.signAndSubmitTransaction({
      signer,
      transaction
    });

    const executedTransaction = await aptos.waitForTransaction({
      transactionHash: committedTxn.hash
    });

    return executedTransaction;
  } catch (error) {
    console.error("Buy order failed:", error);
    throw error;
  }
}

/**
 * Create a sell order for an asset
 */
export async function createSellOrder(
  signer: Account,
  ticker: string,
  tokenAmount: number
) {
  try {
    const transaction = await aptos.transaction.build.simple({
      sender: signer.accountAddress,
      data: {
        function: `${MODULE_ADDRESS}::orders::sell_asset`,
        typeArguments: [],
        functionArguments: [
          Buffer.from(ticker).toString('hex'),
          tokenAmount.toString()
        ]
      }
    });

    const committedTxn = await aptos.signAndSubmitTransaction({
      signer,
      transaction
    });

    const executedTransaction = await aptos.waitForTransaction({
      transactionHash: committedTxn.hash
    });

    return executedTransaction;
  } catch (error) {
    console.error("Sell order failed:", error);
    throw error;
  }
}

/**
 * Format token amount with decimals
 */
export function formatTokenAmount(amount: number | bigint, decimals: number = 6): string {
  const value = BigInt(amount);
  const divisor = BigInt(10 ** decimals);
  const whole = value / divisor;
  const fraction = value % divisor;
  
  return `${whole}.${fraction.toString().padStart(decimals, '0')}`;
}

/**
 * Parse token amount from decimal string to smallest unit
 */
export function parseTokenAmount(amount: string, decimals: number = 6): bigint {
  const [whole, fraction = ""] = amount.split(".");
  const paddedFraction = fraction.padEnd(decimals, "0").slice(0, decimals);
  return BigInt(whole) * BigInt(10 ** decimals) + BigInt(paddedFraction);
}

// Export for use in components
export { aptos, MODULE_ADDRESS, PUBLISHER_ADDRESS };

