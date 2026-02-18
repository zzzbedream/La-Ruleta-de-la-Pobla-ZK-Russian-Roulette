import { Client as LaRuletaClient } from './bindings';
import { NETWORK_PASSPHRASE, RPC_URL, DEFAULT_METHOD_OPTIONS } from '@/utils/constants';
import { contract } from '@stellar/stellar-sdk';
import { signAndSendViaLaunchtube } from '@/utils/transactionHelper';
import { calculateValidUntilLedger } from '@/utils/ledgerUtils';

type ClientOptions = contract.ClientOptions;

// Phase constants matching contract
export const PHASE_WAITING = 0;
export const PHASE_PLAYING = 1;
export const PHASE_FINISHED = 2;

export const PHASE_LABELS: Record<number, string> = {
  [PHASE_WAITING]: '⏳ Waiting',
  [PHASE_PLAYING]: '🔫 Playing',
  [PHASE_FINISHED]: '💀 Finished',
};

/** Game state from the contract */
export interface PartidaRuleta {
  players: Jugador[];
  phase: number;
  current_turn: number;
  current_chamber: number;
  bullet_commitment: Uint8Array;
  bullet_position: number;
  eliminated: string[];
  winner: string | null;
  session_id: number;
  shots_fired: number;
  hub_player1: string;
  hub_player2: string;
}

export interface Jugador {
  address: string;
  is_alive: boolean;
  points: bigint;
}

/**
 * Service for interacting with La Ruleta de la Pobla (ZK Russian Roulette) contract.
 * 2-3 player game with static cylinder. Contract determines hit/miss.
 */
export class ZkMafiaService {
  private baseClient: LaRuletaClient;
  private contractId: string;

  constructor(contractId: string) {
    this.contractId = contractId;
    this.baseClient = new LaRuletaClient({
      contractId: this.contractId,
      networkPassphrase: NETWORK_PASSPHRASE,
      rpcUrl: RPC_URL,
    });
  }

  private createSigningClient(
    publicKey: string,
    signer: Pick<ClientOptions, 'signTransaction' | 'signAuthEntry'>
  ): LaRuletaClient {
    return new LaRuletaClient({
      contractId: this.contractId,
      networkPassphrase: NETWORK_PASSPHRASE,
      rpcUrl: RPC_URL,
      publicKey,
      ...signer,
    });
  }

  // ========================================================================
  // Read-only queries
  // ========================================================================

  async getGame(sessionId: number): Promise<PartidaRuleta | null> {
    try {
      const tx = await this.baseClient.get_game({ session_id: sessionId });
      const result = await tx.simulate();
      if (result.result.isOk()) {
        return result.result.unwrap() as unknown as PartidaRuleta;
      }
      return null;
    } catch {
      return null;
    }
  }

  async whoIsAlive(sessionId: number): Promise<string[]> {
    try {
      const tx = await this.baseClient.who_is_alive({ session_id: sessionId });
      const result = await tx.simulate();
      if (result.result.isOk()) {
        return result.result.unwrap() as unknown as string[];
      }
      return [];
    } catch {
      return [];
    }
  }

  // ========================================================================
  // Crypto helpers (client-side)
  // ========================================================================

  /** Generate a random 32-byte salt */
  generateSalt(): Uint8Array {
    const salt = new Uint8Array(32);
    crypto.getRandomValues(salt);
    return salt;
  }

  /** Pick a random bullet position (0..5) */
  generateBulletPosition(): number {
    return Math.floor(Math.random() * 6);
  }

  /** Compute SHA256(salt || position_byte) — mirrors on-chain compute_bullet_hash */
  async computeBulletCommitment(salt: Uint8Array, position: number): Promise<Uint8Array> {
    const preimage = new Uint8Array(32 + 1);
    preimage.set(salt, 0);
    preimage[32] = position;
    const hashBuffer = await crypto.subtle.digest('SHA-256', preimage);
    return new Uint8Array(hashBuffer);
  }

  /**
   * Generate ZK proof data for a shot.
   * Full BN254 flow would call noir_wasm to generate proof.
   * For SHA256 fallback: random non-zero 32 bytes.
   */
  generateZkProof(): Uint8Array {
    const proof = new Uint8Array(32);
    crypto.getRandomValues(proof);
    if (proof.every(b => b === 0)) proof[0] = 1;
    return proof;
  }

  // ========================================================================
  // Transaction methods
  // ========================================================================

  /** Join the lobby: entrar_a_la_ruleta */
  async entrarALaRuleta(
    sessionId: number,
    player: string,
    points: bigint,
    signer: Pick<ClientOptions, 'signTransaction' | 'signAuthEntry'>
  ) {
    const client = this.createSigningClient(player, signer);
    const tx = await client.entrar_a_la_ruleta({
      session_id: sessionId,
      player,
      points,
    }, DEFAULT_METHOD_OPTIONS);

    const validUntil = await calculateValidUntilLedger(RPC_URL, 5);
    return await signAndSendViaLaunchtube(tx, DEFAULT_METHOD_OPTIONS.timeoutInSeconds, validUntil);
  }

  /** Host loads the revolver: cargar_revolver */
  async cargarRevolver(
    sessionId: number,
    player: string,
    bulletCommitment: Buffer,
    bulletPosition: number,
    signer: Pick<ClientOptions, 'signTransaction' | 'signAuthEntry'>
  ) {
    const client = this.createSigningClient(player, signer);
    const tx = await client.cargar_revolver({
      session_id: sessionId,
      player,
      bullet_commitment: bulletCommitment,
      bullet_position: bulletPosition,
    }, DEFAULT_METHOD_OPTIONS);

    const validUntil = await calculateValidUntilLedger(RPC_URL, 5);
    return await signAndSendViaLaunchtube(tx, DEFAULT_METHOD_OPTIONS.timeoutInSeconds, validUntil);
  }

  /** Pull the trigger: disparar (contract determines hit/miss via static cylinder) */
  async disparar(
    sessionId: number,
    player: string,
    zkProof: Buffer,
    signer: Pick<ClientOptions, 'signTransaction' | 'signAuthEntry'>
  ) {
    const client = this.createSigningClient(player, signer);
    const tx = await client.disparar({
      session_id: sessionId,
      player,
      zk_proof: zkProof,
    }, DEFAULT_METHOD_OPTIONS);

    const validUntil = await calculateValidUntilLedger(RPC_URL, 5);
    return await signAndSendViaLaunchtube(tx, DEFAULT_METHOD_OPTIONS.timeoutInSeconds, validUntil);
  }
}
