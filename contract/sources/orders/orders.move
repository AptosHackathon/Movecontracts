module rwa_addr::orders {
    use std::signer;
    use aptos_framework::event;
    use rwa_addr::kyc_registry;
    use rwa_addr::oracle;

    const E_NOT_VERIFIED: u64 = 0;

    /// Emitted when a buy order is created (price from oracle)
    #[event]
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
    #[event]
    struct SellOrderCreated has drop, store {
        user: address,
        ticker: vector<u8>,
        token: address,
        usdc_amount: u128,
        asset_amount: u128,
        price: u128,
        oracle_ts: u64,
    }
    
    public entry fun init(_sender: &signer) { }

    /// Buy asset with USDC amount; fetch price from oracle and emit event immediately
    public entry fun buy_asset(sender: &signer, ticker: vector<u8>, token: address, usdc_amount: u128) {
        let admin = @rwa_addr;
        let user = signer::address_of(sender);
        assert!(kyc_registry::is_verified(admin, user), E_NOT_VERIFIED);
        let (price, oracle_ts) = oracle::get_price(admin);
        let asset_amount = (usdc_amount * 1000000000000000000u128) / price; // 1e18
        event::emit(BuyOrderCreated { user, ticker, token, usdc_amount, asset_amount, price, oracle_ts });
    }

    /// Sell asset for USDC; fetch price from oracle and emit event immediately
    public entry fun sell_asset(sender: &signer, ticker: vector<u8>, token: address, token_amount: u128) {
        let admin = @rwa_addr;
        let user = signer::address_of(sender);
        assert!(kyc_registry::is_verified(admin, user), E_NOT_VERIFIED);
        let (price, oracle_ts) = oracle::get_price(admin);
        let usdc_amount = (token_amount * price) / 1000000000000000000u128; // 1e18
        event::emit(SellOrderCreated { user, ticker, token, usdc_amount, asset_amount: token_amount, price, oracle_ts });
    }
}
