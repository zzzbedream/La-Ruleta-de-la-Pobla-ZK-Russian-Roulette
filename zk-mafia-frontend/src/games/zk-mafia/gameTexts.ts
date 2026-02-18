/**
 * ╔════════════════════════════════════════════════════════════════╗
 * ║  LA RULETA DE LA POBLA — Game Texts                          ║
 * ║  English primary + Chilean slang subtitles                    ║
 * ╚════════════════════════════════════════════════════════════════╝
 *
 * Chilean Slang Glossary:
 *  Pobla     = "Poblacion" — working-class neighborhood
 *  Perkin    = "Sidekick / Lackey" — someone not important
 *  Weon      = "Dude / Bro" — universal Chilean word
 *  Pino      = "Jackpot / Prize" — won the prize
 *  Cortado   = "Cut / Eliminated" — taken out
 *  Gatillo   = "Trigger"
 *  Rajarse   = "To chicken out" / "to be brave" (context-dependent)
 *  Cooperar  = "To die" (dark humor slang)
 */

// ─── Phase Labels ────────────────────────────────────────────────────
export const PHASE_LABELS: Record<number, string> = {
  0: '⏳ Lobby',
  1: '🔫 Playing',
  2: '💀 Game Over',
};

// ─── Main Game Texts ─────────────────────────────────────────────────
export const texts = {
  // ── App / Header ──
  appTitle: 'LA RULETA DE LA POBLA',
  appSubtitle: 'ZK RUSSIAN ROULETTE',
  appTagline: 'Pull the trigger and pray.',
  appTaglineCl: 'Jala el gatillo y reza, perkin.',

  // ── Lobby ──
  lobbyTitle: 'WAITING FOR PLAYERS',
  lobbyTitleCl: 'Esperando a los perkin...',
  lobbyWaiting: 'Need 2-3 brave souls to start the game.',
  lobbyWaitingCl: 'Faltan weones valientes pa la ruleta...',
  lobbyPlayerCount: (n: number) => `${n} players in the lobby (min 2)`,
  lobbySessionLabel: 'Session ID',
  lobbySessionJoinLabel: 'Join Existing Session',
  lobbySessionJoinPlaceholder: 'Paste session ID here...',
  lobbySessionJoinBtn: 'JOIN',
  lobbySessionCopyBtn: 'COPY',
  lobbySessionCopied: 'COPIED',
  lobbySessionNewBtn: 'NEW SESSION',
  lobbyAddressLabel: 'Your Address',
  lobbyJoinBtn: 'ENTER THE GAME',
  lobbyJoinBtnCl: 'Entrar a la Ruleta',
  lobbyJoining: 'JOINING...',
  lobbyPlayersLabel: (n: number) => `Players (${n})`,

  // ── Game Mode ──
  modeTitle: 'Choose your fate',
  modeTitleCl: '(Elige tu destino, weon)',
  modeMultiplayer: 'MULTIPLAYER',
  modeMultiplayerDesc: 'Play with real people',
  modeSingleplayer: 'SOLO MODE',
  modeSingleplayerDesc: 'You vs 1 or 2 bots',

  // ── Playing Phase ──
  playTitle: 'RUSSIAN ROULETTE',
  playTitleCl: '(La Ruleta de la Pobla)',
  playYourTurn: 'YOUR TURN',
  playYourTurnCl: '(¡Te toca a ti, weon!)',
  playWaitTurn: (name: string) => `${name} is pulling the trigger...`,
  playWaitTurnCl: (name: string) => `(${name} esta jalando el gatillo...)`,
  playTriggerBtn: 'GATILLAR',
  playTriggerBtnCl: 'PULL THE TRIGGER',
  playFiring: '...',
  playSurvived: '*CLICK*',
  playSurvivedCl: '¡Te rajaste!',
  playDead: 'BANG.',
  playDeadCl: '¡Cooperaste, weon!',
  playChamberLabel: 'CHAMBER',
  playTurnLabel: 'TURN',
  playShotsLabel: 'SHOTS',

  // ── Tension UX Messages ──
  tensionBuildup: [
    'Click...',
    'Click... Click...',
    '...',
    'The cylinder turns...',
    'Do you feel lucky?',
  ],
  tensionBuildupCl: [
    'Click...',
    'Click... Click...',
    '...',
    'Gira el cilindro...',
    '¿Te sentí con suerte?',
  ],
  tensionResult: {
    survive: 'Empty chamber.',
    surviveAlt: 'Not today.',
    death: 'The bullet was here.',
    deathAlt: 'End of the line.',
  },
  tensionResultCl: {
    survive: 'Recámara vacía.',
    surviveAlt: 'Hoy no, perkin.',
    death: 'La bala era tuya.',
    deathAlt: 'Hasta aquí llegaste.',
  },

  // ── Bot names ──
  botBrayan: 'El Brayan 🧢',
  botKevin: 'El Kevin 🎧',

  // ── Bot chat messages (shown during bot "thinking") ──
  botChatBrayan: [
    'El Brayan: Tengo miedo wn... 😰',
    'El Brayan: Dale no mas po...',
    'El Brayan: Esto va a doler...',
    'El Brayan: Me voy a rajar...',
    'El Brayan: Que pase el que sigue...',
  ],
  botChatKevin: [
    'El Kevin: Dale color no mas 😤',
    'El Kevin: Yo no le tengo miedo a na...',
    'El Kevin: Era po, vamos...',
    'El Kevin: Aqui no se raja nadie...',
    'El Kevin: Mira como se hace, perkin...',
  ],

  // ── Game Over ──
  winTitle: 'SURVIVED',
  winTitleCl: '¡TE LLEVASTE EL PINO, WEON!',
  loseTitle: 'ELIMINATED',
  loseTitleCl: '¡TE FUISTE CORTADO!',
  winDesc: 'Last one standing. The bullet missed you.',
  winDescCl: 'La bala no era pa ti...',
  loseDesc: 'The bullet found you.',
  loseDescCl: 'La bala era tuya, compadre...',
  winnerLabel: (addr: string) => `Winner: ${addr}`,
  eliminatedLabel: (addrs: string) => `Eliminated: ${addrs}`,
  newGameBtn: 'NEW GAME',
  newGameBtnCl: 'Nueva Partida',

  // ── Player status ──
  playerYou: '(you)',
  playerDead: '💀 eliminated',
  playerAlive: '🟢 alive',

  // ── Status messages ──
  actionSuccess: (label: string) => `${label} — Done!`,
  actionFail: (label: string, msg: string) => `${label} failed: ${msg}`,

  // ── Action labels ──
  actionEntrar: 'Enter Game',
  actionDisparar: 'Pull Trigger 🔫',
  actionCargar: 'Load Revolver',

  // ── Game info footer ──
  footerSession: 'Session',
  footerPhase: 'Phase',
  footerContract: 'Contract',
  footerZkInfo: 'ZK Proof: Pedersen Commitment + Noir Circuit (BN254) — Bullet position hidden on-chain',
  footerUnknownPhase: 'Unknown',
  footerBuiltWith: 'Built with Stellar Game Studio',
  footerBuiltWithCl: '(Hecho con el Stellar Game Studio)',

  // ── Config errors ──
  configNoContract: 'Contract Not Configured',
  configNoContractMsg: 'Run bun run setup to deploy testnet contracts.',
  configNoWallets: 'Missing Dev Wallets',
  configNoWalletsMsg: 'Run bun run setup to generate development wallets.',
  configConnecting: 'Connecting Dev Wallet',
  configConnectingMsg: 'The wallet switcher connects Player 1 automatically.',

  // ── Rotating loader messages (hide blockchain, build immersion) ──
  zkLoaderMessages: [
    'Spinning the cylinder...',
    'Checking the chamber...',
    'The mechanism clicks into place...',
    'Counting the chambers...',
    'The revolver feels heavy...',
    'Do you hear that clicking sound?',
    'Someone is sweating...',
    'The table rattles...',
    'A cold wind passes through...',
    'The lights flicker...',
  ],

} as const;

// ─── Error Messages — English + Chilean flavor ───────────────────────
export const zkErrors = {
  proofInvalid: 'Proof is invalid! (Te cacharon, la prueba es trucha 🐀)',
  notYourTurn: 'Wait your turn! (Esperate, no seai ansioso 😒)',
  alreadyDead: 'You\'re already dead, accept it (Ya cooperaste, weon 💀)',
  lobbyFull: 'Lobby is full! (Ya no caben mas perkin 🚫)',
  txTimeout: 'Connection lost... try again (Se cayo la senal 📡)',
  txFailed: 'Transaction failed. Blockchain acting up (La blockchain anda rara 🔧)',
  rpcDown: 'RPC node is down (Mas muerto que los eliminados 💀)',
  insufficientFunds: 'Not enough funds for gas (No te alcanza pa la micro ⛽)',
  unknownError: 'Something went wrong in La Pobla... (Algo salio mal 🤷)',
  tryAgain: 'Try again! (No te rindai 💪)',
} as const;

/**
 * Try to match a technical error to a funny Chilean equivalent.
 */
export function getHumorousError(technicalError: string): string {
  const lower = technicalError.toLowerCase();

  if (lower.includes('proof') && (lower.includes('invalid') || lower.includes('failed'))) {
    return zkErrors.proofInvalid;
  }
  if (lower.includes('not') && lower.includes('turn')) {
    return zkErrors.notYourTurn;
  }
  if (lower.includes('already') && lower.includes('dead')) {
    return zkErrors.alreadyDead;
  }
  if (lower.includes('full') || lower.includes('lobby')) {
    return zkErrors.lobbyFull;
  }
  if (lower.includes('timeout') || lower.includes('timed out')) {
    return zkErrors.txTimeout;
  }
  if (lower.includes('insufficient') || lower.includes('balance')) {
    return zkErrors.insufficientFunds;
  }
  if (lower.includes('rpc') || lower.includes('connection')) {
    return zkErrors.rpcDown;
  }
  if (lower.includes('simulation failed') || lower.includes('invoke host')) {
    return `${zkErrors.txFailed} — ${technicalError.slice(0, 80)}`;
  }

  return `${zkErrors.unknownError}\n(${technicalError.slice(0, 120)})`;
}
