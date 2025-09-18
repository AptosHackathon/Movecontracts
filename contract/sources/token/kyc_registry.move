module rwa_addr::kyc_registry {
    use std::signer;
    use aptos_std::table::{Self, Table};

    const E_NOT_ADMIN: u64 = 0;

    struct Config has key {
        admin: address,
        verified: Table<address, bool>,
    }

    public entry fun init(sender: &signer) {
        let admin = signer::address_of(sender);
        move_to(sender, Config { admin, verified: table::new() });
    }

    // Modifier for the entry functions to check eligibility for calling the functions
    fun assert_admin(sender: &signer) acquires Config {
        let c = borrow_global<Config>(signer::address_of(sender));
        assert!(signer::address_of(sender) == c.admin, E_NOT_ADMIN);
    }

    public entry fun set_verified(sender: &signer, user: address, is_verified: bool) acquires Config {
        assert_admin(sender);
        let c = borrow_global_mut<Config>(signer::address_of(sender));
        if (table::contains(&c.verified, user)) { table::remove(&mut c.verified, user); };
        if (is_verified) { table::add(&mut c.verified, user, true); };
    }

    // Explicit revoke helper for clarity/auditing
    public entry fun revoke_verified(sender: &signer, user: address) acquires Config {
        assert_admin(sender);
        let c = borrow_global_mut<Config>(signer::address_of(sender));
        if (table::contains(&c.verified, user)) { table::remove(&mut c.verified, user); };
    }

    #[view]
    public fun is_verified(registry_admin: address, user: address): bool acquires Config {
        if (!exists<Config>(registry_admin)) { return false; };
        let c = borrow_global<Config>(registry_admin);
        table::contains(&c.verified, user)
    }
}


