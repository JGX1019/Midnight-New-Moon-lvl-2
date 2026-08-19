/**
 * CircuitCall.tsx — deploy/join the counter contract and call its
 * circuits from the browser.
 *
 * The private `increment_by` amount typed by the user is used only to
 * build the proof locally in the browser (via the connected wallet's
 * proving provider) — it is never sent anywhere, never logged, and never
 * rendered back to the UI. Only the public transaction result (tx id,
 * new public count) is ever displayed.
 */
import { useState } from 'react';
import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import { callIncrement, callReset, deployCounter, joinCounter, readCounterValue } from '../api/contract';

type TxStatus = 'idle' | 'proving' | 'confirmed' | 'failed';

interface Props {
  connectedAPI: ConnectedAPI;
}

export function CircuitCall({ connectedAPI }: Props) {
  const [contractAddress, setContractAddress] = useState<string | null>(null);
  const [addressInput, setAddressInput] = useState('');
  const [deployedContract, setDeployedContract] = useState<any>(null);
  const [incrementInput, setIncrementInput] = useState('1');
  const [publicCount, setPublicCount] = useState<bigint | null>(null);
  const [txStatus, setTxStatus] = useState<TxStatus>('idle');
  const [txId, setTxId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDeploy = async () => {
    setError(null);
    setTxStatus('proving');
    try {
      const contract = await deployCounter(connectedAPI);
      setDeployedContract(contract);
      setContractAddress(contract.deployTxData.public.contractAddress);
      setPublicCount(0n);
      setTxStatus('confirmed');
    } catch (e: any) {
      setTxStatus('failed');
      setError(e?.message ?? 'Deploy failed.');
    }
  };

  const handleJoin = async () => {
    if (!addressInput.trim()) return;
    setError(null);
    setTxStatus('proving');
    try {
      const contract = await joinCounter(connectedAPI, addressInput.trim());
      setDeployedContract(contract);
      setContractAddress(addressInput.trim());
      const value = await readCounterValue(connectedAPI, addressInput.trim());
      setPublicCount(value);
      setTxStatus('confirmed');
    } catch (e: any) {
      setTxStatus('failed');
      setError(e?.message ?? 'Failed to join contract.');
    }
  };

  const handleIncrement = async () => {
    if (!deployedContract) return;
    const amount = BigInt(incrementInput || '0');
    if (amount <= 0n) {
      setError('increment_by must be a positive number.');
      return;
    }
    setError(null);
    setTxStatus('proving');
    setTxId(null);
    try {
      // amount is a private circuit input — used only locally to build
      // the proof, never transmitted or displayed beyond this call.
      const result = await callIncrement(deployedContract, amount);
      setTxId(result.txId);
      setTxStatus('confirmed');
      if (contractAddress) {
        const value = await readCounterValue(connectedAPI, contractAddress);
        setPublicCount(value);
      }
    } catch (e: any) {
      setTxStatus('failed');
      setError(e?.message ?? 'Increment failed.');
    }
  };

  const handleReset = async () => {
    if (!deployedContract) return;
    setError(null);
    setTxStatus('proving');
    setTxId(null);
    try {
      const result = await callReset(deployedContract);
      setTxId(result.txId);
      setTxStatus('confirmed');
      if (contractAddress) {
        const value = await readCounterValue(connectedAPI, contractAddress);
        setPublicCount(value);
      }
    } catch (e: any) {
      setTxStatus('failed');
      setError(e?.message ?? 'Reset failed.');
    }
  };

  if (!deployedContract) {
    return (
      <div className="circuit-call">
        <h2>Contract</h2>
        <button onClick={handleDeploy} disabled={txStatus === 'proving'} className="btn btn-primary">
          {txStatus === 'proving' ? 'Deploying...' : 'Deploy New Counter Contract'}
        </button>

        <div className="join-contract">
          <p>Or join an existing contract:</p>
          <input
            type="text"
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            placeholder="Contract address (hex)"
            className="input"
          />
          <button onClick={handleJoin} disabled={txStatus === 'proving'} className="btn btn-secondary">
            Join
          </button>
        </div>

        {error && <p role="alert" className="error-text">{error}</p>}
      </div>
    );
  }

  return (
    <div className="circuit-call">
      <h2>Counter Contract</h2>
      <p className="contract-address" title={contractAddress ?? ''}>
        Address: {contractAddress}
      </p>

      <p className="public-count">
        Public count: <strong>{publicCount?.toString() ?? '...'}</strong>
      </p>

      <div className="increment-controls">
        <label htmlFor="increment-amount">Amount to increment by (private input)</label>
        <input
          id="increment-amount"
          type="number"
          min="1"
          value={incrementInput}
          onChange={(e) => setIncrementInput(e.target.value)}
          className="input"
        />
        <p className="privacy-label">🔒 Proved without revealing your input</p>

        <button onClick={handleIncrement} disabled={txStatus === 'proving'} className="btn btn-primary">
          {txStatus === 'proving' ? 'Generating proof locally...' : 'Increment'}
        </button>
        <button onClick={handleReset} disabled={txStatus === 'proving'} className="btn btn-secondary">
          Reset
        </button>
      </div>

      {txStatus === 'proving' && (
        <p className="tx-status" role="status">
          Generating zero-knowledge proof in your browser — this proves the increment is valid without revealing the
          amount.
        </p>
      )}

      {txStatus === 'confirmed' && txId && (
        <div className="tx-result" role="status">
          <p>✓ Transaction confirmed on-chain</p>
          <p className="tx-id" title={txId}>
            Tx: {txId}
          </p>
        </div>
      )}

      {error && <p role="alert" className="error-text">{error}</p>}
    </div>
  );
}
