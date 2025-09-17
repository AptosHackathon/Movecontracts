module rwa_addr::spout_token_tests {
    use aptos_framework::account::create_signer_for_test;
    use aptos_framework::primary_fungible_store as pfs;
    use rwa_addr::SpoutToken;
    use rwa_addr::kyc_registry;

    const ADMIN: address = @rwa_addr;
    const USER: address = @0xB0B;

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
        let metadata_obj = SpoutToken::get_metadata(ADMIN);
        let bal_before = pfs::balance(USER, metadata_obj);
        assert!(bal_before == 1_000, 100);

        // Admin burns 400 from USER
        SpoutToken::admin_burn_from(&admin_signer, USER, 400);

        // Balance should be 600
        let bal_after = pfs::balance(USER, metadata_obj);
        assert!(bal_after == 600, 101);
    }
}


