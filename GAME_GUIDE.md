# 🔫 La Ruleta de la Pobla — Game Guide

> **"Jala el gatillo y reza, perkin."** 🇨🇱

La Ruleta de la Pobla is a 2–3 player Russian Roulette game built on [Stellar/Soroban](https://stellar.org) with **zero-knowledge proofs** (Noir + Pedersen BN254). It uses Chilean street slang throughout — this guide explains everything.

---

## 📖 Chilean Slang Glossary

| Chilean Term | English Meaning | Game Context |
|---|---|---|
| **Pobla** (Población) | Working-class neighborhood | The game's setting — a rough Santiago barrio |
| **Ruleta** | Roulette | The game mechanic — Russian Roulette |
| **Perkin** | Sidekick / Lackey | Players joining the game lobby |
| **Weon / Weón** | Dude / Bro | Universal Chilean filler word |
| **Gatillo** | Trigger | The action — pulling the trigger |
| **Jalar** | Pull | "Jalar el gatillo" = pull the trigger |
| **Pellejo** | Skin / Hide | "Salvar el pellejo" = save your skin |
| **Trucha** | Fake / Sketchy | Invalid ZK proofs |
| **Cara de raja** | Shameless / Brazen | Cheating attempts |
| **Le llegó la del tigre** | Got what was coming | Player got eliminated |
| **Po** | "Pues" (sentence filler) | Like "man" at end of sentences |
| **Cachai** | "You get it?" | Understanding confirmation |

---

## 🎮 How the Game Works

### Overview
- **2–3 players** join a session, wagering points
- A **6-chamber revolver** has **one bullet** at a secret position
- Players take turns pulling the trigger
- The cylinder is **static** — each shot advances to the next chamber
- When `current_chamber == bullet_position` → **💀 ELIMINATED**
- If a player dies and 2+ remain, the revolver **auto-reloads** with a new bullet
- **Last player standing wins**

### Game Phases

| Phase | What Happens |
|---|---|
| **EsperandoPerkin** (Lobby) | Players join (need 2–3). Each registers with a point wager. |
| **Cargando** (Load) | Host commits the bullet position as a SHA256 hash. Game Hub `start_game()` is called. |
| **EnJuego** (Playing) | Turn-by-turn: each player calls `disparar` (fire). Contract checks if chamber matches bullet. |
| **Terminado** (Finished) | Last survivor wins. Game Hub `end_game()` is called. |

### Static Cylinder Explained

Unlike real Russian Roulette where you might spin the cylinder between shots, this revolver has a **static cylinder**:

```
Chamber:    [0] [1] [2] [3] [4] [5]
Bullet at:           [2]
                      ↑
Shot 1: chamber 0 → SAFE (click) 😮‍💨
Shot 2: chamber 1 → SAFE (click) 😮‍💨
Shot 3: chamber 2 → HIT! (bang) 💀
```

After elimination, new bullet position = `SHA256(session_id || shots_fired) % 6`

### ZK Commitment Scheme

1. **Before the game:** The host picks a bullet position (0–5) and a random salt
2. **Commitment:** `SHA256(salt || position)` is stored on-chain as `bullet_commitment`
3. **During play:** The contract determines hit/miss by comparing chambers
4. **ZK proof:** A Noir circuit can prove the result is consistent with the commitment, without revealing the bullet position to other players
5. **Anti-cheat:** The Pedersen hash binding means the host can't change the bullet position mid-game

---

## 🧪 Testing Guide

### Prerequisites
```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Install Stellar CLI
cargo install stellar-cli

# Clone and setup
git clone <repo-url>
cd "ZK Mafia Chile"
bun install
```

### Quick Start
```bash
# 1. Setup everything (build, deploy, generate bindings, create .env)
bun run setup

# 2. Start the dev frontend
bun run dev:game zk-mafia
```

### Singleplayer (vs Bots)

The easiest way to test — no wallet switching needed:

1. Open `http://localhost:3001`
2. Player 1 auto-connects
3. Click **"🎮 Singleplayer"**
4. Choose **1 bot** (2P) or **2 bots** (3P)
5. Click **"🚪 Entrar a la Ruleta"** — bots auto-join
6. Click **"🔫 Cargar Revolver"** — bullet committed on-chain
7. On your turn: **"💀 Jalar el Gatillo"** — contract determines hit/miss
8. Bots shoot automatically on their turns
9. Last standing wins!

### Multiplayer (Dev Wallets)

The dev environment provides **3 pre-funded testnet wallets** via the wallet switcher (top-right):

1. **Player 1** — Click "🚪 Entrar a la Ruleta"
2. Switch to **Player 2** — Click "🚪 Entrar a la Ruleta"
3. (Optional) Switch to **Player 3** — Join
4. Any player can click **"🔫 Cargar Revolver"** once 2+ are in
5. Take turns pulling the trigger
6. Watch the tension build as chambers advance...

### What to Watch For

- **Lobby fills up:** Counter shows "X/3 perkins en la mesa"
- **Revolver loads:** Transaction confirms, bullet commitment stored
- **Trigger pull:** Tension animation → result (SAFE or ELIMINATED)
- **Auto-reload:** After elimination with 2+ remaining, new bullet position calculated
- **Victory:** "🏆 ¡El último weon en pie!" with neon green celebration

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| Blank screen on load | Check browser console. If ESM error, verify `bindings.ts` has no `export *` |
| Transaction fails | Check `.env` has correct contract ID and testnet keys |
| Bot doesn't join | Refresh and try singleplayer mode again |
| "Game not found" | Start a new session (game state may have expired from temp storage) |
| Build errors | Run `bun install` then `bun run build zk-mafia` |

---

## 📊 Contract Functions Reference

| Function | Parameters | Purpose |
|----------|-----------|---------|
| `entrar_a_la_ruleta` | `session_id, player, points` | Join lobby, wager points |
| `cargar_revolver` | `session_id, player, bullet_commitment, bullet_position` | Commit bullet + start game |
| `disparar` | `session_id, player, zk_proof` | Pull trigger (contract determines result) |
| `get_game` | `session_id` | Read full game state |
| `who_is_alive` | `session_id` | List surviving players |
| `compute_bullet_hash` | `session_id, position` | Compute SHA256 commitment |
