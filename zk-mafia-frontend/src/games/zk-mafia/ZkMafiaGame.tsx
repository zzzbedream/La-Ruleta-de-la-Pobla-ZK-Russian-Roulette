import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ZkMafiaService,
  type PartidaRuleta,
  PHASE_WAITING,
  PHASE_PLAYING,
  PHASE_FINISHED,
} from './zkMafiaService';
import { texts, PHASE_LABELS, getHumorousError } from './gameTexts';
import { useWallet } from '@/hooks/useWallet';
import { ZK_MAFIA_CONTRACT } from '@/utils/constants';
import { Buffer } from 'buffer';
import { Keypair, TransactionBuilder, hash } from '@stellar/stellar-sdk';
import type { ContractSigner } from '@/types/signer';
import './ZkMafiaGame.css';

// --- Bot wallet helpers ---
const BOT_SECRETS: Record<number, string> = {
  2: import.meta.env.VITE_DEV_PLAYER2_SECRET || '',
  3: import.meta.env.VITE_DEV_PLAYER3_SECRET || '',
};
const BOT_ADDRESSES: Record<number, string> = {
  2: import.meta.env.VITE_DEV_PLAYER2_ADDRESS || '',
  3: import.meta.env.VITE_DEV_PLAYER3_ADDRESS || '',
};

function createBotSigner(playerNumber: 2 | 3): { address: string; signer: ContractSigner } {
  const secret = BOT_SECRETS[playerNumber];
  if (!secret) throw new Error(`Bot player ${playerNumber} secret not available`);
  const keypair = Keypair.fromSecret(secret);
  const publicKey = keypair.publicKey();
  return {
    address: publicKey,
    signer: {
      signTransaction: async (txXdr: string, opts?: any) => {
        try {
          const transaction = TransactionBuilder.fromXDR(txXdr, opts?.networkPassphrase);
          transaction.sign(keypair);
          return { signedTxXdr: transaction.toXDR(), signerAddress: publicKey };
        } catch (error) {
          return { signedTxXdr: txXdr, signerAddress: publicKey, error: { message: String(error), code: -1 } };
        }
      },
      signAuthEntry: async (preimageXdr: string) => {
        try {
          const preimageBytes = Buffer.from(preimageXdr, 'base64');
          const payload = hash(preimageBytes);
          const signatureBytes = keypair.sign(payload);
          return { signedAuthEntry: Buffer.from(signatureBytes).toString('base64'), signerAddress: publicKey };
        } catch (error) {
          return { signedAuthEntry: preimageXdr, signerAddress: publicKey, error: { message: String(error), code: -1 } };
        }
      },
    },
  };
}

const service = new ZkMafiaService(ZK_MAFIA_CONTRACT);
const NUM_CHAMBERS = 6;

// --- Helpers ---
const getInitialSessionId = (): number => {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('session');
  if (fromUrl && !isNaN(Number(fromUrl))) return Number(fromUrl);
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] || 1;
};

const syncSessionToUrl = (id: number) => {
  const url = new URL(window.location.href);
  url.searchParams.set('session', String(id));
  window.history.replaceState({}, '', url.toString());
};

const shortAddr = (addr: string) => `${addr.slice(0, 6)}\u2026${addr.slice(-4)}`;

const BOT_NAMES = ['El Brayan', 'El Kevin'];
const BOT_ICONS = ['\uD83E\uDDE2', '\uD83C\uDFA7'];

// --- Sub-Components ---

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 ml-2">
      <span className="typing-dot w-1.5 h-1.5 rounded-full bg-current" />
      <span className="typing-dot w-1.5 h-1.5 rounded-full bg-current" />
      <span className="typing-dot w-1.5 h-1.5 rounded-full bg-current" />
    </span>
  );
}

function HudStat({ label, value, color = '#8a8490' }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="hud-stat">{label}</span>
      <span className="hud-stat-value text-sm" style={{ color }}>{value}</span>
    </div>
  );
}

function BotAvatar({
  name, icon, isAlive, isTurn, chat, index,
}: {
  name: string; icon: string; isAlive: boolean; isTurn: boolean; chat: string; index: number;
}) {
  return (
    <motion.div
      className={`relative flex flex-col items-center ${!isAlive ? 'avatar-dead' : isTurn ? 'avatar-turn' : 'avatar-alive'}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.15, duration: 0.5 }}
      style={{
        padding: '0.75rem', borderRadius: '12px', minWidth: '100px',
        background: isTurn ? 'rgba(255, 110, 39, 0.08)' : 'rgba(255, 255, 255, 0.02)',
        border: isTurn ? '1px solid rgba(255, 110, 39, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)',
      }}
    >
      <AnimatePresence>
        {chat && isAlive && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.9 }}
            className="absolute -top-14 left-1/2 -translate-x-1/2"
            style={{
              padding: '0.35rem 0.65rem', borderRadius: '8px',
              background: 'rgba(255, 110, 39, 0.12)', border: '1px solid rgba(255, 110, 39, 0.25)',
              color: '#ff6e27', fontSize: '0.72rem', fontFamily: 'var(--font-display)',
              maxWidth: '180px', whiteSpace: 'normal', textAlign: 'center',
            }}
          >
            {chat}
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-0 h-0"
              style={{ borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '6px solid rgba(255, 110, 39, 0.25)' }} />
          </motion.div>
        )}
      </AnimatePresence>
      <div className="text-3xl mb-1 select-none" style={{ filter: !isAlive ? 'grayscale(1) brightness(0.3)' : 'none' }}>
        {isAlive ? icon : '\uD83D\uDC80'}
      </div>
      <span className="text-xs font-bold uppercase tracking-wider"
        style={{ fontFamily: 'var(--font-display)', color: !isAlive ? '#333' : isTurn ? '#ff6e27' : '#8a8490', textDecoration: !isAlive ? 'line-through' : 'none' }}>
        {name}
      </span>
      {isTurn && isAlive && (
        <motion.div className="mt-1 text-xs font-bold" style={{ color: '#ff6e27', fontFamily: 'var(--font-mono)' }}
          animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
          FIRING <TypingDots />
        </motion.div>
      )}
    </motion.div>
  );
}

function RevolverCylinder({ currentChamber, isPlaying, isSpinning }: { currentChamber: number; isPlaying: boolean; isSpinning: boolean }) {
  return (
    <div className="relative mx-auto" style={{ width: '220px', height: '220px' }}>
      <div className={`w-full h-full rounded-full relative ${isSpinning ? 'cylinder-spinning' : 'cylinder-idle'}`}
        style={{
          border: '2px solid rgba(255, 255, 255, 0.08)',
          background: 'radial-gradient(circle, rgba(20, 15, 30, 0.9) 0%, rgba(8, 5, 15, 0.95) 100%)',
          boxShadow: 'inset 0 0 40px rgba(0, 0, 0, 0.6), 0 0 30px rgba(255, 45, 85, 0.08)',
        }}>
        {Array.from({ length: NUM_CHAMBERS }).map((_, i) => {
          const angle = (i * 60) - 90;
          const rad = (angle * Math.PI) / 180;
          const x = 110 + 72 * Math.cos(rad) - 16;
          const y = 110 + 72 * Math.sin(rad) - 16;
          const isFired = i < currentChamber;
          const isCurrent = i === currentChamber && isPlaying;
          return (
            <div key={i}
              className={`chamber absolute w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isFired ? 'chamber-fired' : isCurrent ? 'chamber-current' : 'chamber-empty'}`}
              style={{ left: `${x}px`, top: `${y}px`, border: '2px solid', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: isFired ? '#ff2d55' : isCurrent ? '#ff6e27' : 'rgba(255, 255, 255, 0.2)' }}>
              {isFired ? '\u00D7' : isCurrent ? '\u25CF' : i + 1}
            </div>
          );
        })}
        <div className="absolute rounded-full"
          style={{ left: '97px', top: '97px', width: '26px', height: '26px', background: 'radial-gradient(circle, #222 0%, #111 100%)', border: '2px solid rgba(255, 255, 255, 0.06)', boxShadow: 'inset 0 0 8px rgba(0, 0, 0, 0.8)' }} />
      </div>
    </div>
  );
}

// === MAIN COMPONENT ===
interface Props {
  userAddress: string;
  currentEpoch: number;
  availablePoints: bigint;
  onStandingsRefresh: () => void;
  onGameComplete: () => void;
}

export function ZkMafiaGame({ userAddress, onStandingsRefresh, onGameComplete }: Props) {
  const { getContractSigner } = useWallet();

  const [sessionId, setSessionId] = useState(getInitialSessionId);
  const [sessionInput, setSessionInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [game, setGame] = useState<PartidaRuleta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [bulletSalt, setBulletSalt] = useState<Uint8Array | null>(null);
  const [bulletPosition, setBulletPosition] = useState<number>(-1);
  const [hasJoined, setHasJoined] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [lastShotResult, setLastShotResult] = useState<'hit' | 'miss' | null>(null);
  const [botChat, setBotChat] = useState<string>('');
  const [loaderMsg, setLoaderMsg] = useState('');
  const [gameMode, setGameMode] = useState<'SINGLEPLAYER' | 'MULTIPLAYER' | null>(null);
  const [botCount, setBotCount] = useState<1 | 2>(2); // 1 bot = 2 players, 2 bots = 3 players

  const [tensionPhase, setTensionPhase] = useState<'idle' | 'building' | 'result'>('idle');
  const [tensionText, setTensionText] = useState('');
  const [screenShake, setScreenShake] = useState(false);
  const [flashEffect, setFlashEffect] = useState<'none' | 'survive' | 'death'>('none');

  const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const botsJoiningRef = useRef(false);

  const phase = game?.phase ?? -1;
  const playerCount = game?.players?.length ?? 0;
  const isGameStarted = phase >= PHASE_PLAYING;
  const myPlayerIndex = game?.players?.findIndex(p => p.address === userAddress) ?? -1;
  const isMyTurn = game?.current_turn === myPlayerIndex && phase === PHASE_PLAYING;
  const myPlayer = myPlayerIndex >= 0 ? game?.players?.[myPlayerIndex] : null;
  const isAlive = myPlayer?.is_alive ?? true;
  const currentTurnPlayer = game?.players?.[game?.current_turn ?? 0];
  const currentTurnName = currentTurnPlayer
    ? (currentTurnPlayer.address === userAddress ? 'You' : getPlayerName(currentTurnPlayer.address, game))
    : '';

  function getPlayerName(addr: string, g: PartidaRuleta | null): string {
    if (!g) return shortAddr(addr);
    const idx = g.players.findIndex(p => p.address === addr);
    if (gameMode === 'SINGLEPLAYER' && idx >= 1) return BOT_NAMES[idx - 1] || shortAddr(addr);
    return shortAddr(addr);
  }

  const loadGame = useCallback(async () => {
    if (!hasJoined && !game) return;
    const g = await service.getGame(sessionId);
    if (g) { setGame(g); if (g.phase === PHASE_FINISHED && g.winner) onStandingsRefresh(); }
  }, [sessionId, hasJoined, game, onStandingsRefresh]);

  useEffect(() => {
    if (!hasJoined && !game) return;
    loadGame();
    const interval = setInterval(loadGame, 4000);
    return () => clearInterval(interval);
  }, [loadGame, hasJoined, game]);

  useEffect(() => {
    if (!loading) { setLoaderMsg(''); return; }
    const msgs = texts.zkLoaderMessages;
    setLoaderMsg(msgs[0]);
    let idx = 0;
    const timer = setInterval(() => { idx = (idx + 1) % msgs.length; setLoaderMsg(msgs[idx]); }, 2200);
    return () => clearInterval(timer);
  }, [loading]);

  useEffect(() => { if (!success) return; const t = setTimeout(() => setSuccess(null), 4000); return () => clearTimeout(t); }, [success]);
  useEffect(() => { if (!error) return; const t = setTimeout(() => setError(null), 7000); return () => clearTimeout(t); }, [error]);
  useEffect(() => { syncSessionToUrl(sessionId); }, [sessionId]);
  useEffect(() => { if (!lastShotResult) return; const t = setTimeout(() => setLastShotResult(null), 4000); return () => clearTimeout(t); }, [lastShotResult]);
  useEffect(() => { if (flashEffect === 'none') return; const t = setTimeout(() => setFlashEffect('none'), 1500); return () => clearTimeout(t); }, [flashEffect]);
  useEffect(() => { if (!screenShake) return; const t = setTimeout(() => setScreenShake(false), 600); return () => clearTimeout(t); }, [screenShake]);

  // --- SINGLEPLAYER: auto-join bots after user joins ---
  useEffect(() => {
    if (gameMode !== 'SINGLEPLAYER') return;
    if (!hasJoined) return;
    if (botsJoiningRef.current) return;
    // Wait until we have game state showing user joined
    if (!game || game.players.length === 0) return;
    // Target player count: 1 (user) + botCount
    const targetPlayers = 1 + botCount;
    if (game.players.length >= targetPlayers) return;

    const joinBots = async () => {
      botsJoiningRef.current = true;
      setLoading(true);
      setLoaderMsg('Los bots se estan sentando en la mesa...');
      try {
        // Join bot 2 (always)
        if (game.players.length < 2) {
          const bot2 = createBotSigner(2);
          setLoaderMsg('El Brayan se sienta a la mesa...');
          await service.entrarALaRuleta(sessionId, bot2.address, 0n, bot2.signer);
          await new Promise(r => setTimeout(r, 1500));
        }
        // Reload game to see bot2
        let g = await service.getGame(sessionId);
        setGame(g);

        // Join bot 3 (only if botCount === 2)
        if (botCount === 2 && g && g.players.length < 3) {
          const bot3 = createBotSigner(3);
          setLoaderMsg('El Kevin tambien quiere jugar...');
          await service.entrarALaRuleta(sessionId, bot3.address, 0n, bot3.signer);
          await new Promise(r => setTimeout(r, 1500));
        }
        // Reload game to see all bots
        g = await service.getGame(sessionId);
        setGame(g);

        // Auto-load the revolver (user is host)
        const neededPlayers = 1 + botCount;
        if (g && g.players.length >= neededPlayers && g.phase === PHASE_WAITING) {
          setLoaderMsg('Cargando el revolver...');
          const salt = service.generateSalt();
          const pos = service.generateBulletPosition();
          const commitment = await service.computeBulletCommitment(salt, pos);
          setBulletSalt(salt);
          setBulletPosition(pos);
          const signer = getContractSigner();
          await service.cargarRevolver(sessionId, userAddress, Buffer.from(commitment), pos, signer);
          await new Promise(r => setTimeout(r, 500));
          g = await service.getGame(sessionId);
          setGame(g);
          setSuccess('Revolver cargado. Que comience la ruleta.');
        }
      } catch (e: any) {
        setError(getHumorousError(e?.message || String(e)));
      } finally {
        setLoading(false);
        botsJoiningRef.current = false;
      }
    };
    joinBots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameMode, hasJoined, game?.players?.length]);

  // Bot shot logic (during gameplay)
  useEffect(() => {
    if (gameMode !== 'SINGLEPLAYER') return;
    if (phase !== PHASE_PLAYING || !game) return;
    const turnIdx = game.current_turn;
    const turnPlayer = game.players[turnIdx];
    if (!turnPlayer || turnPlayer.address === userAddress) return;
    if (!turnPlayer.is_alive) return;
    const botIdx = turnIdx - 1;
    const chatMsgs = botIdx === 0 ? texts.botChatBrayan : texts.botChatKevin;
    setBotChat(chatMsgs[Math.floor(Math.random() * chatMsgs.length)]);
    botTimerRef.current = setTimeout(async () => { setBotChat(''); await handleBotShot(); }, 2500);
    return () => { if (botTimerRef.current) clearTimeout(botTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.current_turn, game?.shots_fired, phase, gameMode]);

  const handleCopySession = () => { navigator.clipboard.writeText(String(sessionId)); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const handleJoinSession = () => { const id = Number(sessionInput.trim()); if (!isNaN(id) && id > 0) { setSessionId(id); resetGameState(); setSessionInput(''); } };
  const handleNewSession = () => { const buf = new Uint32Array(1); crypto.getRandomValues(buf); setSessionId(buf[0] || 1); resetGameState(); };
  const resetGameState = () => {
    setGame(null); setBulletSalt(null); setBulletPosition(-1); setHasJoined(false);
    setLastShotResult(null); setBotChat(''); setIsSpinning(false); setGameMode(null);
    setTensionPhase('idle'); setTensionText(''); setFlashEffect('none'); setScreenShake(false);
    setBotCount(2);
  };

  const runAction = async (label: string, fn: () => Promise<void>) => {
    setLoading(true); setError(null); setSuccess(null);
    try { await fn(); setSuccess(texts.actionSuccess(label)); await loadGame(); }
    catch (e: any) { setError(getHumorousError(e?.message || String(e))); }
    finally { setLoading(false); }
  };

  const playTensionSequence = (isHit: boolean): Promise<void> => {
    return new Promise((resolve) => {
      setTensionPhase('building');
      const buildupMsgs = texts.tensionBuildup;
      let step = 0;
      setTensionText(buildupMsgs[0]);
      const interval = setInterval(() => {
        step++;
        if (step < 3) { setTensionText(buildupMsgs[step % buildupMsgs.length]); }
        else {
          clearInterval(interval);
          setTensionPhase('result');
          if (isHit) { setScreenShake(true); setFlashEffect('death'); setTensionText(texts.tensionResult.death); }
          else { setFlashEffect('survive'); setTensionText(texts.tensionResult.survive); }
          setTimeout(() => { setTensionPhase('idle'); setTensionText(''); resolve(); }, 1200);
        }
      }, 600);
    });
  };

  const handleEntrar = () => {
    runAction(texts.actionEntrar, async () => {
      const signer = getContractSigner();
      await service.entrarALaRuleta(sessionId, userAddress, 0n, signer);
      setHasJoined(true);
    });
  };

  const handleCargarRevolver = () => {
    runAction(texts.actionCargar, async () => {
      const salt = service.generateSalt();
      const pos = service.generateBulletPosition();
      const commitment = await service.computeBulletCommitment(salt, pos);
      setBulletSalt(salt); setBulletPosition(pos);
      const signer = getContractSigner();
      await service.cargarRevolver(sessionId, userAddress, Buffer.from(commitment), pos, signer);
    });
  };

  const handleDisparar = () => {
    if (!game) return;
    runAction(texts.actionDisparar, async () => {
      setIsSpinning(true);
      // Read bullet_position from on-chain state (static cylinder)
      const currentChamber = game!.current_chamber;
      const bp = game!.bullet_position;
      const isHit = currentChamber === bp;
      const zkProof = service.generateZkProof();
      await playTensionSequence(isHit);
      const signer = getContractSigner();
      await service.disparar(sessionId, userAddress, Buffer.from(zkProof), signer);
      setIsSpinning(false);
      setLastShotResult(isHit ? 'hit' : 'miss');
    });
  };

  const handleBotShot = async () => {
    if (!game) return;
    const turnIdx = game.current_turn;
    const turnPlayer = game.players[turnIdx];
    if (!turnPlayer) return;
    try {
      setIsSpinning(true);
      // Read bullet_position from on-chain state (static cylinder)
      const currentChamber = game.current_chamber;
      const bp = game.bullet_position;
      const isHit = currentChamber === bp;
      const zkProof = service.generateZkProof();
      await playTensionSequence(isHit);
      // Use the bot's own signer — determine which bot player number this is
      const botPlayerNum = turnIdx === 1 ? 2 : 3;
      const bot = createBotSigner(botPlayerNum as 2 | 3);
      await service.disparar(sessionId, bot.address, Buffer.from(zkProof), bot.signer);
      setIsSpinning(false); setLastShotResult(isHit ? 'hit' : 'miss'); await loadGame();
    } catch (e: any) { setIsSpinning(false); setError(getHumorousError(e?.message || String(e))); }
  };

  const handleNewGame = () => {
    if (game?.winner) onGameComplete();
    handleNewSession(); setError(null); setSuccess(null);
  };

  // === RENDER ===
  return (
    <div className={`relative max-w-2xl mx-auto ${screenShake ? 'shake' : ''}`}>
      <div className="noise-overlay" />
      <div className="game-scanlines" />
      <div className="game-vignette" />

      <AnimatePresence>
        {flashEffect === 'survive' && <div className="flash-survive" />}
        {flashEffect === 'death' && <div className="flash-death" />}
      </AnimatePresence>

      {/* HEADER */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
        className="text-center mb-6 relative"
        style={{ padding: '1.8rem 1.5rem 1.2rem', background: 'linear-gradient(180deg, rgba(12, 5, 10, 0.95) 0%, rgba(8, 3, 8, 0.8) 100%)', borderRadius: '16px', border: '1px solid rgba(255, 45, 85, 0.12)', overflow: 'hidden' }}>
        <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.04, background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)' }} />
        <h1 className="relative font-bold uppercase tracking-wider"
          style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', color: '#ff2d55', textShadow: '0 0 12px rgba(255,45,85,0.6), 0 0 40px rgba(255,45,85,0.2), 0 0 80px rgba(255,45,85,0.08)', margin: 0, letterSpacing: '0.06em', lineHeight: 1.1 }}>
          {texts.appTitle}
        </h1>
        <p className="relative mt-1 font-bold uppercase tracking-widest"
          style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#00f0ff', textShadow: '0 0 8px rgba(0,240,255,0.4)', letterSpacing: '0.2em' }}>
          {texts.appSubtitle}
        </p>
        <p className="relative mt-2" style={{ color: 'rgba(138,132,144,0.6)', fontSize: '0.8rem', fontStyle: 'italic' }}>
          {texts.appTagline}
        </p>
      </motion.div>

      {/* LOADING TOAST */}
      <AnimatePresence>
        {loading && loaderMsg && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="text-center mb-4"
            style={{ padding: '0.7rem 1rem', borderRadius: '10px', background: 'rgba(191,90,242,0.06)', border: '1px solid rgba(191,90,242,0.2)', color: '#bf5af2', fontSize: '0.85rem', fontFamily: 'var(--font-display)', letterSpacing: '0.03em' }}>
            {loaderMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ERROR TOAST */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
            onClick={() => setError(null)} className="cursor-pointer mb-4"
            style={{ padding: '0.85rem 1rem', borderRadius: '10px', background: 'rgba(255,45,85,0.08)', border: '1px solid rgba(255,45,85,0.35)', color: '#ff2d55' }}>
            <div className="text-sm font-bold mb-1">Something went wrong</div>
            <div className="text-xs opacity-80">{error}</div>
            <div className="text-xs mt-1" style={{ color: '#555' }}>tap to dismiss</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SUCCESS TOAST */}
      <AnimatePresence>
        {success && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            onClick={() => setSuccess(null)} className="cursor-pointer mb-4 text-center"
            style={{ padding: '0.65rem 1rem', borderRadius: '10px', background: 'rgba(57,255,20,0.05)', border: '1px solid rgba(57,255,20,0.2)', color: '#39ff14', fontSize: '0.85rem' }}>
            {success}
          </motion.div>
        )}
      </AnimatePresence>

      {/* TENSION OVERLAY */}
      <AnimatePresence>
        {tensionPhase !== 'idle' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="game-overlay" style={{ zIndex: 60 }}>
            <motion.div className="text-center" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}>
              <p className={`text-4xl font-bold uppercase ${tensionPhase === 'building' ? 'tension-flicker' : ''}`}
                style={{
                  fontFamily: 'var(--font-display)', letterSpacing: '0.1em',
                  color: tensionPhase === 'result' ? (flashEffect === 'death' ? '#ff2d55' : '#39ff14') : '#ff6e27',
                  textShadow: tensionPhase === 'result'
                    ? (flashEffect === 'death' ? '0 0 20px rgba(255,45,85,0.8), 0 0 60px rgba(255,45,85,0.3)' : '0 0 20px rgba(57,255,20,0.8), 0 0 60px rgba(57,255,20,0.3)')
                    : '0 0 15px rgba(255,110,39,0.5)',
                }}>
                {tensionText}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LOBBY PHASE */}
      {(!hasJoined || phase === PHASE_WAITING) && !isGameStarted && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          style={{ background: 'rgba(12,10,18,0.95)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '14px', padding: '1.5rem', boxShadow: '0 0 40px rgba(0,0,0,0.4)' }}>
          <h3 className="text-center uppercase tracking-wider mb-1"
            style={{ fontFamily: 'var(--font-display)', color: '#ff6e27', fontSize: '1.2rem', textShadow: '0 0 10px rgba(255,110,39,0.4)', margin: 0 }}>
            {texts.lobbyTitle}
          </h3>
          <p className="text-center mb-4" style={{ color: '#555', fontSize: '0.72rem', fontStyle: 'italic' }}>{texts.lobbyTitleCl}</p>

          {/* Game mode */}
          {!hasJoined && !gameMode && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              {(['MULTIPLAYER', 'SINGLEPLAYER'] as const).map((mode) => (
                <motion.button key={mode} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => setGameMode(mode)} className="text-center cursor-pointer"
                  style={{
                    padding: '1.2rem 0.75rem', borderRadius: '12px',
                    background: mode === 'MULTIPLAYER' ? 'rgba(0,240,255,0.04)' : 'rgba(255,110,39,0.04)',
                    border: `1px solid ${mode === 'MULTIPLAYER' ? 'rgba(0,240,255,0.15)' : 'rgba(255,110,39,0.15)'}`,
                    color: mode === 'MULTIPLAYER' ? '#00f0ff' : '#ff6e27',
                    fontFamily: 'var(--font-display)', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>
                  <div className="text-3xl mb-2 select-none">{mode === 'MULTIPLAYER' ? '\uD83D\uDC65' : '\uD83E\uDD16'}</div>
                  {mode === 'MULTIPLAYER' ? texts.modeMultiplayer : texts.modeSingleplayer}
                  <div className="mt-1" style={{ fontSize: '0.65rem', color: '#555' }}>{mode === 'MULTIPLAYER' ? texts.modeMultiplayerDesc : texts.modeSingleplayerDesc}</div>
                </motion.button>
              ))}
            </div>
          )}

          {/* Bot count selector (singleplayer only) */}
          {!hasJoined && gameMode === 'SINGLEPLAYER' && (
            <div className="mb-4 text-center" style={{ padding: '0.75rem', borderRadius: '10px', background: 'rgba(255,110,39,0.03)', border: '1px solid rgba(255,110,39,0.1)' }}>
              <div className="hud-stat mb-2">OPPONENTS</div>
              <div className="flex justify-center gap-3">
                {([1, 2] as const).map(n => (
                  <button key={n} onClick={() => setBotCount(n)}
                    className="cursor-pointer"
                    style={{
                      padding: '0.5rem 1.2rem', borderRadius: '8px',
                      background: botCount === n ? 'rgba(255,110,39,0.15)' : 'transparent',
                      border: `1px solid ${botCount === n ? 'rgba(255,110,39,0.4)' : 'rgba(255,255,255,0.08)'}`,
                      color: botCount === n ? '#ff6e27' : '#8a8490',
                      fontFamily: 'var(--font-display)', fontSize: '0.85rem',
                    }}>
                    {n === 1 ? '1 Bot (2P)' : '2 Bots (3P)'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {gameMode && (<>
            {/* Session ID */}
            <div className="mb-3" style={{ padding: '0.65rem 0.75rem', borderRadius: '10px', background: 'rgba(0,240,255,0.03)', border: '1px solid rgba(0,240,255,0.1)' }}>
              <label className="hud-stat block mb-1">{texts.lobbySessionLabel}</label>
              <div className="flex items-center gap-2">
                <span className="flex-1 font-bold" style={{ fontFamily: 'var(--font-mono)', color: '#00f0ff', fontSize: '1.2rem', textShadow: '0 0 8px rgba(0,240,255,0.3)' }}>{sessionId}</span>
                <button onClick={handleCopySession} className="btn-secondary"
                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', borderRadius: '6px', background: copied ? 'rgba(57,255,20,0.1)' : 'transparent', color: copied ? '#39ff14' : '#00f0ff', borderColor: copied ? 'rgba(57,255,20,0.3)' : 'rgba(0,240,255,0.2)', letterSpacing: '0.08em' }}>
                  {copied ? texts.lobbySessionCopied : texts.lobbySessionCopyBtn}
                </button>
              </div>
            </div>

            {/* Join existing session */}
            {!hasJoined && gameMode === 'MULTIPLAYER' && (
              <div className="mb-3" style={{ padding: '0.65rem 0.75rem', borderRadius: '10px', background: 'rgba(255,110,39,0.03)', border: '1px solid rgba(255,110,39,0.08)' }}>
                <label className="hud-stat block mb-1">{texts.lobbySessionJoinLabel}</label>
                <div className="flex gap-2">
                  <input type="text" value={sessionInput} onChange={(e) => setSessionInput(e.target.value)} placeholder={texts.lobbySessionJoinPlaceholder} className="flex-1"
                    style={{ padding: '0.45rem 0.6rem', background: 'rgba(255,255,255,0.03)', color: '#e8e0d8', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }} />
                  <button onClick={handleJoinSession} disabled={!sessionInput.trim()}
                    style={{ padding: '0.45rem 0.7rem', fontSize: '0.7rem', fontWeight: 700, background: 'rgba(255,110,39,0.1)', color: '#ff6e27', border: '1px solid rgba(255,110,39,0.2)', borderRadius: '6px', letterSpacing: '0.08em' }}>
                    {texts.lobbySessionJoinBtn}
                  </button>
                </div>
              </div>
            )}

            {/* Address */}
            <div className="mb-3">
              <label className="hud-stat block mb-1">{texts.lobbyAddressLabel}</label>
              <div style={{ fontFamily: 'var(--font-mono)', color: 'rgba(0,240,255,0.5)', fontSize: '0.7rem', wordBreak: 'break-all' }}>{userAddress}</div>
            </div>

            {/* Player list */}
            {game?.players && game.players.length > 0 && (
              <div className="mb-4" style={{ padding: '0.6rem', borderRadius: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div className="hud-stat mb-2">{texts.lobbyPlayersLabel(playerCount)}</div>
                {game.players.map((p, i) => {
                  const isMe = p.address === userAddress;
                  return (
                    <div key={i} className="flex items-center gap-2 py-1 px-2" style={{ borderRadius: '6px', background: isMe ? 'rgba(0,240,255,0.04)' : 'transparent' }}>
                      <span className="text-sm">{p.is_alive ? '\u25CF' : '\u00D7'}</span>
                      <span className="text-xs" style={{ fontFamily: 'var(--font-mono)', color: isMe ? '#00f0ff' : '#8a8490' }}>
                        {getPlayerName(p.address, game)}{isMe && ` ${texts.playerYou}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Action button */}
            {!hasJoined ? (
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleEntrar} disabled={loading}
                className="w-full uppercase tracking-wider"
                style={{ padding: '1rem', fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-display)', background: loading ? 'rgba(40,30,40,0.8)' : 'linear-gradient(135deg, rgba(255,45,85,0.8), rgba(200,0,50,0.9))', color: loading ? '#555' : '#fff', border: '1px solid rgba(255,45,85,0.4)', borderRadius: '12px', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 0 25px rgba(255,45,85,0.2)', letterSpacing: '0.06em' }}>
                {loading ? texts.lobbyJoining : texts.lobbyJoinBtn}
                {!loading && <span className="block text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)' }}>{texts.lobbyJoinBtnCl}</span>}
              </motion.button>
            ) : playerCount >= 2 && phase === PHASE_WAITING ? (
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleCargarRevolver} disabled={loading}
                className="w-full uppercase tracking-wider"
                style={{ padding: '1rem', fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-display)', background: loading ? 'rgba(40,30,40,0.8)' : 'linear-gradient(135deg, rgba(255,110,39,0.8), rgba(200,70,0,0.9))', color: loading ? '#555' : '#fff', border: '1px solid rgba(255,110,39,0.4)', borderRadius: '12px', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 0 25px rgba(255,110,39,0.2)', letterSpacing: '0.06em' }}>
                {loading ? 'LOADING...' : 'LOAD THE REVOLVER'}
                <span className="block text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)' }}>Cargar el revolver</span>
              </motion.button>
            ) : (
              <div className="text-center py-6">
                <motion.div className="text-3xl mb-2 select-none" animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 2, repeat: Infinity }}>{'\u23F3'}</motion.div>
                <p style={{ color: '#8a8490', fontSize: '0.85rem' }}>{texts.lobbyWaiting}</p>
                <p className="mt-0.5" style={{ color: '#555', fontSize: '0.7rem', fontStyle: 'italic' }}>{texts.lobbyWaitingCl}</p>
                <p className="mt-1" style={{ color: '#444', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>{texts.lobbyPlayerCount(playerCount)}</p>
              </div>
            )}
          </>)}
        </motion.div>
      )}

      {/* PLAYING PHASE */}
      {isGameStarted && game && phase === PHASE_PLAYING && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
          style={{ background: 'linear-gradient(180deg, rgba(8,4,18,0.95) 0%, rgba(12,6,22,0.95) 100%)', border: '1px solid rgba(255,45,85,0.1)', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 0 50px rgba(0,0,0,0.5)' }}>
          <h3 className="text-center uppercase tracking-widest mb-2"
            style={{ fontFamily: 'var(--font-display)', color: '#ff2d55', fontSize: '1.1rem', textShadow: '0 0 12px rgba(255,45,85,0.5)', margin: 0, letterSpacing: '0.15em' }}>
            {texts.playTitle}
          </h3>

          {/* HUD */}
          <div className="flex justify-around items-center mb-4"
            style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.04)' }}>
            <HudStat label={texts.playChamberLabel} value={`${game.current_chamber + 1}/${NUM_CHAMBERS}`} color="#ff6e27" />
            <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.06)' }} />
            <HudStat label={texts.playShotsLabel} value={game.shots_fired} color="#00f0ff" />
            <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.06)' }} />
            <HudStat label="ALIVE" value={game.players.filter(p => p.is_alive).length} color="#39ff14" />
          </div>

          {/* Avatars / Player list */}
          {gameMode === 'SINGLEPLAYER' ? (
            <div className="flex justify-center gap-4 mb-4">
              <motion.div className="flex flex-col items-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                style={{ padding: '0.75rem', borderRadius: '12px', background: isMyTurn ? 'rgba(0,240,255,0.06)' : 'rgba(255,255,255,0.02)', border: isMyTurn ? '1px solid rgba(0,240,255,0.2)' : '1px solid rgba(255,255,255,0.05)', minWidth: '100px', opacity: isAlive ? 1 : 0.3 }}>
                <div className="text-3xl mb-1 select-none">{isAlive ? '\uD83C\uDFAF' : '\uD83D\uDC80'}</div>
                <span className="text-xs font-bold uppercase tracking-wider" style={{ fontFamily: 'var(--font-display)', color: isMyTurn ? '#00f0ff' : '#8a8490', textShadow: isMyTurn ? '0 0 8px rgba(0,240,255,0.4)' : 'none' }}>YOU</span>
              </motion.div>
              {game.players.slice(1).map((p, i) => (
                <BotAvatar key={i} name={BOT_NAMES[i] || shortAddr(p.address)} icon={BOT_ICONS[i] || '\uD83C\uDFB2'}
                  isAlive={p.is_alive} isTurn={game.current_turn === i + 1} chat={game.current_turn === i + 1 ? botChat : ''} index={i + 1} />
              ))}
            </div>
          ) : (
            <div className="mb-4" style={{ padding: '0.6rem', borderRadius: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.04)' }}>
              {game.players.map((p, i) => {
                const isMe = p.address === userAddress;
                const alive = p.is_alive;
                const isTurn = game.current_turn === i;
                return (
                  <div key={i} className="flex items-center justify-between py-1.5 px-2"
                    style={{ borderRadius: '6px', background: isTurn ? 'rgba(255,110,39,0.06)' : isMe ? 'rgba(0,240,255,0.03)' : 'transparent', opacity: alive ? 1 : 0.3, border: isTurn ? '1px solid rgba(255,110,39,0.15)' : '1px solid transparent' }}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm" style={{ color: alive ? (isTurn ? '#ff6e27' : '#39ff14') : '#ff2d55' }}>{alive ? (isTurn ? '\u25CF' : '\u25CB') : '\u00D7'}</span>
                      <span className="text-xs" style={{ fontFamily: 'var(--font-mono)', color: isMe ? '#00f0ff' : '#8a8490', textDecoration: alive ? 'none' : 'line-through' }}>
                        {getPlayerName(p.address, game)}{isMe && ` ${texts.playerYou}`}
                      </span>
                    </div>
                    {isTurn && <span className="text-xs font-bold uppercase" style={{ color: '#ff6e27', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.1em' }}>TURN</span>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Cylinder */}
          <div className="my-4">
            <RevolverCylinder currentChamber={game.current_chamber} isPlaying={phase === PHASE_PLAYING} isSpinning={isSpinning} />
          </div>

          {/* Shot result */}
          <AnimatePresence>
            {lastShotResult && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                className="text-center mb-4"
                style={{ padding: '1rem', borderRadius: '12px', background: lastShotResult === 'hit' ? 'rgba(255,45,85,0.1)' : 'rgba(57,255,20,0.05)', border: `1px solid ${lastShotResult === 'hit' ? 'rgba(255,45,85,0.3)' : 'rgba(57,255,20,0.2)'}` }}>
                <div className="text-2xl font-bold uppercase"
                  style={{ fontFamily: 'var(--font-display)', color: lastShotResult === 'hit' ? '#ff2d55' : '#39ff14', textShadow: lastShotResult === 'hit' ? '0 0 15px rgba(255,45,85,0.6)' : '0 0 15px rgba(57,255,20,0.6)', letterSpacing: '0.1em' }}>
                  {lastShotResult === 'hit' ? texts.playDead : texts.playSurvived}
                </div>
                <div className="mt-1" style={{ fontSize: '0.72rem', color: '#555', fontStyle: 'italic' }}>
                  {lastShotResult === 'hit' ? texts.playDeadCl : texts.playSurvivedCl}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* TRIGGER ZONE */}
          <div className="mt-4">
            {isMyTurn && isAlive ? (
              <div className="text-center">
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-1 uppercase tracking-widest"
                  style={{ fontFamily: 'var(--font-display)', color: '#ff6e27', fontSize: '0.85rem', textShadow: '0 0 8px rgba(255,110,39,0.4)', letterSpacing: '0.15em' }}>
                  {texts.playYourTurn}
                </motion.p>
                <p className="mb-4" style={{ fontSize: '0.65rem', color: '#555', fontStyle: 'italic' }}>{texts.playYourTurnCl}</p>
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }} onClick={handleDisparar} disabled={loading || isSpinning}
                  className={`trigger-btn w-full uppercase ${(loading || isSpinning) ? '' : 'cursor-pointer'}`}
                  style={{
                    padding: '1.4rem 1rem', fontSize: '2rem', fontWeight: 900, fontFamily: 'var(--font-display)',
                    background: (loading || isSpinning) ? 'rgba(40,25,30,0.8)' : 'linear-gradient(180deg, rgba(255,45,85,0.85) 0%, rgba(180,0,30,0.95) 100%)',
                    color: (loading || isSpinning) ? '#444' : '#fff', border: '2px solid rgba(255,45,85,0.5)', borderRadius: '16px', letterSpacing: '0.15em',
                    cursor: (loading || isSpinning) ? 'not-allowed' : 'pointer',
                    animation: (loading || isSpinning) ? 'none' : undefined,
                    textShadow: (loading || isSpinning) ? 'none' : '0 0 10px rgba(255,45,85,0.5)',
                  }}>
                  {isSpinning ? '...' : loading ? texts.playFiring : texts.playTriggerBtn}
                  {!(loading || isSpinning) && <span className="block text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', fontSize: '0.7rem' }}>{texts.playTriggerBtnCl}</span>}
                </motion.button>
              </div>
            ) : isAlive ? (
              <div className="text-center py-4">
                <p style={{ color: '#8a8490', fontSize: '0.9rem' }}>{texts.playWaitTurn(currentTurnName)}</p>
                <p className="mt-0.5" style={{ fontSize: '0.65rem', color: '#555', fontStyle: 'italic' }}>{texts.playWaitTurnCl(currentTurnName)}</p>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="text-4xl mb-2 select-none" style={{ filter: 'grayscale(0.5)' }}>{'\uD83D\uDC80'}</div>
                <p className="uppercase tracking-wider font-bold" style={{ fontFamily: 'var(--font-display)', color: '#ff2d55', fontSize: '1rem', textShadow: '0 0 10px rgba(255,45,85,0.3)' }}>{texts.playDead}</p>
                <p className="mt-0.5" style={{ fontSize: '0.65rem', color: '#555', fontStyle: 'italic' }}>{texts.playDeadCl}</p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* GAME OVER */}
      {phase === PHASE_FINISHED && game?.winner && (() => {
        const won = game.winner === userAddress;
        const neonColor = won ? '#39ff14' : '#ff2d55';
        return (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}
            className="text-center"
            style={{ padding: '2.5rem 1.5rem', background: won ? 'linear-gradient(180deg, rgba(0,20,0,0.95), rgba(0,40,0,0.95))' : 'linear-gradient(180deg, rgba(20,0,5,0.95), rgba(40,0,10,0.95))', borderRadius: '16px', border: `1px solid ${won ? 'rgba(57,255,20,0.25)' : 'rgba(255,45,85,0.25)'}`, boxShadow: `0 0 60px ${won ? 'rgba(57,255,20,0.08)' : 'rgba(255,45,85,0.08)'}` }}>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: 'spring', stiffness: 200 }} className="text-6xl mb-4 select-none">
              {won ? '\uD83C\uDF89' : '\uD83D\uDC80'}
            </motion.div>
            <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
              className="font-bold uppercase tracking-widest"
              style={{ fontFamily: 'var(--font-display)', color: neonColor, fontSize: '2.2rem', textShadow: `0 0 15px ${neonColor}80, 0 0 40px ${neonColor}30`, margin: 0, letterSpacing: '0.12em' }}>
              {won ? texts.winTitle : texts.loseTitle}
            </motion.h2>
            <p className="mt-1" style={{ fontSize: '0.8rem', color: '#555', fontStyle: 'italic' }}>{won ? texts.winTitleCl : texts.loseTitleCl}</p>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-3" style={{ color: '#e8e0d8', fontSize: '0.95rem' }}>
              {won ? texts.winDesc : texts.loseDesc}
            </motion.p>
            <p className="mt-0.5" style={{ fontSize: '0.7rem', color: '#555', fontStyle: 'italic' }}>{won ? texts.winDescCl : texts.loseDescCl}</p>
            <p className="mt-3" style={{ color: '#8a8490', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>{texts.winnerLabel(getPlayerName(game.winner, game))}</p>
            {game.eliminated.length > 0 && (
              <p className="mt-1" style={{ color: '#444', fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}>{texts.eliminatedLabel(game.eliminated.map(a => getPlayerName(a, game)).join(', '))}</p>
            )}
            <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={handleNewGame} className="uppercase tracking-wider mt-6"
              style={{ padding: '0.75rem 2.5rem', fontSize: '0.9rem', fontWeight: 700, fontFamily: 'var(--font-display)', background: 'rgba(255,255,255,0.04)', color: '#e8e0d8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', cursor: 'pointer', letterSpacing: '0.1em' }}>
              {texts.newGameBtn}
              <span className="block text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono)' }}>{texts.newGameBtnCl}</span>
            </motion.button>
          </motion.div>
        );
      })()}

      {/* Footer */}
      {isGameStarted && game && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-4"
          style={{ padding: '0.75rem', borderRadius: '10px', background: 'rgba(8,6,12,0.7)', border: '1px solid rgba(255,255,255,0.03)' }}>
          <div className="flex justify-between text-xs mb-1" style={{ color: '#444' }}>
            <span>{texts.footerSession}</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: '#555' }}>{sessionId}</span>
          </div>
          <div className="flex justify-between text-xs mb-1" style={{ color: '#444' }}>
            <span>{texts.footerPhase}</span>
            <span style={{ color: '#555' }}>{PHASE_LABELS[phase] || texts.footerUnknownPhase}</span>
          </div>
          <div className="flex justify-between text-xs" style={{ color: '#444' }}>
            <span>{texts.footerContract}</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: '#333' }}>{ZK_MAFIA_CONTRACT.slice(0, 12)}{'\u2026'}</span>
          </div>
          <div className="text-center mt-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.03)', color: 'rgba(0,240,255,0.3)', fontSize: '0.6rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>
            {texts.footerZkInfo}
          </div>
        </motion.div>
      )}
    </div>
  );
}
