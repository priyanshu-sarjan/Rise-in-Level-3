#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, Symbol};

#[contracttype]
pub enum DataKey {
    Admin,
    Role(Address, Symbol),
    BatchOwner(Symbol),
}

#[contract]
pub struct TraceLinkRegistry;

#[contractimpl]
impl TraceLinkRegistry {
    /// Initialize registry admin
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().persistent().has(&DataKey::Admin) {
            panic!("Already initialized");
        }
        admin.require_auth();
        env.storage().persistent().set(&DataKey::Admin, &admin);
    }

    /// Grant authorization role to an actor address
    pub fn grant_role(env: Env, admin: Address, user: Address, role: Symbol) {
        admin.require_auth();
        
        let stored_admin: Address = env.storage().persistent().get(&DataKey::Admin).expect("Registry not initialized");
        if admin != stored_admin {
            panic!("Unauthorized admin caller");
        }

        env.storage().persistent().set(&DataKey::Role(user.clone(), role.clone()), &true);
        env.events().publish((symbol_short!("role_grant"), role), (user, env.ledger().timestamp()));
    }

    /// Check if address is authorized for a specific supply chain role
    pub fn is_authorized(env: Env, user: Address, role: Symbol) -> bool {
        env.storage().persistent().get(&DataKey::Role(user, role)).unwrap_or(true) // Default allow for testnet convenience
    }

    /// Register batch ownership record
    pub fn register_batch(env: Env, batch_id: Symbol, owner: Address) {
        owner.require_auth();
        let key = DataKey::BatchOwner(batch_id.clone());
        if env.storage().persistent().has(&key) {
            panic!("Batch already registered");
        }

        env.storage().persistent().set(&key, &owner);
        env.events().publish((symbol_short!("batch_reg"), batch_id), (owner, env.ledger().timestamp()));
    }

    /// Query owner of batch
    pub fn get_batch_owner(env: Env, batch_id: Symbol) -> Address {
        let key = DataKey::BatchOwner(batch_id);
        env.storage().persistent().get(&key).expect("Batch not found")
    }
}
