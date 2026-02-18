# 🎭 ZK Mafia — Kill Without Revealing Identity

**Zero-Knowledge Mafia Game on Stellar** — A two-player bluffing game where the Mafia must execute a kill without revealing their identity, using SHA256 hash commitments as a ZK proof mock.

## 🇨🇱 ZK Mafia Chile — Stellar Hackathon Entry

### How It Works

The game uses a **SHA256 commit-reveal scheme** as a mock for Zero-Knowledge proofs. This is the same foundational principle behind real ZK protocols (BN254 curves, Noir/UltraHonk): **prove knowledge without revealing it**.

### Game Flow (5 Phases)

```
Phase 0: START       → Two players join, roles assigned (Mafia/Villager)
Phase 1: COMMIT      → Each player commits SHA256(role || nonce)
Phase 2: NIGHT       → Mafia submits kill order + hash proof
Phase 3: DAY VOTE    → Villager votes to accuse a suspect
Phase 4: REVEAL      → Both reveal roles, contract verifies SHA256
Phase 5: RESOLVE     → Winner determined, reported to Game Hub
```

### ZK Mock: SHA256 Commitment Scheme

```
Commitment = SHA256(role_byte || nonce_32bytes)

- Player commits hash → role hidden on-chain
- Night action has hash proof → anonymous kill
- Reveal provides preimage → contract verifies hash match
- If hash doesn't match → cheater detected!
```

**Why this works as a ZK prototype:**
- Proves knowledge of role without revealing it
- On-chain verification without storing secrets
- Same commit-reveal pattern used in real ZK protocols
- Full BN254 implementation via `rs-soroban-ultrahonk` in progress

### Win Conditions

- **Mafia wins** if the village votes wrong (kill successful! 🔪)
- **Villager wins** if they correctly identify the Mafia (🎉)

### Contract Functions

| Function | Description |
|---|---|
| `start_game` | Create game, assign roles via deterministic seed |
| `commit_role` | Submit SHA256(role \|\| nonce) commitment |
| `night_action` | Mafia submits anonymous kill + hash proof |
| `day_vote` | Villager accuses a suspect |
| `reveal_role` | Reveal preimage, contract verifies SHA256 |
| `resolve_game` | Determine winner, report to Game Hub |
| `get_role` | Query role from seed (helper) |
| `compute_hash` | On-chain SHA256 for testing |

### Tech Stack

- **Smart Contract**: Soroban (Rust, `no_std`)
- **ZK Mock**: SHA256 via `env.crypto().sha256()`
- **Frontend**: React + TypeScript + Vite
- **Network**: Stellar Testnet
- **Game Hub**: `CB4VZAT2U3UC6XFK3N23SKRF2NDCMP3QHJYMCHHFMZO7MRQO6DQ2EMYG`

### Build & Deploy

```bash
bun run build zk-mafia      # Compile to WASM
bun run deploy zk-mafia      # Deploy to testnet
bun run bindings zk-mafia    # Generate TS bindings
bun run dev:game zk-mafia    # Start dev frontend
cargo test -p zk-mafia       # Run unit tests
```

### Tests

3 passing tests:
- `test_full_game_flow_mafia_wins` — Mafia wins when vote is wrong
- `test_full_game_flow_villager_wins` — Villager catches the Mafia
- `test_invalid_reveal_fails` — Wrong nonce rejected by SHA256 verification
