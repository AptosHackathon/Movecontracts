/**
 * Calculate USD value of tokens
 */

import { getTotalSupply, TokenType } from '../tokenIntegration';

// Price feeds for different tokens
interface TokenPrices {
  USDC: number;  // Always $1
  LQD: number;   // Your platform's pricing
  TSLA: number;  // Tesla stock price
  AAPL: number;  // Apple stock price
  GOLD: number;  // Gold price per ounce
}

/**
 * Get current token prices (you'd fetch these from your oracle/API)
 */
export async function getTokenPrices(): Promise<TokenPrices> {
  // In production, fetch from your oracle or price API
  // For now, using example prices
  return {
    USDC: 1.0,      // Stablecoin = $1
    LQD: 1.0,       // Platform token
    TSLA: 250.00,   // Tesla stock
    AAPL: 180.00,   // Apple stock
    GOLD: 2000.00   // Gold per oz
  };
}

/**
 * Calculate USD value for a token amount
 */
export function calculateUsdValue(
  tokenAmount: bigint,
  decimals: number,
  pricePerToken: number
): number {
  const divisor = BigInt(10 ** decimals);
  const tokens = Number(tokenAmount) / Number(divisor);
  return tokens * pricePerToken;
}

/**
 * Get total supply USD value for a token
 */
export async function getTotalSupplyUsdValue(
  tokenType: TokenType,
  decimals: number = 6
): Promise<{ tokens: number; usdValue: number }> {
  
  // Get total supply
  const totalSupply = await getTotalSupply(tokenType);
  
  // Get current price
  const prices = await getTokenPrices();
  const tokenSymbol = tokenType as keyof TokenPrices;
  const pricePerToken = prices[tokenSymbol] || 0;
  
  // Calculate
  const tokens = Number(totalSupply) / (10 ** decimals);
  const usdValue = tokens * pricePerToken;
  
  return {
    tokens,
    usdValue
  };
}

/**
 * Get portfolio USD value (all tokens combined)
 */
export async function getTotalPortfolioValue(): Promise<{
  breakdown: Record<string, { tokens: number; usdValue: number }>;
  totalUsd: number;
}> {
  const tokens: TokenType[] = [
    TokenType.USDC,
    TokenType.LQD,
    TokenType.TSLA,
    TokenType.AAPL,
    TokenType.GOLD
  ];
  
  const breakdown: Record<string, { tokens: number; usdValue: number }> = {};
  let totalUsd = 0;
  
  for (const token of tokens) {
    const value = await getTotalSupplyUsdValue(token);
    breakdown[token] = value;
    totalUsd += value.usdValue;
  }
  
  return {
    breakdown,
    totalUsd
  };
}

/**
 * Format USD value with proper currency formatting
 */
export function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

export default {
  getTokenPrices,
  calculateUsdValue,
  getTotalSupplyUsdValue,
  getTotalPortfolioValue,
  formatUsd
};

