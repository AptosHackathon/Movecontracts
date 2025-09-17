module rwa_addr::spout_token_tests {
    use std::signer;
    use std::string::utf8;
    use aptos_framework::account::create_signer_for_test;
    use aptos_framework::primary_fungible_store as pfs;
    use aptos_framework::fungible_asset as fa;
    use rwa_addr::SpoutToken;
    use rwa_addr::kyc_registry;

    const ADMIN: address = @rwa_addr;
    const USER: address = @0xB0B;

    #[test]
    public fun admin_mint_and_burn_from_user() acquires SpoutToken::Token, SpoutToken::Roles {
        let admin_signer = create_signer_for_test(ADMIN);
        let user_signer = create_signer_for_test(USER);
        let _ = &user_signer; // silence unused

        // Init KYC registry under admin and verify USER
        kyc_registry::init(&admin_signer);
        kyc_registry::set_verified(&admin_signer, USER, true);

        // Init token under admin
        SpoutToken::init(&admin_signer, b"SPT", b"Spout Token", 6);

        // Mint 1_000 to USER
        SpoutToken::mint(&admin_signer, USER, 1_000);

        // Check balance == 1_000
        let metadata = SpoutToken::get_metadata(ADMIN);
        let bal_before = pfs::balance(USER, metadata);
        assert!(bal_before == 1_000, 100);

        // Admin burns 400 from USER
        SpoutToken::admin_burn_from(&admin_signer, USER, 400);

        // Balance should be 600
        let bal_after = pfs::balance(USER, metadata);
        assert!(bal_after == 600, 101);
    }
}


