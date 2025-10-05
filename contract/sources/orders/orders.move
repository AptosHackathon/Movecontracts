module rwa_addr::orders {
    use std::signer;
    use aptos_framework::event::{Self, EventHandle};
    use aptos_framework::account;
    use rwa_addr::kyc_registry;
    use rwa_addr::oracle;
    use rwa_addr::multi_oracle;
    use rwa_addr::simpleToken;
    // use rwa_addr::pyth_oracle;

    const E_NOT_VERIFIED: u64 = 0;
    
    // Publisher address where KYC/Oracle are initialized (hardcoded for now)
    const ADMIN_ADDR: address = @0xc50c45c8cf451cf262827f258bba2254c94487311c326fa097ce30c39beda4ea;

    /// Helper function to get price based on ticker
    /// NOTE: For testnet, Pyth is disabled (using our own custom multi-asset oracle)
    fun get_oracle_price(ticker: vector<u8>): (u128, u64) {
        // TESTNET: Use multi-asset oracle (supports LQD, BTC, AAPL, etc!)
        multi_oracle::get_price(ADMIN_ADDR, ticker)
        
        // Pyth is disabled for now, but can be uncommented if on mainnet to fetch asset price from Pyth
        // if (ticker == b"LQD") { return pyth_oracle::get_lqd_price() }
        // else if (ticker == b"BTC") { return pyth_oracle::get_btc_price() }
        // else if (ticker == b"ETH") { return pyth_oracle::get_eth_price() }
        // else if (ticker == b"AAPL") { return pyth_oracle::get_aapl_price() }
        // else if (ticker == b"TSLA") { return pyth_oracle::get_tsla_price() }
        // else if (ticker == b"GOLD") { return pyth_oracle::get_gold_price() }
        // else { multi_oracle::get_price(ADMIN_ADDR, ticker) }
    }

    /// Emitted when a buy order is created (price from oracle)
    #[event]
    struct BuyOrderCreated has drop, store {
        user: address,
        ticker: vector<u8>,
        usdc_amount: u128,
        asset_amount: u128,
        price: u128,
        oracle_ts: u64,
    }

    /// Emitted when a sell order is created (price from oracle)
    #[event]
    struct SellOrderCreated has drop, store {
        user: address,
        ticker: vector<u8>,
        usdc_amount: u128,
        asset_amount: u128,
        price: u128,
        oracle_ts: u64,
    }

    /// Resource group to store event handles (old style - for direct querying)
    struct OrderEvents has key {
        buy_order_events: EventHandle<BuyOrderCreated>,
        sell_order_events: EventHandle<SellOrderCreated>,
    }
    
    public entry fun init(sender: &signer) {
        let sender_addr = signer::address_of(sender);
        if (!exists<OrderEvents>(sender_addr)) {
            move_to(sender, OrderEvents {
                buy_order_events: account::new_event_handle<BuyOrderCreated>(sender),
                sell_order_events: account::new_event_handle<SellOrderCreated>(sender),
            });
        }
    }

    /// Buy asset with USDC amount; fetch price from Pyth or custom oracle based on ticker
    public entry fun buy_asset(sender: &signer, ticker: vector<u8>, usdc_amount: u128) acquires OrderEvents {
        let user = signer::address_of(sender);
        
        // Check KYC verification at the publisher address where KYC registry was initialized
        assert!(kyc_registry::is_verified(ADMIN_ADDR, user), E_NOT_VERIFIED);
        
        // Deposit USDC from regularToken to the orders contract
        let usdc_amount_u64 = (usdc_amount as u64);
        simpleToken::deposit(sender, @rwa_addr, usdc_amount_u64);
        
        // Get price from appropriate oracle based on ticker
        let (price, oracle_ts) = get_oracle_price(ticker);
    
        let asset_amount = (usdc_amount * 1000000000000u128) / price; 
        
        // Emit modern event (for transaction-based querying)
        event::emit(BuyOrderCreated { user, ticker, usdc_amount, asset_amount, price, oracle_ts });
        
        // Also emit to EventHandle (for direct event querying)
        let events = borrow_global_mut<OrderEvents>(ADMIN_ADDR);
        event::emit_event(&mut events.buy_order_events, 
            BuyOrderCreated { user, ticker, usdc_amount, asset_amount, price, oracle_ts });
    }

    /// Sell asset for USDC; fetch price from Pyth or custom oracle based on ticker
    public entry fun sell_asset(sender: &signer, ticker: vector<u8>, token_amount: u128) acquires OrderEvents {
        let user = signer::address_of(sender);
        
        // Check KYC verification at the publisher address where KYC registry was initialized
        assert!(kyc_registry::is_verified(ADMIN_ADDR, user), E_NOT_VERIFIED);
        
        // Get price from appropriate oracle based on ticker
        let (price, oracle_ts) = get_oracle_price(ticker);
        // Reverse calculation: asset_amount has 6 decimals, price has 6 decimals (micro USD)
        // Formula: (asset_amount * price) / 1e6 = usdc_amount with 6 decimals
        // Example: (8953353 * 111690000) / 1000000 = 999999996 (represents 999.999996 USDC)
        let usdc_amount = (token_amount * price) / 1000000u128;
        
        // Emit modern event (for transaction-based querying)
        event::emit(SellOrderCreated { user, ticker, usdc_amount, asset_amount: token_amount, price, oracle_ts });
        
        // Also emit to EventHandle (for direct event querying)
        let events = borrow_global_mut<OrderEvents>(ADMIN_ADDR);
        event::emit_event(&mut events.sell_order_events,
            SellOrderCreated { user, ticker, usdc_amount, asset_amount: token_amount, price, oracle_ts });
    }
}
