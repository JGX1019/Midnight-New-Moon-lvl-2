import { useMidnight } from './hooks/useMidnight';
import { WalletConnect } from './components/WalletConnect';
import { CircuitCall } from './components/CircuitCall';
import './styles.css';

export function App() {
  const midnight = useMidnight();

  return (
    <div className="app">
      <header className="app-header">
        <h1>Midnight Privacy Counter</h1>
        <p className="tagline">A counter that proves it advanced, without revealing by how much.</p>
      </header>

      <main>
        <WalletConnect {...midnight} />

        {midnight.status === 'connected' && midnight.connectedAPI && (
          <CircuitCall connectedAPI={midnight.connectedAPI} />
        )}

        {midnight.status !== 'connected' && (
          <p className="hint">Connect your Lace wallet to deploy or interact with the counter contract.</p>
        )}
      </main>
    </div>
  );
}
