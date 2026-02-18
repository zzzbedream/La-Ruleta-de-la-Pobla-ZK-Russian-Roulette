import { config } from './config';
import { Layout } from './components/Layout';
import { useWallet } from './hooks/useWallet';
import { ZkMafiaGame } from './games/zk-mafia/ZkMafiaGame';
import { texts } from './games/zk-mafia/gameTexts';

const GAME_ID = 'zk-mafia';
const GAME_TITLE = import.meta.env.VITE_GAME_TITLE || texts.appTitle;
const GAME_TAGLINE = import.meta.env.VITE_GAME_TAGLINE || texts.appSubtitle;

export default function App() {
  const { publicKey, isConnected, isConnecting, error, isDevModeAvailable } = useWallet();
  const userAddress = publicKey ?? '';
  const contractId = config.contractIds[GAME_ID] || '';
  const hasContract = contractId && contractId !== 'YOUR_CONTRACT_ID';
  const devReady = isDevModeAvailable();

  return (
    <Layout title={GAME_TITLE} subtitle={GAME_TAGLINE}>
      {!hasContract ? (
        <div className="card">
          <h3 className="gradient-text">{texts.configNoContract}</h3>
          <p style={{ color: 'var(--color-ink-muted)', marginTop: '1rem' }}>
            {texts.configNoContractMsg}
          </p>
        </div>
      ) : !devReady ? (
        <div className="card">
          <h3 className="gradient-text">{texts.configNoWallets}</h3>
          <p style={{ color: 'var(--color-ink-muted)', marginTop: '0.75rem' }}>
            {texts.configNoWalletsMsg}
          </p>
        </div>
      ) : !isConnected ? (
        <div className="card">
          <h3 className="gradient-text">{texts.configConnecting}</h3>
          <p style={{ color: 'var(--color-ink-muted)', marginTop: '0.75rem' }}>
            {texts.configConnectingMsg}
          </p>
          {error && <div className="notice error" style={{ marginTop: '1rem' }}>{error}</div>}
          {isConnecting && <div className="notice info" style={{ marginTop: '1rem' }}>Connecting...</div>}
        </div>
      ) : (
        <ZkMafiaGame
          userAddress={userAddress}
          currentEpoch={1}
          availablePoints={1000000000n}
          onStandingsRefresh={() => {}}
          onGameComplete={() => {}}
        />
      )}
    </Layout>
  );
}
