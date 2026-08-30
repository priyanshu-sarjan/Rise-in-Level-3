#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, String, Symbol, Vec};

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct Item {
    pub id: Symbol,
    pub name: String,
    pub category: String,
    pub origin: String,
    pub manufacturer: Address,
    pub created_at: u64,
    pub checkpoint_count: u32,
    pub current_status: String,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct Checkpoint {
    pub item_id: Symbol,
    pub index: u32,
    pub location: String,
    pub status: String,
    pub notes: String,
    pub verified_by: Address,
    pub timestamp: u64,
}

#[contracttype]
pub enum DataKey {
    Item(Symbol),
    Checkpoints(Symbol),
    ItemCount,
}

#[contract]
pub struct TraceLinkContract;

#[contractimpl]
impl TraceLinkContract {
    /// Register a new supply chain item/batch
    pub fn create_item(
        env: Env,
        item_id: Symbol,
        name: String,
        category: String,
        origin: String,
        manufacturer: Address,
    ) -> Item {
        manufacturer.require_auth();

        let key = DataKey::Item(item_id.clone());
        if env.storage().persistent().has(&key) {
            panic!("Item already exists");
        }

        let now = env.ledger().timestamp();
        let initial_status = String::from_str(&env, "ORIGIN_HARVESTED");

        let item = Item {
            id: item_id.clone(),
            name,
            category,
            origin: origin.clone(),
            manufacturer: manufacturer.clone(),
            created_at: now,
            checkpoint_count: 1,
            current_status: initial_status.clone(),
        };

        // Save item
        env.storage().persistent().set(&key, &item);

        // Initial checkpoint
        let initial_checkpoint = Checkpoint {
            item_id: item_id.clone(),
            index: 1,
            location: origin,
            status: initial_status,
            notes: String::from_str(&env, "Initial batch creation & origin verification"),
            verified_by: manufacturer.clone(),
            timestamp: now,
        };

        let mut checkpoints: Vec<Checkpoint> = Vec::new(&env);
        checkpoints.push_back(initial_checkpoint);
        env.storage().persistent().set(&DataKey::Checkpoints(item_id.clone()), &checkpoints);

        // Increment item count
        let count_key = DataKey::ItemCount;
        let count: u32 = env.storage().persistent().get(&count_key).unwrap_or(0);
        env.storage().persistent().set(&count_key, &(count + 1));

        // Publish event
        env.events().publish((symbol_short!("created"), item_id), (manufacturer, now));

        item
    }

    /// Add a tamper-evident checkpoint scan to an existing item
    pub fn add_checkpoint(
        env: Env,
        item_id: Symbol,
        location: String,
        status: String,
        notes: String,
        verified_by: Address,
    ) -> Checkpoint {
        verified_by.require_auth();

        let item_key = DataKey::Item(item_id.clone());
        let mut item: Item = env.storage().persistent().get(&item_key).expect("Item not found");

        let cp_key = DataKey::Checkpoints(item_id.clone());
        let mut checkpoints: Vec<Checkpoint> = env.storage().persistent().get(&cp_key).unwrap_or(Vec::new(&env));

        let now = env.ledger().timestamp();
        let next_index = checkpoints.len() + 1;

        let checkpoint = Checkpoint {
            item_id: item_id.clone(),
            index: next_index,
            location,
            status: status.clone(),
            notes,
            verified_by: verified_by.clone(),
            timestamp: now,
        };

        checkpoints.push_back(checkpoint.clone());
        env.storage().persistent().set(&cp_key, &checkpoints);

        // Update item status and count
        item.current_status = status;
        item.checkpoint_count = next_index;
        env.storage().persistent().set(&item_key, &item);

        // Publish event
        env.events().publish((symbol_short!("ckpt_add"), item_id), (verified_by, next_index, now));

        checkpoint
    }

    /// Get details of an item by ID
    pub fn get_item(env: Env, item_id: Symbol) -> Item {
        let key = DataKey::Item(item_id);
        env.storage().persistent().get(&key).expect("Item not found")
    }

    /// Get all checkpoints for an item
    pub fn get_checkpoints(env: Env, item_id: Symbol) -> Vec<Checkpoint> {
        let cp_key = DataKey::Checkpoints(item_id);
        env.storage().persistent().get(&cp_key).unwrap_or(Vec::new(&env))
    }

    /// Get total items registered
    pub fn get_total_items(env: Env) -> u32 {
        env.storage().persistent().get(&DataKey::ItemCount).unwrap_or(0)
    }
}
