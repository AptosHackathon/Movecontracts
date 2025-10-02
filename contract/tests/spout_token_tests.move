module rwa_addr::spout_token_tests {
    use aptos_framework::account::create_signer_for_test;
    use aptos_framework::primary_fungible_store as pfs;
    use rwa_addr::SpoutToken;
    use rwa_addr::kyc_registry;

    const ADMIN: address = @rwa_addr;
    const USER: address = @0xB0B;
    const USER2: address = @0xC0C;

    #[test]
    public fun admin_mint_and_burn_from_user() {
        let admin_signer = create_signer_for_test(ADMIN);
        let _user_signer = create_signer_for_test(USER);

        // Init KYC registry under admin and verify USER
        kyc_registry::init(&admin_signer);
        kyc_registry::set_verified(&admin_signer, USER, true);

        // Init token under admin
        SpoutToken::init<u8>(&admin_signer, b"SPT", b"Spout Token", 6);

        // Mint 1_000 to USER
        SpoutToken::mint<u8>(&admin_signer, USER, 1_000);

        // Check balance == 1_000
        let metadata_obj = SpoutToken::get_metadata<u8>();
        let bal_before = pfs::balance(USER, metadata_obj);
        assert!(bal_before == 1_000, 100);

        // Admin burns 400 from USER
        SpoutToken::admin_burn_from<u8>(&admin_signer, USER, 400);

        // Balance should be 600
        let bal_after = pfs::balance(USER, metadata_obj);
        assert!(bal_after == 600, 101);
    }
}

module rwa_addr::spout_token_force_transfer_tests {
    use aptos_framework::account::create_signer_for_test;
    use aptos_framework::primary_fungible_store as pfs;
    use rwa_addr::SpoutToken;
    use rwa_addr::kyc_registry;

    const ADMIN: address = @rwa_addr;
    const FROM: address = @0xD0D;
    const TO: address = @0xE0E;

    #[test]
    public fun admin_force_transfer_moves_balance() {
        let admin_signer = create_signer_for_test(ADMIN);
        let _from_signer = create_signer_for_test(FROM);
        let _to_signer = create_signer_for_test(TO);

        // Init KYC and token
        kyc_registry::init(&admin_signer);
        kyc_registry::set_verified(&admin_signer, FROM, true);
        kyc_registry::set_verified(&admin_signer, TO, true);
        SpoutToken::init<u8>(&admin_signer, b"SPT", b"Spout Token", 6);

        // Mint 1_000 to FROM
        SpoutToken::mint<u8>(&admin_signer, FROM, 1_000);
        let meta = SpoutToken::get_metadata<u8>();
        assert!(pfs::balance(FROM, meta) == 1_000, 200);
        assert!(pfs::balance(TO, meta) == 0, 201);

        // Force transfer 400 FROM -> TO
        SpoutToken::admin_force_transfer<u8>(&admin_signer, FROM, TO, 400);

        // Expect FROM=600, TO=400
        assert!(pfs::balance(FROM, meta) == 600, 202);
        assert!(pfs::balance(TO, meta) == 400, 203);
    }
}

module rwa_addr::spout_token_supply_tests {
    use std::option;
    use aptos_framework::account::create_signer_for_test;
    use rwa_addr::SpoutToken;
    use rwa_addr::kyc_registry;

    const ADMIN: address = @rwa_addr;
    const USER1: address = @0xF01;
    const USER2: address = @0xF02;

    #[test]
    public fun test_total_supply_tracking() {
        let admin_signer = create_signer_for_test(ADMIN);

        // Init KYC and verify users
        kyc_registry::init(&admin_signer);
        kyc_registry::set_verified(&admin_signer, USER1, true);
        kyc_registry::set_verified(&admin_signer, USER2, true);

        // Init token with type argument
        SpoutToken::init<u8>(&admin_signer, b"SPT", b"Spout Token", 6);

        // Check initial supply (should be Some(0))
        let supply_opt = SpoutToken::total_supply<u8>();
        assert!(option::is_some(&supply_opt), 300);
        let initial_supply = *option::borrow(&supply_opt);
        assert!(initial_supply == 0, 301);

        // Mint 1_000_000 to USER1
        SpoutToken::mint<u8>(&admin_signer, USER1, 1_000_000);
        
        // Check supply increased to 1_000_000
        let supply_after_mint1 = SpoutToken::total_supply<u8>();
        assert!(option::is_some(&supply_after_mint1), 302);
        let supply1 = *option::borrow(&supply_after_mint1);
        assert!(supply1 == 1_000_000, 303);

        // Mint another 500_000 to USER2
        SpoutToken::mint<u8>(&admin_signer, USER2, 500_000);

        // Check supply is now 1_500_000
        let supply_after_mint2 = SpoutToken::total_supply<u8>();
        assert!(option::is_some(&supply_after_mint2), 304);
        let supply2 = *option::borrow(&supply_after_mint2);
        assert!(supply2 == 1_500_000, 305);

        // Burn 300_000 from USER1
        SpoutToken::admin_burn_from<u8>(&admin_signer, USER1, 300_000);

        // Check supply decreased to 1_200_000
        let supply_after_burn = SpoutToken::total_supply<u8>();
        assert!(option::is_some(&supply_after_burn), 306);
        let supply3 = *option::borrow(&supply_after_burn);
        assert!(supply3 == 1_200_000, 307);
    }
}


