module rwa_addr::compliance_policy {
   use std::signer;
   use aptos_framework::fungible_asset as fa;
   use rwa_addr::kyc_registry;

   const E_NOT_AUTHORIZED: u64 = 0;
   const E_KYC_REQUIRED: u64 = 1;

   struct Policy has key {
       admin: address,
   }

   public entry fun init_policy(admin: &signer) {
       let admin_addr = signer::address_of(admin);
       move_to(admin, Policy { admin: admin_addr });
   }

   // Require KYC for mints unless caller is admin
   public fun pre_mint(
       meta: &fa::Metadata,
       caller: address,
       to: address,
       _amount: u64,
   ) acquires Policy {
        let policy = borrow_global<Policy>(@rwa_addr);
        if (caller == policy.admin) return;
       if (!kyc_registry::is_verified(policy.admin, to)) abort E_KYC_REQUIRED;
   }

   // Require KYC for burns unless caller is admin
   public fun pre_burn(
       meta: &fa::Metadata,
       caller: address,
       from: address,
       _amount: u64,
   ) acquires Policy {
        let policy = borrow_global<Policy>(@rwa_addr);
        if (caller == policy.admin) return;
       if (!kyc_registry::is_verified(policy.admin, from)) abort E_KYC_REQUIRED;
   }
}
