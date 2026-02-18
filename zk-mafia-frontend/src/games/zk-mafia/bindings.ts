import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
// Re-exports removed to avoid Vite ESM interop issues.
// Import directly from @stellar/stellar-sdk if needed.

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}


export const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CDNAQVX6I4IAGMQAOPJOMH33G7XOTEHXC6ILDSKAS3ZMGGSHJXTH7VVA",
  }
} as const

export const Errors = {
  1: {message:"GameNotFound"},
  2: {message:"NotPlayer"},
  3: {message:"WrongPhase"},
  4: {message:"NotYourTurn"},
  5: {message:"GameAlreadyEnded"},
  6: {message:"LobbyFull"},
  7: {message:"AlreadyJoined"},
  8: {message:"PlayerEliminated"},
  9: {message:"InvalidProof"},
  10: {message:"InvalidChamber"},
  11: {message:"NotEnoughPlayers"},
  12: {message:"AlreadyStarted"}
}

export type DataKey = {tag: "Game", values: readonly [u32]} | {tag: "GameHubAddress", values: void} | {tag: "Admin", values: void};


export interface Jugador {
  address: string;
  is_alive: boolean;
  points: i128;
}


export interface PartidaRuleta {
  bullet_commitment: Buffer;
  bullet_position: u32;
  current_chamber: u32;
  current_turn: u32;
  eliminated: Array<string>;
  hub_player1: string;
  hub_player2: string;
  phase: u32;
  players: Array<Jugador>;
  session_id: u32;
  shots_fired: u32;
  winner: Option<string>;
}

export interface Client {
  /**
   * Construct and simulate a get_hub transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_hub: (options?: MethodOptions) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a set_hub transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_hub: ({new_hub}: {new_hub: string}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a upgrade transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  upgrade: ({new_wasm_hash}: {new_wasm_hash: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a disparar transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * The current player pulls the trigger. The contract determines
   * whether this chamber holds the bullet (static cylinder).
   * `current_chamber` increments each shot. When it equals
   * `bullet_position` → guaranteed death.
   * 
   * After elimination, if 2+ players remain, the cylinder auto-reloads
   * with a new deterministic bullet position for the next round.
   * 
   * # Returns
   * `true` if the player was hit (eliminated), `false` if survived.
   */
  disparar: ({session_id, player, zk_proof}: {session_id: u32, player: string, zk_proof: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<boolean>>>

  /**
   * Construct and simulate a get_game transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get full game state
   */
  get_game: ({session_id}: {session_id: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Result<PartidaRuleta>>>

  /**
   * Construct and simulate a get_admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_admin: (options?: MethodOptions) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a set_admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_admin: ({new_admin}: {new_admin: string}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a who_is_alive transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get alive players
   */
  who_is_alive: ({session_id}: {session_id: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Result<Array<string>>>>

  /**
   * Construct and simulate a cargar_revolver transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * The first player (host) sets the bullet position and starts the game.
   * Requires at least 2 players (max 3).
   * Also registers the session with the Game Hub.
   */
  cargar_revolver: ({session_id, player, bullet_commitment, bullet_position}: {session_id: u32, player: string, bullet_commitment: Buffer, bullet_position: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a entrar_a_la_ruleta transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Register a player into the session. Supports 2-3 players.
   * The host must call `cargar_revolver` once enough players have joined.
   */
  entrar_a_la_ruleta: ({session_id, player, points}: {session_id: u32, player: string, points: i128}, options?: MethodOptions) => Promise<AssembledTransaction<Result<u32>>>

  /**
   * Construct and simulate a compute_bullet_hash transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * SHA256 commitment helper (for off-chain use and testing)
   * Returns SHA256(salt_bytes || position_byte)
   */
  compute_bullet_hash: ({salt, position}: {salt: Buffer, position: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Buffer>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
        /** Constructor/Initialization Args for the contract's `__constructor` method */
        {admin, game_hub}: {admin: string, game_hub: string},
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy({admin, game_hub}, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAADAAAAAAAAAAMR2FtZU5vdEZvdW5kAAAAAQAAAAAAAAAJTm90UGxheWVyAAAAAAAAAgAAAAAAAAAKV3JvbmdQaGFzZQAAAAAAAwAAAAAAAAALTm90WW91clR1cm4AAAAABAAAAAAAAAAQR2FtZUFscmVhZHlFbmRlZAAAAAUAAAAAAAAACUxvYmJ5RnVsbAAAAAAAAAYAAAAAAAAADUFscmVhZHlKb2luZWQAAAAAAAAHAAAAAAAAABBQbGF5ZXJFbGltaW5hdGVkAAAACAAAAAAAAAAMSW52YWxpZFByb29mAAAACQAAAAAAAAAOSW52YWxpZENoYW1iZXIAAAAAAAoAAAAAAAAAEE5vdEVub3VnaFBsYXllcnMAAAALAAAAAAAAAA5BbHJlYWR5U3RhcnRlZAAAAAAADA==",
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAAAwAAAAEAAAAAAAAABEdhbWUAAAABAAAABAAAAAAAAAAAAAAADkdhbWVIdWJBZGRyZXNzAAAAAAAAAAAAAAAAAAVBZG1pbgAAAA==",
        "AAAAAQAAAAAAAAAAAAAAB0p1Z2Fkb3IAAAAAAwAAAAAAAAAHYWRkcmVzcwAAAAATAAAAAAAAAAhpc19hbGl2ZQAAAAEAAAAAAAAABnBvaW50cwAAAAAACw==",
        "AAAAAQAAAAAAAAAAAAAADVBhcnRpZGFSdWxldGEAAAAAAAAMAAAAAAAAABFidWxsZXRfY29tbWl0bWVudAAAAAAAA+4AAAAgAAAAAAAAAA9idWxsZXRfcG9zaXRpb24AAAAABAAAAAAAAAAPY3VycmVudF9jaGFtYmVyAAAAAAQAAAAAAAAADGN1cnJlbnRfdHVybgAAAAQAAAAAAAAACmVsaW1pbmF0ZWQAAAAAA+oAAAATAAAAAAAAAAtodWJfcGxheWVyMQAAAAATAAAAAAAAAAtodWJfcGxheWVyMgAAAAATAAAAAAAAAAVwaGFzZQAAAAAAAAQAAAAAAAAAB3BsYXllcnMAAAAD6gAAB9AAAAAHSnVnYWRvcgAAAAAAAAAACnNlc3Npb25faWQAAAAAAAQAAAAAAAAAC3Nob3RzX2ZpcmVkAAAAAAQAAAAAAAAABndpbm5lcgAAAAAD6AAAABM=",
        "AAAAAAAAAAAAAAAHZ2V0X2h1YgAAAAAAAAAAAQAAABM=",
        "AAAAAAAAAAAAAAAHc2V0X2h1YgAAAAABAAAAAAAAAAduZXdfaHViAAAAABMAAAAA",
        "AAAAAAAAAAAAAAAHdXBncmFkZQAAAAABAAAAAAAAAA1uZXdfd2FzbV9oYXNoAAAAAAAD7gAAACAAAAAA",
        "AAAAAAAAAaFUaGUgY3VycmVudCBwbGF5ZXIgcHVsbHMgdGhlIHRyaWdnZXIuIFRoZSBjb250cmFjdCBkZXRlcm1pbmVzCndoZXRoZXIgdGhpcyBjaGFtYmVyIGhvbGRzIHRoZSBidWxsZXQgKHN0YXRpYyBjeWxpbmRlcikuCmBjdXJyZW50X2NoYW1iZXJgIGluY3JlbWVudHMgZWFjaCBzaG90LiBXaGVuIGl0IGVxdWFscwpgYnVsbGV0X3Bvc2l0aW9uYCDihpIgZ3VhcmFudGVlZCBkZWF0aC4KCkFmdGVyIGVsaW1pbmF0aW9uLCBpZiAyKyBwbGF5ZXJzIHJlbWFpbiwgdGhlIGN5bGluZGVyIGF1dG8tcmVsb2Fkcwp3aXRoIGEgbmV3IGRldGVybWluaXN0aWMgYnVsbGV0IHBvc2l0aW9uIGZvciB0aGUgbmV4dCByb3VuZC4KCiMgUmV0dXJucwpgdHJ1ZWAgaWYgdGhlIHBsYXllciB3YXMgaGl0IChlbGltaW5hdGVkKSwgYGZhbHNlYCBpZiBzdXJ2aXZlZC4AAAAAAAAIZGlzcGFyYXIAAAADAAAAAAAAAApzZXNzaW9uX2lkAAAAAAAEAAAAAAAAAAZwbGF5ZXIAAAAAABMAAAAAAAAACHprX3Byb29mAAAD7gAAACAAAAABAAAD6QAAAAEAAAAD",
        "AAAAAAAAABNHZXQgZnVsbCBnYW1lIHN0YXRlAAAAAAhnZXRfZ2FtZQAAAAEAAAAAAAAACnNlc3Npb25faWQAAAAAAAQAAAABAAAD6QAAB9AAAAANUGFydGlkYVJ1bGV0YQAAAAAAAAM=",
        "AAAAAAAAAAAAAAAJZ2V0X2FkbWluAAAAAAAAAAAAAAEAAAAT",
        "AAAAAAAAAAAAAAAJc2V0X2FkbWluAAAAAAAAAQAAAAAAAAAJbmV3X2FkbWluAAAAAAAAEwAAAAA=",
        "AAAAAAAAABFHZXQgYWxpdmUgcGxheWVycwAAAAAAAAx3aG9faXNfYWxpdmUAAAABAAAAAAAAAApzZXNzaW9uX2lkAAAAAAAEAAAAAQAAA+kAAAPqAAAAEwAAAAM=",
        "AAAAAAAAACtDb25zdHJ1Y3Rvcjogc3RvcmUgYWRtaW4gKyBHYW1lIEh1YiBhZGRyZXNzAAAAAA1fX2NvbnN0cnVjdG9yAAAAAAAAAgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAhnYW1lX2h1YgAAABMAAAAA",
        "AAAAAAAAAJhUaGUgZmlyc3QgcGxheWVyIChob3N0KSBzZXRzIHRoZSBidWxsZXQgcG9zaXRpb24gYW5kIHN0YXJ0cyB0aGUgZ2FtZS4KUmVxdWlyZXMgYXQgbGVhc3QgMiBwbGF5ZXJzIChtYXggMykuCkFsc28gcmVnaXN0ZXJzIHRoZSBzZXNzaW9uIHdpdGggdGhlIEdhbWUgSHViLgAAAA9jYXJnYXJfcmV2b2x2ZXIAAAAABAAAAAAAAAAKc2Vzc2lvbl9pZAAAAAAABAAAAAAAAAAGcGxheWVyAAAAAAATAAAAAAAAABFidWxsZXRfY29tbWl0bWVudAAAAAAAA+4AAAAgAAAAAAAAAA9idWxsZXRfcG9zaXRpb24AAAAABAAAAAEAAAPpAAAAAgAAAAM=",
        "AAAAAAAAAH9SZWdpc3RlciBhIHBsYXllciBpbnRvIHRoZSBzZXNzaW9uLiBTdXBwb3J0cyAyLTMgcGxheWVycy4KVGhlIGhvc3QgbXVzdCBjYWxsIGBjYXJnYXJfcmV2b2x2ZXJgIG9uY2UgZW5vdWdoIHBsYXllcnMgaGF2ZSBqb2luZWQuAAAAABJlbnRyYXJfYV9sYV9ydWxldGEAAAAAAAMAAAAAAAAACnNlc3Npb25faWQAAAAAAAQAAAAAAAAABnBsYXllcgAAAAAAEwAAAAAAAAAGcG9pbnRzAAAAAAALAAAAAQAAA+kAAAAEAAAAAw==",
        "AAAAAAAAAGRTSEEyNTYgY29tbWl0bWVudCBoZWxwZXIgKGZvciBvZmYtY2hhaW4gdXNlIGFuZCB0ZXN0aW5nKQpSZXR1cm5zIFNIQTI1NihzYWx0X2J5dGVzIHx8IHBvc2l0aW9uX2J5dGUpAAAAE2NvbXB1dGVfYnVsbGV0X2hhc2gAAAAAAgAAAAAAAAAEc2FsdAAAA+4AAAAgAAAAAAAAAAhwb3NpdGlvbgAAAAQAAAABAAAD7gAAACA=" ]),
      options
    )
  }
  public readonly fromJSON = {
    get_hub: this.txFromJSON<string>,
        set_hub: this.txFromJSON<null>,
        upgrade: this.txFromJSON<null>,
        disparar: this.txFromJSON<Result<boolean>>,
        get_game: this.txFromJSON<Result<PartidaRuleta>>,
        get_admin: this.txFromJSON<string>,
        set_admin: this.txFromJSON<null>,
        who_is_alive: this.txFromJSON<Result<Array<string>>>,
        cargar_revolver: this.txFromJSON<Result<void>>,
        entrar_a_la_ruleta: this.txFromJSON<Result<u32>>,
        compute_bullet_hash: this.txFromJSON<Buffer>
  }
}