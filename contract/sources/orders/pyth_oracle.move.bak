module rwa_addr::pyth_oracle {
    use pyth::pyth;
    use pyth::price::{Self, Price};
    use pyth::price_identifier::{Self, PriceIdentifier};
    use pyth::i64::{Self, I64};
    use aptos_framework::coin;

    // Error codes
    const E_STALE_PRICE: u64 = 1;
    const E_INVALID_PRICE: u64 = 2;
    const E_NEGATIVE_PRICE: u64 = 3;

    // Pyth price feed IDs for different assets
    
    /// Get BTC/USD price feed ID
    public fun btc_usd_price_id(): vector<u8> {
        x"e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43"
    }

    /// Get ETH/USD price feed ID
    public fun eth_usd_price_id(): vector<u8> {
        x"ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace"
    }

    /// Get USDC/USD price feed ID
    public fun usdc_usd_price_id(): vector<u8> {
        x"eaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a"
    }

    /// Get AAPL stock price feed ID
    public fun aapl_usd_price_id(): vector<u8> {
        x"49f6b65cb1de6b10eaf75e7c03ca029c306d0357e91b5311b175084a5ad55688"
    }

    /// Get TSLA stock price feed ID  
    public fun tsla_usd_price_id(): vector<u8> {
        x"16dad506d7db8da01c87581c87ca897a012a153557d4d578c3b9c9e1bc0632f1"
    }

    /// Get GOLD price feed ID
    public fun gold_usd_price_id(): vector<u8> {
        x"765d2ba906dbc32ca17cc11f5310a89e9ee1f6420508c63861f2f8ba4ee34bb2"
    }

    /// Get LQD price feed ID (iShares iBoxx Investment Grade Corp Bond ETF)
    public fun lqd_usd_price_id(): vector<u8> {
        x"e4ff71a60c3d5d5d37c1bba559c2e92745c1501ebd81a97d150cf7cd5119aa9c"
    }

    // NEW: Functions with price updates (following Pyth official pattern)
    
    /// Get LQD/USD price with price update
    /// pyth_price_update: Price update data from Hermes (https://hermes.pyth.network)
    public fun get_lqd_price_with_update(user: &signer, pyth_price_update: vector<vector<u8>>): Price {
        // First update the Pyth price feeds
        let coins = coin::withdraw<aptos_framework::aptos_coin::AptosCoin>(user, pyth::get_update_fee(&pyth_price_update));
        pyth::update_price_feeds(pyth_price_update, coins);

        // Read the current price from the LQD price feed
        let lqd_price_identifier = lqd_usd_price_id();
        let lqd_usd_price_id = price_identifier::from_byte_vec(lqd_price_identifier);
        pyth::get_price(lqd_usd_price_id)
    }
    
    /// Update LQD price on-chain (entry function version)
    public entry fun update_lqd_price(user: &signer, pyth_price_update: vector<vector<u8>>) {
        let _price = get_lqd_price_with_update(user, pyth_price_update);
        // Price is now updated on-chain, can be queried via view function
    }

    /// Get BTC/USD price with price update
    public fun get_btc_price_with_update(user: &signer, pyth_price_update: vector<vector<u8>>): Price {
        let coins = coin::withdraw<aptos_framework::aptos_coin::AptosCoin>(user, pyth::get_update_fee(&pyth_price_update));
        pyth::update_price_feeds(pyth_price_update, coins);

        let btc_price_identifier = btc_usd_price_id();
        let btc_usd_price_id = price_identifier::from_byte_vec(btc_price_identifier);
        pyth::get_price(btc_usd_price_id)
    }

    /// Get AAPL/USD price with price update
    public fun get_aapl_price_with_update(user: &signer, pyth_price_update: vector<vector<u8>>): Price {
        let coins = coin::withdraw<aptos_framework::aptos_coin::AptosCoin>(user, pyth::get_update_fee(&pyth_price_update));
        pyth::update_price_feeds(pyth_price_update, coins);

        let aapl_price_identifier = aapl_usd_price_id();
        let aapl_usd_price_id = price_identifier::from_byte_vec(aapl_price_identifier);
        pyth::get_price(aapl_usd_price_id)
    }

    // OLD: Keep these for backwards compatibility (deprecated - will abort without price updates)
    
    /// Get price from Pyth for a given price feed ID
    /// Returns (price_in_micro_usd, timestamp_secs)
    /// DEPRECATED: Use get_*_price_with_update functions instead
    #[view]
    public fun get_pyth_price(price_feed_id: vector<u8>): (u128, u64) {
        let price_identifier = price_identifier::from_byte_vec(price_feed_id);
        let price_struct = pyth::get_price_unsafe(price_identifier);
        price_to_micro_usd(&price_struct)
    }

    #[view]
    public fun get_btc_price(): (u128, u64) {
        get_pyth_price(btc_usd_price_id())
    }

    #[view]
    public fun get_eth_price(): (u128, u64) {
        get_pyth_price(eth_usd_price_id())
    }

    #[view]
    public fun get_usdc_price(): (u128, u64) {
        get_pyth_price(usdc_usd_price_id())
    }

    #[view]
    public fun get_aapl_price(): (u128, u64) {
        get_pyth_price(aapl_usd_price_id())
    }

    #[view]
    public fun get_tsla_price(): (u128, u64) {
        get_pyth_price(tsla_usd_price_id())
    }

    #[view]
    public fun get_gold_price(): (u128, u64) {
        get_pyth_price(gold_usd_price_id())
    }

    #[view]
    public fun get_lqd_price(): (u128, u64) {
        get_pyth_price(lqd_usd_price_id())
    }

    /// Helper: Convert Pyth Price to micro USD (u128, u64)
    /// Returns (price_in_micro_usd, timestamp_secs)
    public fun price_to_micro_usd(price_struct: &Price): (u128, u64) {
        // Extract price data
        let price_i64 = price::get_price(price_struct);
        let expo_i64 = price::get_expo(price_struct);
        let timestamp = price::get_timestamp(price_struct);
        
        // Convert I64 price to u128
        assert!(!i64::get_is_negative(&price_i64), E_NEGATIVE_PRICE);
        let price_value = i64::get_magnitude_if_positive(&price_i64);
        
        // Get exponent (typically negative like -8)
        let expo_negative = i64::get_is_negative(&expo_i64);
        let expo_magnitude = if (expo_negative) {
            i64::get_magnitude_if_negative(&expo_i64)
        } else {
            i64::get_magnitude_if_positive(&expo_i64)
        };
        
        // Convert price to micro USD (6 decimals)
        let price_micro_usd = normalize_price(price_value, expo_magnitude, expo_negative);
        
        (price_micro_usd, timestamp)
    }

    /// Normalize Pyth price to micro USD
    /// Pyth returns price as: actual_price = price_value * 10^expo
    /// We want micro USD = actual_price * 10^6
    fun normalize_price(value: u64, expo_magnitude: u64, expo_negative: bool): u128 {
        let value_u128 = (value as u128);
        
        if (expo_negative) {
            // Most common case: expo is negative (e.g., -8 for BTC/USD)
            // actual_price = value * 10^(-expo_magnitude)
            // micro_usd = actual_price * 10^6 = value * 10^(6 - expo_magnitude)
            
            if (expo_magnitude > 6) {
                // e.g., expo = -8, we need to divide by 10^2
                let divisor = pow10(expo_magnitude - 6);
                value_u128 / divisor
            } else if (expo_magnitude < 6) {
                // e.g., expo = -4, we need to multiply by 10^2
                let multiplier = pow10(6 - expo_magnitude);
                value_u128 * multiplier
            } else {
                // expo = -6, perfect match
                value_u128
            }
        } else {
            // Rare case: positive exponent
            // actual_price = value * 10^expo_magnitude
            // micro_usd = value * 10^expo_magnitude * 10^6 = value * 10^(expo_magnitude + 6)
            let multiplier = pow10(expo_magnitude + 6);
            value_u128 * multiplier
        }
    }

    /// Helper: Calculate 10^n
    fun pow10(n: u64): u128 {
        let result = 1u128;
        let i = 0u64;
        while (i < n) {
            result = result * 10u128;
            i = i + 1;
        };
        result
    }

    /// Check if price is fresh (within max_age seconds)
    public fun is_price_fresh(timestamp: u64, max_age_secs: u64): bool {
        let now = aptos_framework::timestamp::now_seconds();
        (now - timestamp) <= max_age_secs
    }
}
