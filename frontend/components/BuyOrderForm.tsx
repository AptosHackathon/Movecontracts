/**
 * React Component: Buy Order Form
 * Create buy orders for RWA tokens
 */

import React, { useState } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { createBuyOrder } from '../tokenIntegration';

const AVAILABLE_TICKERS = ['TSLA', 'AAPL', 'GOLD', 'LQD'];

export const BuyOrderForm: React.FC = () => {
  const { account, signAndSubmitTransaction } = useWallet();
  const [ticker, setTicker] = useState('TSLA');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!account) {
      setError("Please connect your wallet");
      return;
    }

    setLoading(true);
    setError(null);
    setTxHash(null);

    try {
      // Convert USDC amount to smallest unit (6 decimals)
      const usdcAmount = Math.floor(parseFloat(amount) * 1_000_000);
      
      // Create buy order transaction
      const response = await signAndSubmitTransaction({
        data: {
          function: `${process.env.NEXT_PUBLIC_MODULE_ADDRESS}::orders::buy_asset`,
          typeArguments: [],
          functionArguments: [
            Array.from(Buffer.from(ticker)), // Convert ticker to bytes
            usdcAmount.toString()
          ]
        }
      });

      setTxHash(response.hash);
      setAmount('');
      
      // Show success message
      alert(`Buy order created! TX: ${response.hash}`);
      
    } catch (err: any) {
      console.error("Buy order error:", err);
      setError(err.message || "Failed to create buy order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="buy-order-form">
      <h2>Buy RWA Tokens</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Select Asset</label>
          <select 
            value={ticker} 
            onChange={(e) => setTicker(e.target.value)}
            disabled={loading}
          >
            {AVAILABLE_TICKERS.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>USDC Amount</label>
          <input
            type="number"
            step="0.000001"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            disabled={loading}
            required
          />
          <small>Enter amount in USDC</small>
        </div>

        <button type="submit" disabled={loading || !account}>
          {loading ? "Processing..." : "Create Buy Order"}
        </button>
      </form>

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      {txHash && (
        <div className="success-message">
          ✅ Order created! 
          <a 
            href={`https://explorer.aptoslabs.com/txn/${txHash}?network=testnet`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View Transaction
          </a>
        </div>
      )}
    </div>
  );
};

export default BuyOrderForm;

