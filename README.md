# Spout Finance - Move Contracts

A comprehensive Move-based smart contract system for tokenized real-world assets (RWAs) on the Aptos blockchain. This project implements a complete trading platform for synthetic assets with KYC verification, multi-oracle price feeds, and order management.

## 🏗️ Project Architecture

```
Movecontracts/
├── contract/           # Move smart contracts
│   ├── sources/
│   │   ├── token/      # Token management contracts
│   │   ├── orders/     # Trading order contracts  
│   │   └── policy/     # Compliance and policy contracts
│   └── tests/          # Move unit tests
├── backend/            # Node.js backend services
├── scripts/            # Utility scripts for blockchain interaction
└── config/             # Configuration files
```

## 🚀 Core Features

### 📈 **Multi-Asset Trading Platform**
- Support for multiple synthetic assets: LQD, TSLA, AAPL, GOLD, BTC, ETH
- Real-time price feeds via custom multi-oracle system
- Buy/sell order execution with automatic price discovery

### 🔐 **KYC & Compliance**
- Built-in KYC registry for user verification
- DFA (Digital Financial Assets) policy compliance
- Admin-controlled access management

### 💰 **Token Management**
- Fungible Asset (FA) standard implementation
- Multi-token support (USD, USDC, USDT, and synthetic assets)
- Mint/burn capabilities with proper access controls

### 🎯 **Oracle Integration**
- Multi-oracle system for price aggregation
- Pyth Network integration (configurable)
- Custom price feed management

## 📋 Smart Contract Modules

### Token Contracts (`sources/token/`)
- **`spoutTokenV2.move`** - Main token implementation using Aptos FA standard
- **`kyc_registry.move`** - User verification and compliance tracking
- **`spoutToken.move`** - Legacy token implementation

### Order Management (`sources/orders/`)
- **`orders.move`** - Core trading logic for buy/sell orders
- **`multi_oracle.move`** - Multi-asset price oracle system
- **`pyth_oracle.move`** - Pyth Network integration
- **`oracle.move`** - Base oracle functionality

### Policy & Compliance (`sources/policy/`)
- **`dfa_policy.move`** - Digital Financial Asset compliance policies

## 🛠️ Setup & Installation

### Prerequisites
- [Aptos CLI](https://aptos.dev/tools/install-cli/)
- Node.js (v16+)
- Move compiler

### 1. Install Dependencies
```bash
# Install Aptos CLI
curl -fsSL "https://aptos.dev/scripts/install_cli.py" | python3

# Install Node.js dependencies for backend services
cd backend && npm install
```

### 2. Configure Network
Edit `contract/Move.toml` to set your deployment addresses:
```toml
[addresses]
rwa_addr = "YOUR_DEPLOYMENT_ADDRESS"
deployer = "YOUR_DEPLOYER_ADDRESS"
```

### 3. Compile Contracts
```bash
cd contract
aptos move compile
```

### 4. Run Tests
```bash
cd contract  
aptos move test
```

## 🚀 Deployment

### Testnet Deployment
```bash
cd contract
aptos move publish --profile testnet
```

### Initialize Contracts
```bash
# Initialize KYC registry
aptos move run --function-id "rwa_addr::kyc_registry::init"

# Initialize multi-oracle
aptos move run --function-id "rwa_addr::multi_oracle::init"

# Initialize tokens
aptos move run --function-id "rwa_addr::SpoutTokenV2::init<rwa_addr::SpoutTokenV2::USDC>" \
  --args string:"USDC" string:"USD Coin" u8:6
```

## 📊 Backend Services

### Event Monitoring
```bash
# Listen to real-time events
node backend/event_listener.js

# Fetch specific transaction events
node backend/fetch_events.js tx <transaction_hash>

# Query all recent events
node backend/query_all_events.js
```

### Price Feed Management
```bash
# Sync Pyth prices to oracle
node backend/sync_pyth_to_oracle.js

# Manual price updates
node scripts/update_pyth_price.js
```

### Balance & Order Queries
```bash
# Check user balances
node scripts/test_balance.js

# Get recent orders
./scripts/get_recent_orders.sh
```

## 🔧 Available Scripts

| Script | Description |
|--------|-------------|
| `scripts/test_balance.js` | Check token balances for addresses |
| `scripts/check_all_balances.js` | Comprehensive balance checker |
| `scripts/listen_events.js` | Real-time event monitoring |
| `backend/fetch_events.js` | Transaction event fetching |
| `backend/pyth_price_feeder.js` | Pyth price feed integration |

## 📝 Usage Examples

### Creating a Buy Order
```bash
aptos move run --function-id "rwa_addr::orders::create_buy_order" \
  --args string:"LQD" u128:1000000000 # Buy $1000 worth of LQD
```

### Adding Price Feeds
```bash
aptos move run --function-id "rwa_addr::multi_oracle::push_price" \
  --args string:"AAPL" u128:150000000 u64:1696320000 # $150.00 AAPL
```

### KYC Verification
```bash
aptos move run --function-id "rwa_addr::kyc_registry::verify_user" \
  --args address:0x... # Verify user address
```

## 🌐 Network Configuration

### Testnet Addresses
- **Contract Address**: `0xf21ca0578f286a0ce5e9f43eab0387a9b7ee1b9ffd1f4634a772d415561fa0fd`
- **Wormhole**: `0x5bc11445584a763c1fa7ed39081f1b920954da14e04b32440cba863d03e19625`
- **Pyth Oracle**: `0x7e783b349d3e89cf5931af376ebeadbfab855b3fa239b7ada8f5a92fbea6b387`

## 🔍 Event Monitoring

The system emits detailed events for all trading activities:

- **`BuyOrderCreated`** - When users create buy orders
- **`SellOrderCreated`** - When users create sell orders  
- **`PriceUpdated`** - When oracle prices are updated
- **`UserVerified`** - When KYC verification occurs

## 🧪 Testing

### Running Unit Tests
```bash
cd contract
aptos move test --filter "test_"
```

### Integration Testing
```bash
# Test full order flow
node scripts/test_all_balances.js

# Test oracle integration
node backend/fetch_pyth_prices.js
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in this repository
- Check the backend README for event fetching troubleshooting
- Review the Move.toml configuration for network setup
