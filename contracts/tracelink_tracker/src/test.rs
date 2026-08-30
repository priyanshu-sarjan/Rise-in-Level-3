#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String, Symbol};

// Import Contract A Registry for testing
pub mod registry {
    use soroban_sdk::contractimport;
    contractimport!(file = "../tracelink_registry/target/wasm32-unknown-unknown/release/tracelink_registry.wasm");
}

#[test]
fn test_item_creation_happy_path() {
    let env = Env::default();
    env.mock_all_auths();

    let tracker_id = env.register_contract(None, TraceLinkTrackerContract);
    let client = TraceLinkTrackerContractClient::new(&env, &tracker_id);

    let manufacturer = Address::generate(&env);
    let item_id = Symbol::new(&env, "ITEM101");
    let name = String::from_str(&env, "Ashwagandha Extract");
    let category = String::from_str(&env, "Botanical");
    let origin = String::from_str(&env, "Kerala");

    // Dummy registry address for unit test
    let registry_address = Address::generate(&env);

    let item = client.create_item_with_registry(
        &registry_address,
        &item_id,
        &name,
        &category,
        &origin,
        &manufacturer,
    );

    assert_eq!(item.id, item_id);
    assert_eq!(item.checkpoint_count, 1);
}

#[test]
fn test_checkpoint_append_and_query() {
    let env = Env::default();
    env.mock_all_auths();

    let tracker_id = env.register_contract(None, TraceLinkTrackerContract);
    let client = TraceLinkTrackerContractClient::new(&env, &tracker_id);

    let manufacturer = Address::generate(&env);
    let item_id = Symbol::new(&env, "ITEM202");
    let name = String::from_str(&env, "Insulin Vial");
    let category = String::from_str(&env, "Pharma");
    let origin = String::from_str(&env, "Frankfurt");

    let registry_address = Address::generate(&env);

    client.create_item_with_registry(
        &registry_address,
        &item_id,
        &name,
        &category,
        &origin,
        &manufacturer,
    );

    let inspector = Address::generate(&env);
    let location = String::from_str(&env, "Berlin Warehouse");
    let status = String::from_str(&env, "IN_TRANSIT");
    let notes = String::from_str(&env, "Temp stable 4C");

    let cp = client.add_checkpoint_verified(
        &registry_address,
        &item_id,
        &location,
        &status,
        &notes,
        &inspector,
    );

    assert_eq!(cp.index, 2);
    assert_eq!(cp.location, location);

    let checkpoints = client.get_checkpoints(&item_id);
    assert_eq!(checkpoints.len(), 2);
}

#[test]
#[should_panic(expected = "Item already exists")]
fn test_duplicate_item_revert() {
    let env = Env::default();
    env.mock_all_auths();

    let tracker_id = env.register_contract(None, TraceLinkTrackerContract);
    let client = TraceLinkTrackerContractClient::new(&env, &tracker_id);

    let manufacturer = Address::generate(&env);
    let item_id = Symbol::new(&env, "DUP101");
    let name = String::from_str(&env, "Item");
    let category = String::from_str(&env, "Cat");
    let origin = String::from_str(&env, "Org");

    let registry_address = Address::generate(&env);

    client.create_item_with_registry(
        &registry_address,
        &item_id,
        &name,
        &category,
        &origin,
        &manufacturer,
    );

    // Should panic on duplicate registration
    client.create_item_with_registry(
        &registry_address,
        &item_id,
        &name,
        &category,
        &origin,
        &manufacturer,
    );
}
