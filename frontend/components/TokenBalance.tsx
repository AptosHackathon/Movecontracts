/**
 * React Component: Display Token Balance
 * Shows USDC (or any token) balance for connected wallet
 */

import React, { useEffect, useState } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { getTokenBalance, formatTokenAmount, TokenType } from '../tokenIntegration';

interface TokenBalanceProps {
  tokenType?: TokenType;
  tokenSymbol?: string;
  decimals?: number;
}

export const TokenBalance: React.FC<TokenBalanceProps> = ({ 
  tokenType = TokenType.USDC,
  tokenSymbol = "USDC",
  decimals = 6 
}) => {
  const { account, connected } = useWallet();
  const [balance, setBalance] = useState<string>("0");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (connected && account) {
      fetchBalance();
    }
  }, [connected, account]);

  const fetchBalance = async () => {
    if (!account) return;
    
    setLoading(true);
    try {
      const rawBalance = await getTokenBalance(account.address, tokenType);
      const formatted = formatTokenAmount(rawBalance, decimals);
      setBalance(formatted);
    } catch (error) {
      console.error("Error fetching balance:", error);
      setBalance("0");
    } finally {
      setLoading(false);
    }
  };

  if (!connected) {
    return (
      <div className="token-balance">
        <p>Connect wallet to view balance</p>
      </div>
    );
  }

  return (
    <div className="token-balance">
      <div className="balance-label">{tokenSymbol} Balance</div>
      <div className="balance-amount">
        {loading ? "Loading..." : `${balance} ${tokenSymbol}`}
      </div>
      <button onClick={fetchBalance} disabled={loading}>
        Refresh
      </button>
    </div>
  );
};

export default TokenBalance;

