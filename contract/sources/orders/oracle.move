module rwa_addr::oracle {
    use std::signer;
    use aptos_std::table::{Self, Table};

    const E_NOT_ADMIN: u64 = 0;
    const E_NOT_FEEDER: u64 = 1;

    struct Config has key {
        admin: address,
        feeders: Table<address, bool>,
        // price in micro USD per unit (e.g., price of 1 SPT in micro USD)
        price_micro_usd: u128,
        // unix timestamp seconds of last update
        last_updated_ts: u64,
    }

    public entry fun init(admin: &signer, initial_price_micro_usd: u128) {
        let admin_addr = signer::address_of(admin);
        move_to(admin, Config { admin: admin_addr, feeders: table::new(), price_micro_usd: initial_price_micro_usd, last_updated_ts: 0 });
    }
 
    fun assert_admin(s: &signer) acquires Config {
        let c = borrow_global<Config>(signer::address_of(s));
        assert!(c.admin == signer::address_of(s), E_NOT_ADMIN);
    }

    public entry fun add_feeder(admin: &signer, feeder: address) acquires Config {
        assert_admin(admin);
        let c = borrow_global_mut<Config>(signer::address_of(admin));
        if (table::contains(&c.feeders, feeder)) { table::remove(&mut c.feeders, feeder); };
        table::add(&mut c.feeders, feeder, true);
    }

    public entry fun remove_feeder(admin: &signer, feeder: address) acquires Config {
        assert_admin(admin);
        let c = borrow_global_mut<Config>(signer::address_of(admin));
        if (table::contains(&c.feeders, feeder)) { table::remove(&mut c.feeders, feeder); };
    }

    public entry fun push_price(feeder: &signer, price_micro_usd: u128, timestamp_secs: u64) acquires Config {
        let admin = @rwa_addr;
        let c = borrow_global_mut<Config>(admin);
        let f = signer::address_of(feeder);
        assert!(table::contains(&c.feeders, f), E_NOT_FEEDER);
        c.price_micro_usd = price_micro_usd;
        c.last_updated_ts = timestamp_secs;
    }

    #[view]
    public fun get_price(admin: address): (u128, u64) acquires Config {
        let c = borrow_global<Config>(admin);
        (c.price_micro_usd, c.last_updated_ts)
    }
}
