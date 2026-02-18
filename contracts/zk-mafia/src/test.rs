#![cfg(test)]
extern crate std;

use super::*;
use soroban_sdk::{testutils::Address as _, Address, BytesN, Env};

mod mock_game_hub {
    soroban_sdk::contractimport!(
        file = "../../target/wasm32v1-none/release/mock_game_hub.wasm"
    );
}

fn setup_env() -> (Env, Address, Address, Address, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let game_hub = env.register(mock_game_hub::WASM, ());
    let contract = env.register(ZkMafiaContract, (&admin, &game_hub));

    let player1 = Address::generate(&env);
    let player2 = Address::generate(&env);
    let player3 = Address::generate(&env);

    (env, contract, player1, player2, player3, game_hub)
}

/// Helper: register 3 players. Returns player count.
fn join_all_players(
    env: &Env,
    client: &ZkMafiaContractClient,
    session_id: u32,
    p1: &Address,
    p2: &Address,
    p3: &Address,
) -> u32 {
    assert_eq!(client.entrar_a_la_ruleta(&session_id, p1, &100), 1);
    assert_eq!(client.entrar_a_la_ruleta(&session_id, p2, &100), 2);
    assert_eq!(client.entrar_a_la_ruleta(&session_id, p3, &100), 3);
    3
}

/// Helper: register 2 players. Returns player count.
fn join_two_players(
    _env: &Env,
    client: &ZkMafiaContractClient,
    session_id: u32,
    p1: &Address,
    p2: &Address,
) -> u32 {
    assert_eq!(client.entrar_a_la_ruleta(&session_id, p1, &100), 1);
    assert_eq!(client.entrar_a_la_ruleta(&session_id, p2, &100), 2);
    2
}

/// Helper: host loads the revolver with a commitment and bullet position
fn load_revolver(
    env: &Env,
    client: &ZkMafiaContractClient,
    session_id: u32,
    host: &Address,
    bullet_pos: u32,
) -> BytesN<32> {
    let salt = BytesN::from_array(env, &[42u8; 32]);
    let commitment = client.compute_bullet_hash(&salt, &bullet_pos);
    client.cargar_revolver(&session_id, host, &commitment, &bullet_pos);
    commitment
}

// ============================================================================
// Test: 3 players join, lobby full
// ============================================================================
#[test]
fn test_three_players_join() {
    let (env, contract_id, p1, p2, p3, _hub) = setup_env();
    let client = ZkMafiaContractClient::new(&env, &contract_id);
    let session_id: u32 = 7;

    join_all_players(&env, &client, session_id, &p1, &p2, &p3);

    let game = client.get_game(&session_id);
    assert_eq!(game.phase, PHASE_WAITING); // Still waiting for cargar_revolver
    assert_eq!(game.players.len(), 3);
}

// ============================================================================
// Test: 2 players can start a game
// ============================================================================
#[test]
fn test_two_players_can_start() {
    let (env, contract_id, p1, p2, _p3, _hub) = setup_env();
    let client = ZkMafiaContractClient::new(&env, &contract_id);
    let session_id: u32 = 8;

    join_two_players(&env, &client, session_id, &p1, &p2);
    load_revolver(&env, &client, session_id, &p1, 3);

    let game = client.get_game(&session_id);
    assert_eq!(game.phase, PHASE_PLAYING);
    assert_eq!(game.players.len(), 2);
    assert_eq!(game.bullet_position, 3);
}

// ============================================================================
// Test: Cannot join full lobby
// ============================================================================
#[test]
fn test_cannot_join_full_lobby() {
    let (env, contract_id, p1, p2, p3, _hub) = setup_env();
    let client = ZkMafiaContractClient::new(&env, &contract_id);
    let session_id: u32 = 13;

    join_all_players(&env, &client, session_id, &p1, &p2, &p3);

    let p4 = Address::generate(&env);
    let result = client.try_entrar_a_la_ruleta(&session_id, &p4, &100);
    assert!(result.is_err());
}

// ============================================================================
// Test: Host loads revolver → game starts
// ============================================================================
#[test]
fn test_cargar_revolver_starts_game() {
    let (env, contract_id, p1, p2, p3, _hub) = setup_env();
    let client = ZkMafiaContractClient::new(&env, &contract_id);
    let session_id: u32 = 20;

    join_all_players(&env, &client, session_id, &p1, &p2, &p3);
    load_revolver(&env, &client, session_id, &p1, 3);

    let game = client.get_game(&session_id);
    assert_eq!(game.phase, PHASE_PLAYING);
    assert_eq!(game.current_turn, 0);
    assert_eq!(game.current_chamber, 0);
    assert_eq!(game.bullet_position, 3);
}

// ============================================================================
// Test: Player survives a shot (static cylinder miss)
// ============================================================================
#[test]
fn test_player_survives_shot() {
    let (env, contract_id, p1, p2, p3, _hub) = setup_env();
    let client = ZkMafiaContractClient::new(&env, &contract_id);
    let session_id: u32 = 30;

    join_all_players(&env, &client, session_id, &p1, &p2, &p3);
    // Bullet in chamber 3 → chambers 0, 1, 2 are safe
    load_revolver(&env, &client, session_id, &p1, 3);

    // Player 1 (turn 0) fires chamber 0 → miss (contract determines)
    let zk_proof = BytesN::from_array(&env, &[0xAA; 32]);
    let result = client.disparar(&session_id, &p1, &zk_proof);
    assert_eq!(result, false); // survived

    let game = client.get_game(&session_id);
    assert_eq!(game.current_turn, 1); // advanced to p2
    assert_eq!(game.current_chamber, 1);
    assert_eq!(game.shots_fired, 1);
}

// ============================================================================
// Test: Full game — player gets hit (static cylinder)
// ============================================================================
#[test]
fn test_full_game_player_eliminated() {
    let (env, contract_id, p1, p2, p3, _hub) = setup_env();
    let client = ZkMafiaContractClient::new(&env, &contract_id);
    let session_id: u32 = 42;

    join_all_players(&env, &client, session_id, &p1, &p2, &p3);
    // Bullet in chamber 2 → chamber 0=safe, 1=safe, 2=BOOM
    load_revolver(&env, &client, session_id, &p1, 2);

    let proof = BytesN::from_array(&env, &[0xBB; 32]);

    // Turn 0: P1 fires chamber 0 → miss
    assert_eq!(client.disparar(&session_id, &p1, &proof), false);
    // Turn 1: P2 fires chamber 1 → miss
    assert_eq!(client.disparar(&session_id, &p2, &proof), false);
    // Turn 2: P3 fires chamber 2 → HIT! (contract determines: chamber 2 == bullet_position 2)
    assert_eq!(client.disparar(&session_id, &p3, &proof), true);

    let game = client.get_game(&session_id);
    assert_eq!(game.eliminated.len(), 1);
    // P3 is dead
    let dead = game.players.get(2).unwrap();
    assert!(!dead.is_alive);

    // Game continues (2 alive players remain) with auto-reloaded cylinder
    assert_eq!(game.phase, PHASE_PLAYING);
    assert_eq!(game.current_chamber, 0); // Reset after reload
}

// ============================================================================
// Test: Full game — play until winner (static cylinder, auto-reload)
// ============================================================================
#[test]
fn test_full_game_winner() {
    let (env, contract_id, p1, p2, p3, _hub) = setup_env();
    let client = ZkMafiaContractClient::new(&env, &contract_id);
    let session_id: u32 = 55;

    join_all_players(&env, &client, session_id, &p1, &p2, &p3);
    // Bullet in chamber 1 → chamber 0=safe, 1=BOOM
    load_revolver(&env, &client, session_id, &p1, 1);

    let proof = BytesN::from_array(&env, &[0xCC; 32]);

    // Turn 0: P1 fires chamber 0 → miss
    assert_eq!(client.disparar(&session_id, &p1, &proof), false);
    // Turn 1: P2 fires chamber 1 → HIT! P2 eliminated → auto-reload
    assert_eq!(client.disparar(&session_id, &p2, &proof), true);

    let game = client.get_game(&session_id);
    assert_eq!(game.eliminated.len(), 1);
    assert_eq!(game.phase, PHASE_PLAYING); // Still 2 alive
    assert_eq!(game.current_chamber, 0); // Reset after reload

    // Continue playing until a winner emerges (auto-reload generates new positions)
    let mut turns = 0;
    loop {
        let g = client.get_game(&session_id);
        if g.phase == PHASE_FINISHED {
            break;
        }
        let current = g.players.get(g.current_turn).unwrap();
        client.disparar(&session_id, &current.address, &proof);
        turns += 1;
        if turns > 20 {
            panic!("Game didn't end within 20 turns");
        }
    }

    let game = client.get_game(&session_id);
    assert_eq!(game.phase, PHASE_FINISHED);
    assert!(game.winner.is_some());
    assert_eq!(game.eliminated.len(), 2); // 2 eliminated, 1 winner
}

// ============================================================================
// Test: 2-player game completes
// ============================================================================
#[test]
fn test_two_player_game_completes() {
    let (env, contract_id, p1, p2, _p3, _hub) = setup_env();
    let client = ZkMafiaContractClient::new(&env, &contract_id);
    let session_id: u32 = 56;

    join_two_players(&env, &client, session_id, &p1, &p2);
    // Bullet in chamber 0 → immediate hit on first shot
    load_revolver(&env, &client, session_id, &p1, 0);

    let proof = BytesN::from_array(&env, &[0xDD; 32]);

    // Turn 0: P1 fires chamber 0 → HIT! Only 1 alive → game over
    assert_eq!(client.disparar(&session_id, &p1, &proof), true);

    let game = client.get_game(&session_id);
    assert_eq!(game.phase, PHASE_FINISHED);
    assert_eq!(game.winner.unwrap(), p2); // P2 is the last alive
    assert_eq!(game.eliminated.len(), 1);
}

// ============================================================================
// Test: Zero ZK proof rejected
// ============================================================================
#[test]
fn test_zero_proof_rejected() {
    let (env, contract_id, p1, p2, p3, _hub) = setup_env();
    let client = ZkMafiaContractClient::new(&env, &contract_id);
    let session_id: u32 = 66;

    join_all_players(&env, &client, session_id, &p1, &p2, &p3);
    load_revolver(&env, &client, session_id, &p1, 3);

    let zero_proof = BytesN::from_array(&env, &[0u8; 32]);
    let result = client.try_disparar(&session_id, &p1, &zero_proof);
    assert!(result.is_err());
}

// ============================================================================
// Test: Wrong player's turn rejected
// ============================================================================
#[test]
fn test_wrong_turn_rejected() {
    let (env, contract_id, p1, p2, p3, _hub) = setup_env();
    let client = ZkMafiaContractClient::new(&env, &contract_id);
    let session_id: u32 = 77;

    join_all_players(&env, &client, session_id, &p1, &p2, &p3);
    load_revolver(&env, &client, session_id, &p1, 4);

    // P2 tries to fire when it's P1's turn
    let proof = BytesN::from_array(&env, &[0xDD; 32]);
    let result = client.try_disparar(&session_id, &p2, &proof);
    assert!(result.is_err());
}

// ============================================================================
// Test: who_is_alive returns 3 initially
// ============================================================================
#[test]
fn test_who_is_alive() {
    let (env, contract_id, p1, p2, p3, _hub) = setup_env();
    let client = ZkMafiaContractClient::new(&env, &contract_id);
    let session_id: u32 = 88;

    join_all_players(&env, &client, session_id, &p1, &p2, &p3);

    let alive = client.who_is_alive(&session_id);
    assert_eq!(alive.len(), 3);
}

// ============================================================================
// Test: compute_bullet_hash is deterministic
// ============================================================================
#[test]
fn test_compute_bullet_hash() {
    let (env, contract_id, _p1, _p2, _p3, _hub) = setup_env();
    let client = ZkMafiaContractClient::new(&env, &contract_id);

    let salt = BytesN::from_array(&env, &[42u8; 32]);
    let hash_pos0 = client.compute_bullet_hash(&salt, &0);
    let hash_pos1 = client.compute_bullet_hash(&salt, &1);

    // Different positions → different hashes
    assert_ne!(hash_pos0, hash_pos1);
    // Deterministic
    assert_eq!(hash_pos0, client.compute_bullet_hash(&salt, &0));
}
