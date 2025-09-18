module rwa_addr::orders {
    use std::signer;
    use aptos_std::table::{Self, Table};
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use rwa_addr::kyc_registry;
    use rwa_addr::SpoutToken;

    const E_NOT_ADMIN: u64 = 0;
    const E_NOT_BUYER: u64 = 1;
    const E_ORDER_NOT_FOUND: u64 = 2;
    const E_ORDER_CLOSED: u64 = 3;

    struct Order has store {
        id: u64,
        buyer: address,
        spt_amount: u64,
        apt_escrow: coin::Coin<AptosCoin>,
        open: bool,
    }

    struct Book has key {
        admin: address,
        next_id: u64,
        orders: Table<u64, Order>,
    }

    public entry fun init(sender: &signer) {
        let admin = signer::address_of(sender);
        if (!exists<Book>(admin)) {
            move_to(sender, Book { admin, next_id: 1, orders: table::new() });
        }
    }

    fun assert_admin(admin: address, caller: address) acquires Book {
        assert!(exists<Book>(admin), E_NOT_ADMIN);
        let b = borrow_global<Book>(admin);
        assert!(caller == b.admin, E_NOT_ADMIN);
    }

    /// Buyer places a buy order by escrowing AptosCoin. Requires buyer KYC.
    public entry fun place_buy_order(
        buyer: &signer,
        spt_amount: u64,
        apt_amount: u64
    ) acquires Book {
        let admin = @rwa_addr;
        // Ensure KYC per registry under admin
        let buyer_addr = signer::address_of(buyer);
        assert!(kyc_registry::is_verified(admin, buyer_addr), E_NOT_ADMIN);

        // Ensure buyer has AptosCoin store registered
        if (!coin::is_account_registered<AptosCoin>(buyer_addr)) {
            coin::register<AptosCoin>(buyer);
        }

        // Withdraw AptosCoin to escrow
        let escrow = coin::withdraw<AptosCoin>(buyer, apt_amount);

        // Ensure book exists
        if (!exists<Book>(admin)) {
            // Lazily initialize if not yet
            let admin_signer = buyer; // No admin signer available; require explicit init beforehand
            // We cannot move_to under admin without admin signer; require init called earlier
            // Abort if missing
            abort E_NOT_ADMIN;
        }
        let b = borrow_global_mut<Book>(admin);
        let id = b.next_id;
        b.next_id = id + 1;
        let order = Order { id, buyer: buyer_addr, spt_amount, apt_escrow: escrow, open: true };
        table::add(&mut b.orders, id, order);
    }

    /// Buyer cancels an open order and receives APT back.
    public entry fun cancel_buy_order(buyer: &signer, id: u64) acquires Book {
        let admin = @rwa_addr;
        let buyer_addr = signer::address_of(buyer);
        let b = borrow_global_mut<Book>(admin);
        assert!(table::contains(&b.orders, id), E_ORDER_NOT_FOUND);
        let mut order = table::remove(&mut b.orders, id);
        assert!(order.open, E_ORDER_CLOSED);
        assert!(order.buyer == buyer_addr, E_NOT_BUYER);
        // Return escrow
        coin::deposit<AptosCoin>(buyer_addr, order.apt_escrow);
    }

    /// Admin fulfills a buy order: mints SPT to buyer and takes APT escrow.
    public entry fun fulfill_buy_order(admin_signer: &signer, id: u64) acquires Book, SpoutToken::Roles, SpoutToken::Token {
        let admin = signer::address_of(admin_signer);
        assert_admin(admin, admin);

        let b = borrow_global_mut<Book>(admin);
        assert!(table::contains(&b.orders, id), E_ORDER_NOT_FOUND);
        let mut order = table::remove(&mut b.orders, id);
        assert!(order.open, E_ORDER_CLOSED);

        // Mint SPT to buyer
        SpoutToken::mint(admin_signer, order.buyer, order.spt_amount);

        // Take APT escrow to admin
        coin::deposit<AptosCoin>(admin, order.apt_escrow);
    }
}


