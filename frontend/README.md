# Frontend Integration Guide - SpoutToken USDC & RWA Tokens

## Overview

Your tokens (USDC, LQD, TSLA, AAPL, GOLD) are built on the **Aptos Fungible Asset (FA) standard** and can be accessed from any Aptos wallet in the browser.

## Quick Start

### 1. Install Dependencies

```bash
npm install @aptos-labs/ts-sdk @aptos-labs/wallet-adapter-react
```

### 2. Setup Wallet Provider

```tsx
// app/layout.tsx or _app.tsx
import { AptosWalletAdapterProvider } from '@aptos-labs/wallet-adapter-react';
import { PetraWallet } from "petra-plugin-wallet-adapter";
import { MartianWallet } from "@martianwallet/aptos-wallet-adapter";

export default function RootLayout({ children }) {
  const wallets = [new PetraWallet(), new MartianWallet()];

  return (
    <AptosWalletAdapterProvider plugins={wallets} autoConnect={true}>
      {children}
    </AptosWalletAdapterProvider>
  );
}
```

### 3. Connect Wallet Button

```tsx
import { useWallet } from '@aptos-labs/wallet-adapter-react';

export function ConnectButton() {
  const { connect, disconnect, account, connected } = useWallet();

  return (
    <button onClick={connected ? disconnect : connect}>
      {connected ? `Connected: ${account?.address.slice(0, 6)}...` : 'Connect Wallet'}
    </button>
  );
}
```

## Core Functions

### Check Token Balance

```tsx
import { getTokenBalance, TokenType, formatTokenAmount } from './tokenIntegration';

// Get USDC balance
const balance = await getTokenBalance(userAddress, TokenType.USDC);
const formatted = formatTokenAmount(balance, 6);
console.log(`Balance: ${formatted} USDC`);
```

### Create Buy Order

```tsx
import { createBuyOrder } from './tokenIntegration';

// Buy 10 USDC worth of TSLA
await createBuyOrder(signer, "TSLA", 10_000_000); // 10 USDC (6 decimals)
```

### Transfer Tokens

```tsx
import { transferTokens, TokenType } from './tokenIntegration';

// Transfer 5 USDC to recipient
await transferTokens(
  signer,
  recipientAddress,
  5_000_000, // 5 USDC with 6 decimals
  TokenType.USDC
);
```

## Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_MODULE_ADDRESS=0x55816489757de1d92999dad0629734b877a22455a7fe05e1de36645389646ceb
NEXT_PUBLIC_NETWORK=testnet
```

## Example: Full Dashboard Component

```tsx
import { TokenBalance } from './components/TokenBalance';
import { BuyOrderForm } from './components/BuyOrderForm';
import { ConnectButton } from './components/ConnectButton';

export default function Dashboard() {
  return (
    <div className="dashboard">
      <header>
        <h1>SpoutToken RWA Platform</h1>
        <ConnectButton />
      </header>

      <div className="balances">
        <TokenBalance tokenType={TokenType.USDC} tokenSymbol="USDC" />
        <TokenBalance tokenType={TokenType.LQD} tokenSymbol="LQD" />
        <TokenBalance tokenType={TokenType.TSLA} tokenSymbol="TSLA" />
        <TokenBalance tokenType={TokenType.AAPL} tokenSymbol="AAPL" />
        <TokenBalance tokenType={TokenType.GOLD} tokenSymbol="GOLD" />
      </div>

      <BuyOrderForm />
    </div>
  );
}
```

## Wallet Integration Options

### Option 1: Petra Wallet (Recommended)
- Browser extension
- Most popular Aptos wallet
- [Install Petra](https://petra.app/)

### Option 2: Martian Wallet
- Browser extension + mobile
- Good for testing
- [Install Martian](https://martianwallet.xyz/)

### Option 3: Pontem Wallet
- Browser extension
- Enterprise-focused
- [Install Pontem](https://pontem.network/pontem-wallet)

## View Functions (No Wallet Required)

These can be called without a connected wallet:

```tsx
// Get total supply
const supply = await getTotalSupply(TokenType.USDC);

// Get token metadata
const metadata = await getTokenMetadata(TokenType.USDC);

// Get any user's balance
const balance = await getTokenBalance("0x123...", TokenType.USDC);
```

## Testing on Testnet

1. **Get testnet APT**: https://aptoslabs.com/testnet-faucet
2. **Connect wallet** to testnet
3. **Create buy order** using the form
4. **Backend processes** the order (mints tokens)
5. **View balance** in your wallet

## Key Addresses

- **Module Address**: `0x55816489757de1d92999dad0629734b877a22455a7fe05e1de36645389646ceb`
- **Publisher**: `0xc50c45c8cf451cf262827f258bba2254c94487311c326fa097ce30c39beda4ea`
- **Network**: Testnet

## Token List

| Symbol | Name | Decimals | Type |
|--------|------|----------|------|
| USDC | USD Coin | 6 | Stablecoin |
| LQD | Liquid | 6 | RWA |
| TSLA | Tesla Stock | 6 | RWA |
| AAPL | Apple Stock | 6 | RWA |
| GOLD | Gold | 6 | RWA |

## Important Notes

1. **KYC Required**: Users must be KYC verified to receive/transfer tokens
2. **Admin Minting**: Only admin can mint tokens (after buy order processing)
3. **Events**: Buy/Sell orders emit events for backend processing
4. **Upgradeable**: Contract can be upgraded by admin

## Resources

- [Aptos TypeScript SDK](https://aptos.dev/sdks/ts-sdk/)
- [Wallet Adapter Docs](https://aptos.dev/integration/wallet-adapter-concept/)
- [Fungible Asset Standard](https://aptos.dev/standards/fungible-asset/)
- [Explorer (Testnet)](https://explorer.aptoslabs.com/?network=testnet)

## Support

Your tokens are fully compatible with:
- ✅ Aptos Wallets (Petra, Martian, Pontem)
- ✅ Aptos Explorer
- ✅ DeFi protocols on Aptos
- ✅ Aptos Name Service (ANS)
- ✅ Standard token interfaces

Everything is ready for production! 🚀

