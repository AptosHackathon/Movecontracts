module rwa_addr::reserves {
    use std::signer;
    use std::option;
    use std::vector;
    use std::string::{Self, String};
    use aptos_std::table::{Self, Table};
    use aptos_framework::event;

    const E_NOT_ADMIN: u64 = 1;
    const E_NOT_ORACLE: u64 = 2;
    const E_UNEXPECTED_REQUEST: u64 = 3;
    const E_INVALID_SOURCE: u64 = 4;

    // Configuration: set once at init
    struct Config has key {
        admin: address,
        oracle: address,
        events: Events,
        // Default sources that can be used
        allowed_sources: vector<String>,
    }

    // Request specification similar to Chainlink
    struct RequestSpec has store, drop, copy {
        source_url: String,           // API endpoint
        path: String,                 // JSON path extraction (e.g., "result.totalReserves")
        multiplier: u64,              // Scale factor (e.g., 1000000 for 6 decimals)
        job_id: String,              // Optional job identifier
        additional_params: vector<u8>, // Encoded additional parameters
    }

    // Global state
    struct State has key {
        total_reserves_6dp: u64,
        request_to_user: Table<vector<u8>, address>,
        request_to_spec: Table<vector<u8>, RequestSpec>, // Store request specifications
        request_to_error: Table<vector<u8>, vector<u8>>,
        request_to_response: Table<vector<u8>, vector<u8>>,
        // Track data sources and their reliability
        source_success_count: Table<String, u64>,
        source_total_count: Table<String, u64>,
    }

    // Events
    struct Events has key {
        reserves_requested: event::EventHandle<ReservesRequested>,
        reserves_updated: event::EventHandle<ReservesUpdated>,
        source_added: event::EventHandle<SourceAdded>,
    }

    struct ReservesRequested has drop, store {
        request_id: vector<u8>,
        user: address,
        source_url: String,
        job_id: String,
    }

    struct ReservesUpdated has drop, store {
        request_id: vector<u8>,
        user: address,
        reserves_6dp: u64,
        source_url: String,
        success: bool,
    }

    struct SourceAdded has drop, store {
        source_url: String,
        admin: address,
    }

    public entry fun init(sender: &signer, oracle: address) {
        let admin = signer::address_of(sender);
        move_to(sender, Config {
            admin,
            oracle,
            allowed_sources: vector::empty<String>(),
            events: Events {
                reserves_requested: event::new_event_handle<ReservesRequested>(sender),
                reserves_updated: event::new_event_handle<ReservesUpdated>(sender),
                source_added: event::new_event_handle<SourceAdded>(sender),
            },
        });
        move_to(sender, State {
            total_reserves_6dp: 0,
            request_to_user: table::new(),
            request_to_spec: table::new(),
            request_to_error: table::new(),
            request_to_response: table::new(),
            source_success_count: table::new(),
            source_total_count: table::new(),
        });
    }

    fun assert_admin(sender: &signer, config_addr: address) acquires Config {
        let c = borrow_global<Config>(config_addr);
        assert!(signer::address_of(sender) == c.admin, E_NOT_ADMIN);
    }

    fun assert_oracle(sender: &signer, config_addr: address) acquires Config {
        let c = borrow_global<Config>(config_addr);
        assert!(signer::address_of(sender) == c.oracle, E_NOT_ORACLE);
    }

    // Admin adds allowed data sources
    public entry fun add_source(sender: &signer, contract_addr: address, source_url: vector<u8>) acquires Config {
        assert_admin(sender, contract_addr);
        let c = borrow_global_mut<Config>(contract_addr);
        let source_string = string::utf8(source_url);
        vector::push_back(&mut c.allowed_sources, source_string);
        
        event::emit_event<SourceAdded>(
            &mut c.events.source_added, 
            SourceAdded { 
                source_url: source_string, 
                admin: signer::address_of(sender) 
            }
        );
    }

    // Enhanced request with source specification
    public entry fun request_reserves_with_source(
        sender: &signer,
        contract_addr: address,
        request_id: vector<u8>,
        source_url: vector<u8>,
        path: vector<u8>,
        multiplier: u64,
        job_id: vector<u8>,
        additional_params: vector<u8>
    ) acquires Config, State {
        let c = borrow_global_mut<Config>(contract_addr);
        let s = borrow_global_mut<State>(contract_addr);
        
        let source_string = string::utf8(source_url);
        
        // Verify source is allowed (optional security measure)
        let source_allowed = vector::contains(&c.allowed_sources, &source_string) || 
                           vector::is_empty(&c.allowed_sources); // If empty, allow all
        assert!(source_allowed, E_INVALID_SOURCE);

        // Create request specification
        let spec = RequestSpec {
            source_url: source_string,
            path: string::utf8(path),
            multiplier,
            job_id: string::utf8(job_id),
            additional_params,
        };

        // Store request mapping and spec
        if (table::contains(&s.request_to_user, request_id)) {
            table::remove(&mut s.request_to_user, request_id);
        };
        if (table::contains(&s.request_to_spec, request_id)) {
            table::remove(&mut s.request_to_spec, request_id);
        };
        
        table::add(&mut s.request_to_user, request_id, signer::address_of(sender));
        table::add(&mut s.request_to_spec, request_id, spec);

        event::emit_event<ReservesRequested>(
            &mut c.events.reserves_requested, 
            ReservesRequested { 
                request_id, 
                user: signer::address_of(sender),
                source_url: source_string,
                job_id: string::utf8(job_id),
            }
        );
    }

    // Backward compatibility: simple request with default source
    public entry fun request_reserves(
        sender: &signer, 
        contract_addr: address,
        request_id: vector<u8>
    ) acquires Config, State {
        // Use default source configuration
        request_reserves_with_source(
            sender,
            contract_addr,
            request_id,
            b"https://api.example.com/reserves", // Default API
            b"data.totalReserves",               // Default JSON path
            1000000,                             // Default 6 decimal scaling
            b"get_reserves_job",                 // Default job ID
            vector::empty<u8>()                  // No additional params
        );
    }

    // Enhanced fulfill with source validation
    public entry fun fulfill(
        sender: &signer,
        contract_addr: address,
        request_id: vector<u8>,
        reserves_6dp: u64,
        response: vector<u8>,
        err: vector<u8>
    ) acquires Config, State {
        assert_oracle(sender, contract_addr);
        let c = borrow_global_mut<Config>(contract_addr);
        let s = borrow_global_mut<State>(contract_addr);
        
        // Check if request exists and get spec
        if (!table::contains(&s.request_to_user, request_id)) {
            // Still record payloads then abort
            if (vector::length(&response) > 0) {
                if (table::contains(&s.request_to_response, request_id)) {
                    table::remove(&mut s.request_to_response, request_id);
                };
                table::add(&mut s.request_to_response, request_id, response);
            };
            if (vector::length(&err) > 0) {
                if (table::contains(&s.request_to_error, request_id)) {
                    table::remove(&mut s.request_to_error, request_id);
                };
                table::add(&mut s.request_to_error, request_id, err);
            };
            assert!(false, E_UNEXPECTED_REQUEST);
        };

        let user = *table::borrow(&s.request_to_user, request_id);
        let spec = *table::borrow(&s.request_to_spec, request_id);
        let success = vector::length(&err) == 0;

        // Update source statistics
        let source_url = spec.source_url;
        
        // Update total count
        if (table::contains(&s.source_total_count, source_url)) {
            let current_total = *table::borrow(&s.source_total_count, source_url);
            table::remove(&mut s.source_total_count, source_url);
            table::add(&mut s.source_total_count, source_url, current_total + 1);
        } else {
            table::add(&mut s.source_total_count, source_url, 1);
        };

        // Update success count if successful
        if (success) {
            if (table::contains(&s.source_success_count, source_url)) {
                let current_success = *table::borrow(&s.source_success_count, source_url);
                table::remove(&mut s.source_success_count, source_url);
                table::add(&mut s.source_success_count, source_url, current_success + 1);
            } else {
                table::add(&mut s.source_success_count, source_url, 1);
            };
            
            // Only update reserves on success
            s.total_reserves_6dp = reserves_6dp;
        };

        // Store response/error payloads
        if (vector::length(&response) > 0) {
            if (table::contains(&s.request_to_response, request_id)) {
                table::remove(&mut s.request_to_response, request_id);
            };
            table::add(&mut s.request_to_response, request_id, response);
        };
        if (vector::length(&err) > 0) {
            if (table::contains(&s.request_to_error, request_id)) {
                table::remove(&mut s.request_to_error, request_id);
            };
            table::add(&mut s.request_to_error, request_id, err);
        };

        // Cleanup request mappings
        table::remove(&mut s.request_to_user, request_id);
        table::remove(&mut s.request_to_spec, request_id);

        event::emit_event<ReservesUpdated>(
            &mut c.events.reserves_updated, 
            ReservesUpdated { 
                request_id, 
                user, 
                reserves_6dp,
                source_url,
                success,
            }
        );
    }

    // View functions
    #[view]
    public fun get_reserves(publisher: address): u64 acquires State {
        borrow_global<State>(publisher).total_reserves_6dp
    }

    #[view]
    public fun get_source_reliability(publisher: address, source_url: vector<u8>): (u64, u64) acquires State {
        let s = borrow_global<State>(publisher);
        let source_string = string::utf8(source_url);
        
        let success_count = if (table::contains(&s.source_success_count, source_string)) {
            *table::borrow(&s.source_success_count, source_string)
        } else {
            0
        };
        
        let total_count = if (table::contains(&s.source_total_count, source_string)) {
            *table::borrow(&s.source_total_count, source_string)
        } else {
            0
        };
        
        (success_count, total_count)
    }

    #[view]
    public fun get_allowed_sources(publisher: address): vector<String> acquires Config {
        borrow_global<Config>(publisher).allowed_sources
    }

    // Get request specification for debugging
    #[view] 
    public fun get_request_spec(publisher: address, request_id: vector<u8>): (String, String, u64, String) acquires State {
        let s = borrow_global<State>(publisher);
        if (table::contains(&s.request_to_spec, request_id)) {
            let spec = table::borrow(&s.request_to_spec, request_id);
            (spec.source_url, spec.path, spec.multiplier, spec.job_id)
        } else {
            (string::utf8(b""), string::utf8(b""), 0, string::utf8(b""))
        }
    }
}