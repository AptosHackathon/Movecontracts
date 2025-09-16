module rwa_addr::orders {
    use std::signer;
    use std::option;
    use std::vector;
    use std::string;
    use aptos_std::table::{Self, Table};
    use ChainlinkDataFeeds::benchmark::{Self as cl_benchmark, Benchmark};
    use aptos_framework::event;
    use aptos_framework::fungible_asset as fa;
    use aptos_framework::object::{Self, Object};
    use aptos_framework::primary_fungible_store as pfs;

    const E_NOT_ADMIN: u64 = 1;
    const E_NOT_ORACLE: u64 = 2;
    const E_ORDER_NOT_FOUND: u64 = 3;

    struct Config has key {
        admin: address,
        oracle: address,
        agent: address,
        usdc_metadata: Object<fa::Metadata>,
        events: Events,
    }

    struct Events has key {
        buy_created: event::EventHandle<BuyOrderCreatedEvent>,
        sell_created: event::EventHandle<SellOrderCreatedEvent>,
        response: event::EventHandle<ResponseEvent>,
        usdc_withdraw: event::EventHandle<USDCWithdrawEvent>,
    }

    struct BuyOrderCreatedEvent has drop, store {
        user: address,
        ticker: vector<u8>,
        token: address,
        usdc_amount: u64,
        asset_amount: u64,
        price: u64,
    }

    struct SellOrderCreatedEvent has drop, store {
        user: address,
        ticker: vector<u8>,
        token: address,
        usdc_amount: u64,
        token_amount: u64,
        price: u64,
    }

    struct ResponseEvent has drop, store {
        request_id: vector<u8>,
        asset: vector<u8>,
        price: u64,
    }

    struct USDCWithdrawEvent has drop, store {
        user: address,
        amount: u64,
    }

    struct PendingBuyOrder has drop, store {
        user: address,
        ticker: vector<u8>,
        token: address,
        usdc_amount: u64,
    }

    struct PendingSellOrder has drop, store {
        user: address,
        ticker: vector<u8>,
        token: address,
        token_amount: u64,
    }

    struct State has key {
        // request_id -> pending buy/sell
        pending_buys: Table<vector<u8>, PendingBuyOrder>,
        pending_sells: Table<vector<u8>, PendingSellOrder>,
        // asset symbol -> last price (scaled)
        asset_to_price: Table<vector<u8>, u64>,
    }

    public entry fun init(sender: &signer, oracle: address, agent: address, usdc_metadata: Object<fa::Metadata>) {
        let admin = signer::address_of(sender);
        let buys_s = event::new_event_handle<BuyOrderCreatedEvent>(sender);
        let sells_s = event::new_event_handle<SellOrderCreatedEvent>(sender);
        let resp_s = event::new_event_handle<ResponseEvent>(sender);
        let wd_s = event::new_event_handle<USDCWithdrawEvent>(sender);
        move_to(sender, Config { admin, oracle, agent, usdc_metadata, events: Events { buy_created: buys_s, sell_created: sells_s, response: resp_s, usdc_withdraw: wd_s } });
        move_to(sender, State { pending_buys: table::new(), pending_sells: table::new(), asset_to_price: table::new() });
    }

    fun assert_admin(sender: &signer) acquires Config {
        let c = borrow_global<Config>(signer::address_of(sender));
        assert!(signer::address_of(sender) == c.admin, E_NOT_ADMIN);
    }

    fun assert_oracle(sender: &signer) acquires Config {
        let c = borrow_global<Config>(signer::address_of(sender));
        assert!(signer::address_of(sender) == c.oracle, E_NOT_ORACLE);
    }

    // User requests a buy. Provide a unique request_id (from off-chain) to correlate the oracle callback.
    public entry fun buy_asset(sender: &signer, request_id: vector<u8>, asset: vector<u8>, ticker: vector<u8>, token: address, usdc_amount: u64) acquires Config, State {
        let cfg = borrow_global<Config>(signer::address_of(sender));
        // move USDC from user to admin escrow
        pfs::transfer(sender, cfg.usdc_metadata, cfg.admin, usdc_amount);
        let st = borrow_global_mut<State>(signer::address_of(sender));
        // store pending buy order under request_id
        if (table::contains(&st.pending_buys, request_id)) { table::remove(&mut st.pending_buys, request_id); };
        table::add(&mut st.pending_buys, request_id, PendingBuyOrder { user: signer::address_of(sender), ticker, token, usdc_amount });
        // Note: off-chain oracle should observe an emitted off-chain event/log; on-chain we just persist state
    }

    // User requests a sell. No token custody change here; fulfillment logic should manage transfer if desired.
    public entry fun sell_asset(sender: &signer, request_id: vector<u8>, asset: vector<u8>, ticker: vector<u8>, token: address, token_amount: u64) acquires State {
        let st = borrow_global_mut<State>(signer::address_of(sender));
        if (table::contains(&st.pending_sells, request_id)) { table::remove(&mut st.pending_sells, request_id); };
        table::add(&mut st.pending_sells, request_id, PendingSellOrder { user: signer::address_of(sender), ticker, token, token_amount });
    }

    // Fetch price from Chainlink Data Feeds using Benchmark feed id and store/update in state.
    // This mirrors the guide's pattern for fetching feed values on Aptos.
    public entry fun fetch_price(sender: &signer, feed_id: vector<u8>) acquires State {
        let benchmark: Benchmark = cl_benchmark::fetch_benchmark(feed_id);
        let price: u256 = cl_benchmark::get_benchmark_value(&benchmark);
        let price_u64: u64 = (price as u64);
        let st = borrow_global_mut<State>(signer::address_of(sender));
        if (table::contains(&st.asset_to_price, feed_id)) { table::remove(&mut st.asset_to_price, feed_id); };
        table::add(&mut st.asset_to_price, feed_id, price_u64);
    }

    // Oracle fulfills price. Emits response and completes buy/sell if present.
    public entry fun fulfill(sender: &signer, request_id: vector<u8>, asset: vector<u8>, price: u64) acquires Config, State {
        assert_oracle(sender);
        let cfg = borrow_global_mut<Config>(signer::address_of(sender));
        let st = borrow_global_mut<State>(signer::address_of(sender));
        // record latest price for asset
        if (table::contains(&st.asset_to_price, asset)) { table::remove(&mut st.asset_to_price, asset); };
        table::add(&mut st.asset_to_price, asset, price);
        event::emit_event<ResponseEvent>(&mut cfg.events.response, ResponseEvent { request_id: request_id, asset: asset, price });

        // handle buy
        if (table::contains(&st.pending_buys, request_id)) {
            let order = table::remove(&mut st.pending_buys, request_id);
            // asset_amount = usdc_amount * 1e18 / price (use u128 to avoid overflow)
            let num: u128 = (order.usdc_amount as u128) * 1000000000000000000u128;
            let asset_amount_u128: u128 = num / (price as u128);
            let asset_amount: u64 = asset_amount_u128 as u64;
            event::emit_event<BuyOrderCreatedEvent>(&mut cfg.events.buy_created, BuyOrderCreatedEvent { user: order.user, ticker: order.ticker, token: order.token, usdc_amount: order.usdc_amount, asset_amount, price });
            return
        };

        // handle sell
        if (table::contains(&st.pending_sells, request_id)) {
            let order = table::remove(&mut st.pending_sells, request_id);
            // usdc_amount = token_amount * price / 1e18
            let num2: u128 = (order.token_amount as u128) * (price as u128);
            let usdc_amount_u128: u128 = num2 / 1000000000000000000u128;
            let usdc_amount: u64 = usdc_amount_u128 as u64;
            event::emit_event<SellOrderCreatedEvent>(&mut cfg.events.sell_created, SellOrderCreatedEvent { user: order.user, ticker: order.ticker, token: order.token, usdc_amount, token_amount: order.token_amount, price });
            return
        };

        // if neither present, ignore (stale or unknown request)
    }

    // Agent withdraws escrowed USDC from admin address
    public entry fun withdraw_usdc(sender: &signer, to: address, amount: u64) acquires Config {
        let cfg = borrow_global_mut<Config>(signer::address_of(sender));
        // only admin or agent can withdraw
        let caller = signer::address_of(sender);
        assert!(caller == cfg.admin || caller == cfg.agent, E_NOT_ADMIN);
        // create a signer for admin is not possible; use transfer from signer (caller) if caller == admin
        // We expect admin to call this function; otherwise this is a no-op
        if (caller == cfg.admin) {
            pfs::transfer(sender, cfg.usdc_metadata, to, amount);
            event::emit_event<USDCWithdrawEvent>(&mut cfg.events.usdc_withdraw, USDCWithdrawEvent { user: caller, amount });
        };
    }

    #[view]
    public fun get_price(publisher: address, asset: vector<u8>): option::Option<u64> acquires State {
        let st = borrow_global<State>(publisher);
        if (table::contains(&st.asset_to_price, asset)) option::some(*table::borrow(&st.asset_to_price, asset)) else option::none<u64>()
    }
}
