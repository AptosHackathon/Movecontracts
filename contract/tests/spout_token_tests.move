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
        SpoutToken::init(&admin_signer, b"SPT", b"Spout Token", 6);

        // Mint 1_000 to USER
        SpoutToken::mint(&admin_signer, USER, 1_000);

        // Check balance == 1_000
        let metadata_obj = SpoutToken::get_metadata();
        let bal_before = pfs::balance(USER, metadata_obj);
        assert!(bal_before == 1_000, 100);

        // Admin burns 400 from USER
        SpoutToken::admin_burn_from(&admin_signer, USER, 400);

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
        SpoutToken::init(&admin_signer, b"SPT", b"Spout Token", 6);

        // Mint 1_000 to FROM
        SpoutToken::mint(&admin_signer, FROM, 1_000);
        let meta = SpoutToken::get_metadata();
        assert!(pfs::balance(FROM, meta) == 1_000, 200);
        assert!(pfs::balance(TO, meta) == 0, 201);

        // Force transfer 400 FROM -> TO
        SpoutToken::admin_force_transfer(&admin_signer, FROM, TO, 400);

        // Expect FROM=600, TO=400
        assert!(pfs::balance(FROM, meta) == 600, 202);
        assert!(pfs::balance(TO, meta) == 400, 203);
    }
}


