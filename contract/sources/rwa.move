module rwa_addr::fa_token {
    use std::signer;
    use std::option;
    use std::error;
    use aptos_framework::fungible_asset as fa;  // Fungible Asset module, which is the new standard for fungible assets on Aptos
    use aptos_framework::object; // Object module, which is used to create and manage objects on Aptos
    use aptos_framework::primary_fungible_store as pfs;

    const E_NOT_AUTHORIZED: u64 = 10;

    struct Token has key {
        metadata: fa::Metadata,
    }

    // Admin registry stored under the publisher (admin)
    struct Roles has key { admin: address }

    /// Initializes metadata for the token and stores it under the publisher's address
    public entry fun init(sender: &signer, symbol: vector<u8>, name: vector<u8>, decimals: u8) acquires Token, Roles {
        assert!(!exists<Token>(signer::address_of(sender)), 1);
        let meta = fa::initialize_metadata(signer::address_of(sender), symbol, name, decimals, false, option::none());
        move_to(sender, Token { metadata: meta });
        // create roles registry; admin is the publisher
        move_to(sender, Roles { admin: signer::address_of(sender) });
    } 

    fun assert_admin(admin: address, caller: address) acquires Roles {
        if (exists<Roles>(admin)) {
            let r = borrow_global<Roles>(admin);
            assert!(caller == r.admin, error::permission_denied(E_NOT_AUTHORIZED));
        } else { assert!(false, error::permission_denied(E_NOT_AUTHORIZED)); };
    }

    /// Mints to recipient's primary store
    public entry fun mint(sender: &signer, admin: address, recipient: address, amount: u64) acquires Token, Roles {
        assert_admin(admin, signer::address_of(sender));
        let t = borrow_global<Token>(admin);
        fa::mint(&t.metadata, recipient, amount);
    }

    /// Transfers from caller's primary store to `to`
    public entry fun transfer(sender: &signer, admin: address, to: address, amount: u64) acquires Token {
        let t = borrow_global<Token>(admin);
        fa::transfer(sender, &t.metadata, to, amount);
    }

    /// Burns from caller's primary store
    public entry fun burn(sender: &signer, admin: address, amount: u64) acquires Token, Roles {
        assert_admin(admin, signer::address_of(sender));
        let t = borrow_global<Token>(admin);
        fa::burn(sender, &t.metadata, amount);
    }

    /// Returns balance in the primary fungible store for this token's metadata
    #[view]
    public fun balance_of(publisher: address, owner: address): u64 acquires Token {
        let t = borrow_global<Token>(publisher);
        pfs::balance(owner, t.metadata)
    }

    /// Returns the metadata object address for this token
    #[view]
    public fun metadata_address(publisher: address): address acquires Token {
        let t = borrow_global<Token>(publisher);
        object::address_of(&t.metadata)
    }
}


