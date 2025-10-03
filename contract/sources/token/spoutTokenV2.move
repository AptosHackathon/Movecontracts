module rwa_addr::SpoutTokenV2 {
    use std::signer;
    use std::option;
    use std::string::utf8;
    use std::error;
    use aptos_framework::fungible_asset as fa;
    use aptos_framework::object::{Self, Object};
    use aptos_framework::primary_fungible_store as pfs;
    use rwa_addr::kyc_registry;

    const E_TOKEN_ALREADY_EXISTS: u64 = 0;
    const E_NOT_AUTHORIZED: u64 = 1;

    // Phantom type markers for different tokens
    struct USD has drop {}
    struct USDC has drop {}
    struct USDT has drop {}
    struct LQD has drop {}
    struct TSLA has drop {}
    struct AAPL has drop {}
    struct GOLD has drop {}
    // New phantom markers for new token instances
    struct USDT_NEW has drop {}
    struct LQD_NEW has drop {}
    struct USDC_NEW has drop {}

    struct Token<phantom T> has key {
        metadata: Object<fa::Metadata>,
        mint_ref: fa::MintRef,
        burn_ref: fa::BurnRef,
    }

    // Admin registry stored under the publisher (admin)
    struct Roles has key { admin: address }

    /// Initializes metadata for the token and stores it under the publisher's address
    public entry fun init<T>(
        sender: &signer, 
        symbol: vector<u8>, 
        name: vector<u8>, 
        decimals: u8
    ) {
        let sender_addr = signer::address_of(sender);
        assert!(!exists<Token<T>>(sender_addr), error::already_exists(E_TOKEN_ALREADY_EXISTS));

        // Create the metadata object using the current Aptos FA standard
        let constructor_ref = object::create_named_object(sender, symbol);
        
        // Initialize the fungible asset metadata using the correct current API
        pfs::create_primary_store_enabled_fungible_asset(
            &constructor_ref,
            option::none<u128>(), // unlimited max_supply
            utf8(name), // name
            utf8(symbol), // symbol
            decimals,
            utf8(b""), // icon_uri
            utf8(b""), // project_uri
        );

        // Generate mint and burn refs
        let mint_ref = fa::generate_mint_ref(&constructor_ref);
        let burn_ref = fa::generate_burn_ref(&constructor_ref);
        
        let metadata = object::object_from_constructor_ref<fa::Metadata>(&constructor_ref);

        // Store the token and roles (create Roles only once if not exists)
        move_to(sender, Token<T> { metadata, mint_ref, burn_ref });
        if (!exists<Roles>(sender_addr)) {
            move_to(sender, Roles { admin: sender_addr });
        }
    }

    fun assert_admin(admin: address, caller: address) acquires Roles {
        assert!(exists<Roles>(admin), error::not_found(E_NOT_AUTHORIZED));
        let roles = borrow_global<Roles>(admin);
        assert!(caller == roles.admin, error::permission_denied(E_NOT_AUTHORIZED));
    }

    /// Mints to recipient's primary store
    public entry fun mint<T>(
        sender: &signer, 
        recipient: address, 
        amount: u64
    ) acquires Token, Roles {
        let admin = signer::address_of(sender);
        assert_admin(admin, admin);
        // Require KYC for recipient using the same admin address as the registry owner
        assert!(kyc_registry::is_verified(admin, recipient), error::permission_denied(E_NOT_AUTHORIZED));
        let token = borrow_global<Token<T>>(admin);
        
        // Ensure the recipient has a primary store
        let recipient_store = pfs::ensure_primary_store_exists(recipient, token.metadata);
        
        // Mint and deposit to the recipient's primary fungible store
        let fa = fa::mint(&token.mint_ref, amount);
        fa::deposit(recipient_store, fa);
    }

    /// Transfers from caller's primary store to `to`
    public entry fun transfer<T>(
        sender: &signer,
        to: address,
        amount: u64
    ) acquires Token, Roles {
        // @rwa_addr is the publisher address
        let publisher = @rwa_addr;
        let roles = borrow_global<Roles>(publisher);
        let caller = signer::address_of(sender);
        assert!(kyc_registry::is_verified(roles.admin, caller), error::permission_denied(E_NOT_AUTHORIZED));
        assert!(kyc_registry::is_verified(roles.admin, to), error::permission_denied(E_NOT_AUTHORIZED));
        let token = borrow_global<Token<T>>(publisher);
        pfs::transfer(sender, token.metadata, to, amount);
}

    /// Admin-only burn from arbitrary user
    public entry fun admin_burn_from<T>(
        sender: &signer,
        user: address,
        amount: u64
    ) acquires Token, Roles {
        let admin = signer::address_of(sender);
        assert_admin(admin, admin);
        let token = borrow_global<Token<T>>(admin);
        // Get or create the user's primary store, then burn from it
        let user_store = pfs::ensure_primary_store_exists(user, token.metadata);
        fa::burn_from(&token.burn_ref, user_store, amount);
    }

    /// Admin-only force transfer: burns from one user and mints to another
    public entry fun admin_force_transfer<T>(
        sender: &signer,
        from: address,
        to: address,
        amount: u64
    ) acquires Token, Roles {
        let admin = signer::address_of(sender);
        assert_admin(admin, admin);
        let token = borrow_global<Token<T>>(admin);
        
        // Burn from source user's primary store
        let from_store = pfs::ensure_primary_store_exists(from, token.metadata);
        fa::burn_from(&token.burn_ref, from_store, amount);
        
        // Mint to destination user's primary store
        let to_store = pfs::ensure_primary_store_exists(to, token.metadata);
        let minted = fa::mint(&token.mint_ref, amount);
        fa::deposit(to_store, minted);
    }

    /// Deposit tokens to the contract (module address)
    public entry fun deposit<T>(sender: &signer, amount: u64) acquires Token {
        let caller = signer::address_of(sender);
        let publisher = @0xc50c45c8cf451cf262827f258bba2254c94487311c326fa097ce30c39beda4ea;
        let token = borrow_global<Token<T>>(publisher);
        
        // Transfer from user to module address (where orders contract is deployed)
        pfs::transfer(sender, token.metadata, @rwa_addr, amount);
    }

    // Returns balance in the primary fungible store for this token's metadata
    #[view]
    public fun balance<T>(owner: address): u64 acquires Token {    
        // Use the actual publisher address where Token was stored
       let publisher = @0xc50c45c8cf451cf262827f258bba2254c94487311c326fa097ce30c39beda4ea;
       let token = borrow_global<Token<T>>(publisher);
       pfs::balance(owner, token.metadata)
    }   

    // Returns the metadata object address for this token
    #[view]
    public fun metadata_address<T>(publisher: address): address acquires Token {
        // Use the actual publisher address where Token was stored
        let publisher = @0xc50c45c8cf451cf262827f258bba2254c94487311c326fa097ce30c39beda4ea;                                              
        let token = borrow_global<Token<T>>(publisher);
        object::object_address(&token.metadata)
    }

    // Returns the token metadata object
    #[view]
    public fun get_metadata<T>(): Object<fa::Metadata> acquires Token {
        // Use the actual publisher address where Token was stored
        let publisher = @0xc50c45c8cf451cf262827f258bba2254c94487311c326fa097ce30c39beda4ea;
        let token = borrow_global<Token<T>>(publisher);
        token.metadata
    }

    #[view]
    public fun total_supply<T>(): option::Option<u128> acquires Token {
        let publisher = @0xc50c45c8cf451cf262827f258bba2254c94487311c326fa097ce30c39beda4ea;
        let token = borrow_global<Token<T>>(publisher);
        fa::supply(token.metadata)
    }
}

