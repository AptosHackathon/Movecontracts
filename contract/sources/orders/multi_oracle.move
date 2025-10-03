module rwa_addr::multi_oracle {
    use std::signer;
    use std::string::{Self, String};
    use aptos_std::table::{Self, Table};

    const E_NOT_ADMIN: u64 = 0;
    const E_NOT_FEEDER: u64 = 1;

    /// Price data for a single asset
    struct PriceData has store, drop, copy {
        price_micro_usd: u128,
        last_updated_ts: u64,
    }

    /// Multi-asset oracle config
    struct MultiConfig has key {
        admin: address,
        feeders: Table<address, bool>,
        prices: Table<String, PriceData>,
    }

    public entry fun init(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        move_to(admin, MultiConfig { 
            admin: admin_addr, 
            feeders: table::new(), 
            prices: table::new(),
        });
    }
 
    fun assert_admin(s: &signer) acquires MultiConfig {
        let c = borrow_global<MultiConfig>(signer::address_of(s));
        assert!(c.admin == signer::address_of(s), E_NOT_ADMIN);
    }

    public entry fun add_feeder(admin: &signer, feeder: address) acquires MultiConfig {
        assert_admin(admin);
        let c = borrow_global_mut<MultiConfig>(signer::address_of(admin));
        if (table::contains(&c.feeders, feeder)) { table::remove(&mut c.feeders, feeder); };
        table::add(&mut c.feeders, feeder, true);
    }

    public entry fun remove_feeder(admin: &signer, feeder: address) acquires MultiConfig {
        assert_admin(admin);
        let c = borrow_global_mut<MultiConfig>(signer::address_of(admin));
        if (table::contains(&c.feeders, feeder)) { table::remove(&mut c.feeders, feeder); };
    }

    /// Push price for a specific ticker
    public entry fun push_price(feeder: &signer, ticker: vector<u8>, price_micro_usd: u128, timestamp_secs: u64) acquires MultiConfig {
        let admin = signer::address_of(feeder);
        let c = borrow_global_mut<MultiConfig>(admin);
        let f = signer::address_of(feeder);
        assert!(table::contains(&c.feeders, f), E_NOT_FEEDER);
        
        let ticker_str = string::utf8(ticker);
        let price_data = PriceData { price_micro_usd, last_updated_ts: timestamp_secs };
        
        // Update or insert price
        if (table::contains(&c.prices, ticker_str)) {
            *table::borrow_mut(&mut c.prices, ticker_str) = price_data;
        } else {
            table::add(&mut c.prices, ticker_str, price_data);
        };
    }

    /// Get price for a specific ticker
    #[view]
    public fun get_price(admin: address, ticker: vector<u8>): (u128, u64) acquires MultiConfig {
        let c = borrow_global<MultiConfig>(admin);
        let ticker_str = string::utf8(ticker);
        
        if (table::contains(&c.prices, ticker_str)) {
            let price_data = table::borrow(&c.prices, ticker_str);
            (price_data.price_micro_usd, price_data.last_updated_ts)
        } else {
            // Return default price if ticker not found (0, 0)
            (0u128, 0u64)
        }
    }
}

