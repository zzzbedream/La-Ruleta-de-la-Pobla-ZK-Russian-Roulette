# 🎬 Video Script — La Ruleta de la Pobla (2–3 min)

> **Style:** Energetic, confident narrator. Slightly dramatic, slightly street.
> **Duration:** 120–180 seconds.
> **Tool:** OBS screen recording. One browser window (singleplayer mode).

---

## 0:00 – 0:15 | HOOK

**Visual:** Title screen — dark neon UI, the revolver chamber animation, "La Ruleta de la Pobla" text with glowing red accent. Slow zoom in.

**Audio (narration):**
> "¿Qué pasa cuando mezclas Ruleta Rusa con Zero-Knowledge Proofs en Stellar?
>
> **La Ruleta de la Pobla.** Un juego donde cada gatillazo se verifica on-chain, pero nadie sabe dónde está la bala.
>
> 2 a 3 jugadores. Un revólver. Una bala escondida detrás de criptografía."

**English translation (subtitle option):**
> "What happens when you mix Russian Roulette with Zero-Knowledge Proofs on Stellar? La Ruleta de la Pobla. A game where every trigger pull is verified on-chain, but nobody knows where the bullet is."

---

## 0:15 – 0:40 | THE ZK MECHANIC (The Money Shot)

**Visual:** Show the Noir circuit code briefly (`main.nr`), then a diagram:
```
Host commits: pedersen_hash([salt, bullet_position]) → commitment stored on-chain
Each turn: ZK proof verifies hit/miss matches commitment — WITHOUT revealing bullet position
```

**Audio:**
> "Acá está la magia. Antes de empezar, el host esconde la bala en una posición del cilindro usando un **Pedersen hash** — un compromiso criptográfico verificable con un circuito Noir en curva BN254.
>
> Esto significa que el contrato puede verificar que cada resultado — si fue *click* o *bang* — es correcto y consistente con el compromiso original... **sin nunca revelar dónde está la bala**.
>
> Si alguien intenta mentir, el circuit rechaza la prueba. *Trampa imposible.*"

**English translation:**
> "Here's the magic. Before the game starts, the host hides the bullet using a Pedersen hash — a cryptographic commitment verifiable with a Noir circuit on BN254. The contract verifies every hit/miss is correct without ever revealing where the bullet is. If someone tries to cheat, the circuit rejects the proof."

---

## 0:40 – 1:15 | GAMEPLAY DEMO

**Visual:** Show a LIVE singleplayer game in the browser.

### Step 1: Join (5 seconds)
**Visual:** Click "Singleplayer". Select "1 Bot". Click "🚪 Entrar a la Ruleta". Show bot auto-joining.

**Audio:**
> "Entro a la ruleta. El bot entra automáticamente. Ahora somos dos — mínimo para jugar."

### Step 2: Load Revolver (10 seconds)
**Visual:** Click "🔫 Cargar Revolver". Show the loading animation. Highlight the transaction confirmation.

**Audio:**
> "Cargo el revólver. Acá pasan dos cosas on-chain: primero, el **bullet commitment** — el hash de la posición secreta — se guarda en el contrato Soroban. Segundo, se llama `start_game()` en el **Game Hub del hackathon**."

### Step 3: Pull Trigger — Survive! (10 seconds)
**Visual:** My turn. Click "💀 Jalar el Gatillo". Show the tension animation. **CLICK! Safe!** Show the green "Survived" animation.

**Audio:**
> "Mi turno. Jalo el gatillo... ¡CLICK! Salvé el pellejo. El current_chamber avanzó, pero no coincidió con la bullet_position. El contrato lo verificó on-chain."

### Step 4: Bot's Turn (10 seconds)
**Visual:** Bot shoots automatically. Show either a miss or a hit.

**Audio (if bot survives):**
> "Turno del bot. También sobrevivió. El cilindro avanza..."

**Audio (if bot dies):**
> "Turno del bot... ¡BANG! 💀 Al bot le llegó la del tigre. El cilindro estático no perdona."

### Step 5: Victory (5 seconds)
**Visual:** Show the victory screen with neon green "🏆 ¡El último weon en pie!" animation.

**Audio:**
> "¡Gané! El contrato llama `end_game()` en el Game Hub. Todo registrado on-chain."

---

## 1:15 – 1:45 | ON-CHAIN + ARCHITECTURE

**Visual:** Show a split view:
- Left: the contract code in `lib.rs` (highlight `start_game`, `disparar`, `end_game`)
- Right: Stellar Expert showing the contract transactions

**Audio:**
> "El smart contract en Soroban maneja todo el estado del juego.
>
> Cuando la partida empieza, llama `start_game()` en el Game Hub del hackathon — registrando los jugadores y sus puntos.
>
> Cada disparo es una transacción que verifica el turno, avanza la cámara, y determina si la bala conectó.
>
> Cuando queda un solo jugador vivo, llama `end_game()`. Todo el ciclo de vida — registrado on-chain."

**Visual:** Flash the key contract addresses:
```
Contract: CDNAQVX6I4IAGMQAOPJOMH33G7XOTEHXC6ILDSKAS3ZMGGSHJXTH7VVA
Game Hub: CB4VZAT2U3UC6XFK3N23SKRF2NDCMP3QHJYMCHHFMZO7MRQO6DQ2EMYG
```

---

## 1:45 – 2:10 | TECH STACK OVERVIEW

**Visual:** Show the architecture diagram from the README (or a clean version):
```
Noir Circuit (Pedersen BN254) ──▶ ZK Commitment
         ↓
React 19 + framer-motion ──▶ Frontend UI
         ↓
Soroban SDK (Rust) ──▶ Smart Contract
         ↓
Stellar Testnet ──▶ Game Hub Integration
```

**Audio:**
> "El stack:
> - **Noir** para el circuito ZK con hashes Pedersen en curva BN254
> - **Soroban** para el contrato inteligente en Rust — 12 tests pasando
> - **React 19** con framer-motion para las animaciones del revólver
> - **Game Hub** del hackathon para lifecycle events
>
> El circuito tiene 6 tests. El contrato tiene 12. Cero errores de TypeScript."

---

## 2:10 – 2:30 | DETERMINISTIC DESIGN

**Visual:** Show the auto-reload formula: `SHA256(session_id || shots_fired) % 6`

**Audio:**
> "Un detalle clave: el juego es **determinístico**. Nada de ledger time ni sequence para randomness.
>
> Después de cada eliminación, la nueva posición de la bala se calcula con `SHA256(session_id || shots_fired) mod 6`. Reproducible. Verificable. Exactamente lo que necesita un juego on-chain."

---

## 2:30 – 2:50 | OUTRO

**Visual:** Return to the game UI. Show the dark neon aesthetic. End with:
- **La Ruleta de la Pobla** 🔫🇨🇱
- GitHub repo URL
- Tech stack icons: Stellar | Soroban | Noir | React | BN254

**Audio:**
> "**La Ruleta de la Pobla.** Ruleta Rusa verificable con Zero-Knowledge Proofs en Stellar.
>
> Construido con Noir, Soroban, y pura cultura callejera chilena.
>
> Para el ZK Gaming Hackathon. *¡A ganar, weon!*"

---

## 📋 Recording Checklist

- [ ] OBS installed and configured (1080p, 30fps)
- [ ] Dev server running (`bun run dev:game zk-mafia`)
- [ ] Contract deployed and `.env` configured
- [ ] Test a full game BEFORE recording (make sure it works end-to-end)
- [ ] Have Stellar Expert open for on-chain verification shot
- [ ] Plan whether to narrate live or add voiceover in post

## 🎯 Key Points to Hit for Judges

1. **ZK is meaningful** — Pedersen commitment hides bullet position, Noir circuit verifies consistency
2. **On-chain lifecycle** — `start_game()` and `end_game()` called on the hackathon Game Hub
3. **Deterministic** — No ledger time/sequence randomness; SHA256 reseeding
4. **Tested** — 12 contract tests + 6 circuit tests
5. **Playable** — Real frontend, real game, real fun

## ⏱️ Timing Guide

| Segment | Duration | Cumulative |
|---------|----------|------------|
| Hook | 15s | 0:15 |
| ZK Mechanic | 25s | 0:40 |
| Gameplay Demo | 35s | 1:15 |
| On-chain Architecture | 30s | 1:45 |
| Tech Stack | 25s | 2:10 |
| Deterministic Design | 20s | 2:30 |
| Outro | 20s | 2:50 |
| **Total** | **~2:50** | |
