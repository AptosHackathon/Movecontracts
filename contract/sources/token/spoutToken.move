module rwa_addr::SpoutToken {
    use std::signer;
    use std::option;
    use std::string::utf8;
    use std::error;
    use aptos_framework::fungible_asset as fa;
    use aptos_framework::object::{Self, Object};
    use aptos_framework::primary_fungible_store as pfs;
    use rwa_addr::kyc_registry;
    use rwa_addr::compliance_policy; // DFA hooks not wired on this framework rev

    const E_TOKEN_ALREADY_EXISTS: u64 = 1;
    const E_NOT_AUTHORIZED: u64 = 2;

    struct Token has key {
        metadata: Object<fa::Metadata>,
    }

    // Admin registry stored under the publisher (admin)
    struct Roles has key {
        admin: address,
        mint_ref: fa::MintRef,
        burn_ref: fa::BurnRef,
    }

    /// Initializes metadata for the token and stores it under the publisher's address
    public entry fun init(
        sender: &signer, 
        symbol: vector<u8>, 
        name: vector<u8>, 
        decimals: u8
    ) {
        let sender_addr = signer::address_of(sender);
        assert!(!exists<Token>(sender_addr), error::already_exists(E_TOKEN_ALREADY_EXISTS));

        // Create the metadata object using the current Aptos FA standard
        let constructor_ref = object::create_named_object(sender, symbol);
        
        // Initialize the fungible asset metadata using the correct current API
        pfs::create_primary_store_enabled_fungible_asset(
            &constructor_ref,
            option::some(99999999999u128), // max_supply (optional)
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

        // Store the token metadata and roles
        move_to(sender, Token { metadata });
        move_to(sender, Roles { 
            admin: sender_addr, 
            mint_ref, 
            burn_ref 
        });
    }

    fun assert_admin(admin: address, caller: address) acquires Roles {
        assert!(exists<Roles>(admin), error::not_found(E_NOT_AUTHORIZED));
        let roles = borrow_global<Roles>(admin);
        assert!(caller == roles.admin, error::permission_denied(E_NOT_AUTHORIZED));
    }

    /// Mints to recipient's primary store
    public entry fun mint(
        sender: &signer, 
        recipient: address, 
        amount: u64
    ) acquires Token, Roles {
        let admin = signer::address_of(sender);
        assert_admin(admin, admin);
        // Require KYC for recipient using the same admin address as the registry owner
        assert!(kyc_registry::is_verified(admin, recipient), error::permission_denied(E_NOT_AUTHORIZED));
        let roles = borrow_global<Roles>(admin);
        let token = borrow_global<Token>(admin);
        
        // Ensure the recipient has a primary store
        let recipient_store = pfs::ensure_primary_store_exists(recipient, token.metadata);
        
        // Mint and deposit to the recipient's primary fungible store
        let fa = fa::mint(&roles.mint_ref, amount);
        fa::deposit(recipient_store, fa);
    }

    /// Transfers from caller's primary store to `to`
    public entry fun transfer(
        sender: &signer, 
        to: address, 
        amount: u64
    ) acquires Token {
        let admin = signer::address_of(sender);
        // Require KYC for both sender and recipient
        assert!(kyc_registry::is_verified(admin, signer::address_of(sender)), error::permission_denied(E_NOT_AUTHORIZED));
        assert!(kyc_registry::is_verified(admin, to), error::permission_denied(E_NOT_AUTHORIZED));
        let token = borrow_global<Token>(admin);
        pfs::transfer(sender, token.metadata, to, amount);
    }


    /// Admin-only burn from arbitrary user via DFA dispatcher
    public entry fun admin_burn_from(
        sender: &signer,
        user: address,
        amount: u64
    ) acquires Token, Roles {
        let admin = signer::address_of(sender);
        assert_admin(admin, admin);
        // assert!(kyc_registry::is_verified(admin, user), error::permission_denied(E_NOT_AUTHORIZED));
        let roles = borrow_global<Roles>(admin);
        let token = borrow_global<Token>(admin);
        // Get or create the user's primary store, then burn from it
        let user_store = pfs::ensure_primary_store_exists(user, token.metadata);
        fa::burn_from(&roles.burn_ref, user_store, amount);
    }

    // Returns balance in the primary fungible store for this token's metadata
    #[view]
    public fun balance_of(publisher: address, owner: address): u64 acquires Token {
        let token = borrow_global<Token>(publisher);
        pfs::balance(owner, token.metadata)
    }

    // Returns the metadata object address for this token
    #[view]
    public fun metadata_address(publisher: address): address acquires Token {
        let token = borrow_global<Token>(publisher);
        object::object_address(&token.metadata)
    }

    // Returns the token metadata object
    #[view]
    public fun get_metadata(publisher: address): Object<fa::Metadata> acquires Token {
        let token = borrow_global<Token>(publisher);
        token.metadata
    }
}