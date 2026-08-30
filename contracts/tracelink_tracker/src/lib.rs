#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, String, Symbol, Vec};

pub mod registry_contract {
    use soroban_sdk::contractclient;
    #[contractclient(name = "RegistryClient")]
    pub trait RegistryInterface {
        fn is_authorized(user: soroban_sdk::Address, role: soroban_sdk::Symbol) -> bool;
        fn register_batch(batch_id: soroban_sdk::Symbol, owner: soroban_sdk::Address);
    }
}

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
    RegistryAddress,
    Item(Symbol),
    Checkpoints(Symbol),
    ItemCount,
}

#[contract]
pub struct TraceLinkTrackerContract;

#[contractimpl]
impl TraceLinkTrackerContract {
    /// Configure inter-contract target registry address
    pub fn set_registry(env: Env, admin: Address, registry_address: Address) {
        admin.require_auth();
        env.storage().persistent().set(&DataKey::RegistryAddress, &registry_address);
    }

    /// Register a new supply chain item with inter-contract invocation to Registry (Contract A)
    pub fn create_item_with_registry(
        env: Env,
        registry_address: Address,
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

        // Inter-Contract Call to Registry Contract A!
        let registry_client = registry_contract::RegistryClient::new(&env, &registry_address);
        registry_client.register_batch(&item_id, &manufacturer);

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

        env.storage().persistent().set(&key, &item);

        let initial_cp = Checkpoint {
            item_id: item_id.clone(),
            index: 1,
            location: origin,
            status: initial_status,
            notes: String::from_str(&env, "Initial batch creation & inter-contract registry verification"),
            verified_by: manufacturer.clone(),
            timestamp: now,
        };

        let mut checkpoints: Vec<Checkpoint> = Vec::new(&env);
        checkpoints.push_back(initial_cp);
        env.storage().persistent().set(&DataKey::Checkpoints(item_id.clone()), &checkpoints);

        let count: u32 = env.storage().persistent().get(&DataKey::ItemCount).unwrap_or(0);
        env.storage().persistent().set(&DataKey::ItemCount, &(count + 1));

        // Publish structured events
        env.events().publish((symbol_short!("created"), item_id), (manufacturer, now));

        item
    }

    /// Append checkpoint scan with Inter-Contract role authorization check
    pub fn add_checkpoint_verified(
        env: Env,
        registry_address: Address,
        item_id: Symbol,
        location: String,
        status: String,
        notes: String,
        verified_by: Address,
    ) -> Checkpoint {
        verified_by.require_auth();

        // Inter-Contract Call to Registry Contract A to check role authorization!
        let registry_client = registry_contract::RegistryClient::new(&env, &registry_address);
        let is_auth = registry_client.is_authorized(&verified_by, &symbol_short!("inspector"));
        if !is_auth {
            panic!("Unauthorized actor address");
        }

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

        item.current_status = status;
        item.checkpoint_count = next_index;
        env.storage().persistent().set(&item_key, &item);

        // Publish structured event
        env.events().publish((symbol_short!("ckpt_add"), item_id), (verified_by, next_index, now));

        checkpoint
    }

    /// Get details of item
    pub fn get_item(env: Env, item_id: Symbol) -> Item {
        let key = DataKey::Item(item_id);
        env.storage().persistent().get(&key).expect("Item not found")
    }

    /// Get all checkpoints for an item
    pub fn get_checkpoints(env: Env, item_id: Symbol) -> Vec<Checkpoint> {
        let cp_key = DataKey::Checkpoints(item_id);
        env.storage().persistent().get(&cp_key).unwrap_or(Vec::new(&env))
    }
}

#[cfg(test)]
mod test;
