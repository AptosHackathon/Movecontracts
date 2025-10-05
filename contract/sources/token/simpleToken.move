module rwa_addr::simpleToken {
    use std::signer;
    use std::option;
    use std::string::utf8;
    use std::error;
    use aptos_framework::fungible_asset as fa;
    use aptos_framework::object::{Self, Object};
    use aptos_framework::primary_fungible_store as pfs;

    const E_TOKEN_ALREADY_EXISTS: u64 = 0;

    struct Token has key {
        metadata: Object<fa::Metadata>,
        mint_ref: fa::MintRef,
    }

    /// Initialize a simple token
    public entry fun init(
        sender: &signer, 
        symbol: vector<u8>, 
        name: vector<u8>, 
        decimals: u8
    ) {
        let sender_addr = signer::address_of(sender);
        assert!(!exists<Token>(sender_addr), error::already_exists(E_TOKEN_ALREADY_EXISTS));

        // Create the metadata object using symbol as the seed
        let constructor_ref = object::create_named_object(sender, symbol);
        
        // Initialize the fungible asset
        pfs::create_primary_store_enabled_fungible_asset(
            &constructor_ref,
            option::none<u128>(), // unlimited supply
            utf8(name),
            utf8(symbol),
            decimals,
            utf8(b""), // icon_uri
            utf8(b""), // project_uri
        );

        // Generate mint ref
        let mint_ref = fa::generate_mint_ref(&constructor_ref);
        let metadata = object::object_from_constructor_ref<fa::Metadata>(&constructor_ref);

        // Store the token
        move_to(sender, Token { metadata, mint_ref });
    }

    /// Initialize a token with a custom seed (allows reusing the same symbol)
    public entry fun init_with_seed(
        sender: &signer,
        seed: vector<u8>,
        symbol: vector<u8>,
        name: vector<u8>,
        decimals: u8
    ) {
        let sender_addr = signer::address_of(sender);
        assert!(!exists<Token>(sender_addr), error::already_exists(E_TOKEN_ALREADY_EXISTS));

        // Create metadata object with a custom seed to avoid collisions
        let constructor_ref = object::create_named_object(sender, seed);

        pfs::create_primary_store_enabled_fungible_asset(
            &constructor_ref,
            option::none<u128>(), // unlimited supply
            utf8(name),
            utf8(symbol),
            decimals,
            utf8(b""),
            utf8(b""),
        );

        let mint_ref = fa::generate_mint_ref(&constructor_ref);
        let metadata = object::object_from_constructor_ref<fa::Metadata>(&constructor_ref);
        move_to(sender, Token { metadata, mint_ref });
    }

    /// Mint tokens to any address (no KYC required)
    public entry fun mint(
        sender: &signer, 
        recipient: address, 
        amount: u64
    ) acquires Token {
        let admin = signer::address_of(sender);
        let token = borrow_global<Token>(admin);
        
        // Ensure recipient has a primary store
        let recipient_store = pfs::ensure_primary_store_exists(recipient, token.metadata);
        
        // Mint and deposit
        let fa = fa::mint(&token.mint_ref, amount);
        fa::deposit(recipient_store, fa);
    }

    /// Transfer tokens (no KYC required)
    public entry fun transfer(
        sender: &signer,
        to: address,
        amount: u64
    ) acquires Token {
        let admin = signer::address_of(sender);
        let token = borrow_global<Token>(admin);
        pfs::transfer(sender, token.metadata, to, amount);
    }

    /// Deposit tokens to a specific address (for orders contract integration)
    public entry fun deposit(
        sender: &signer,
        to: address,
        amount: u64
    ) acquires Token {
        let admin = signer::address_of(sender);
        let token = borrow_global<Token>(admin);
        pfs::transfer(sender, token.metadata, to, amount);
    }

    /// Get balance
    #[view]
    public fun balance(owner: address): u64 acquires Token {    
        let admin = @rwa_addr;
        let token = borrow_global<Token>(admin);
        pfs::balance(owner, token.metadata)
    }   
#[view]
public fun metadata_address(): address acquires Token {
    let token = borrow_global<Token>(@rwa_addr);
    object::object_address(&token.metadata)
}

    /// Get total supply
    #[view]
    public fun total_supply(): option::Option<u128> acquires Token {
        let admin = @rwa_addr;
        let token = borrow_global<Token>(admin);
        fa::supply(token.metadata)
    }
}
