module rwa_addr::orders {
    use std::signer;
    use aptos_framework::event;
    use aptos_framework::account;
    use rwa_addr::kyc_registry;
    use rwa_addr::oracle;

    const E_NOT_VERIFIED: u64 = 0;

    /// Emitted when a buy order is created (price from oracle)
    struct BuyOrderCreated has drop, store {
        user: address,
        ticker: vector<u8>,
        token: address,
        usdc_amount: u128,
        asset_amount: u128,
        price: u128,
        oracle_ts: u64,
    }

    /// Emitted when a sell order is created (price from oracle)
    struct SellOrderCreated has drop, store {
        user: address,
        ticker: vector<u8>,
        token: address,
        usdc_amount: u128,
        asset_amount: u128,
        price: u128,
        oracle_ts: u64,
    }

    struct Events has key {
        admin: address,
        buy_events: event::EventHandle<BuyOrderCreated>,
        sell_events: event::EventHandle<SellOrderCreated>,
    }

    public entry fun init(sender: &signer) {
        let admin = signer::address_of(sender);
        let buy_guid = account::create_guid(sender);
        let sell_guid = account::create_guid(sender);
        move_to(sender, Events {
            admin,
            buy_events: event::new_event_handle_from_account<BuyOrderCreated>(sender),
            sell_events: event::new_event_handle_from_account<SellOrderCreated>(sender),
        });
    }

    /// Buy asset with USDC amount; fetch price from oracle and emit event immediately
    public entry fun buy_asset(sender: &signer, ticker: vector<u8>, token: address, usdc_amount: u128) acquires Events {
        let admin = @rwa_addr;
        let user = signer::address_of(sender);
        assert!(kyc_registry::is_verified(admin, user), E_NOT_VERIFIED);
        let (price, oracle_ts) = oracle::get_price(admin);
        let asset_amount = (usdc_amount * 1000000000000000000u128) / price; // 1e18
        let e = borrow_global_mut<Events>(admin);
        event::emit_event<BuyOrderCreated>(&mut e.buy_events, BuyOrderCreated { user, ticker, token, usdc_amount, asset_amount, price, oracle_ts });
    }

    /// Sell asset for USDC; fetch price from oracle and emit event immediately
    public entry fun sell_asset(sender: &signer, ticker: vector<u8>, token: address, token_amount: u128) acquires Events {
        let admin = @rwa_addr;
        let user = signer::address_of(sender);
        assert!(kyc_registry::is_verified(admin, user), E_NOT_VERIFIED);
        let (price, oracle_ts) = oracle::get_price(admin);
        let usdc_amount = (token_amount * price) / 1000000000000000000u128; // 1e18
        let e = borrow_global_mut<Events>(admin);
        event::emit_event<SellOrderCreated>(&mut e.sell_events, SellOrderCreated { user, ticker, token, usdc_amount, asset_amount: token_amount, price, oracle_ts });
    }
}
