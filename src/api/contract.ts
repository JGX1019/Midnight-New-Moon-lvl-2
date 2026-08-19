/**
 * contract.ts — deploy/find the counter contract and expose typed circuit
 * call helpers for the frontend.
 *
 * Uses the browser-side providers from providers.ts (backed by the
 * connected Lace wallet) so proving, balancing, and submission all happen
 * through the wallet rather than a Node.js script.
 */
import { CompiledContract } from '@midnight-ntwrk/compact-js';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import { Contract, ledger } from '../contract/counter.js';
import { buildProviders } from './providers.js';

// Static import of the compiled contract's browser assets, per the
// managed/counter -> public/managed/counter copy step (see README).
const ZK_ASSETS_PATH = '/managed/counter';

/**
 * Client-side timeout wrapper. callTx / deployContract can hang
 * indefinitely waiting on indexer finalization with zero UI feedback
 * otherwise — this doesn't affect the actual transaction, just stops a
 * spinner from spinning forever with no explanation.
 */
function withTimeout<T>(promise: Promise<T>, ms = 120_000, label = 'operation'): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

async function buildCompiledContract() {
  return CompiledContract.make('counter', Contract).pipe(
    CompiledContract.withVacantWitnesses,
    CompiledContract.withCompiledFileAssets(ZK_ASSETS_PATH),
  );
}

/** Deploys a fresh instance of the counter contract. */
export async function deployCounter(connectedAPI: ConnectedAPI) {
  const providers = await buildProviders(connectedAPI);
  const compiledContract = await buildCompiledContract();
  return withTimeout(
    deployContract(providers as any, { compiledContract: compiledContract as any, args: [] } as any),
    120_000,
    'Deploy',
  );
}

/** Connects to an already-deployed counter contract by address. */
export async function joinCounter(connectedAPI: ConnectedAPI, contractAddress: string) {
  const providers = await buildProviders(connectedAPI);
  const compiledContract = await buildCompiledContract();
  return withTimeout(
    findDeployedContract(providers as any, {
      contractAddress,
      compiledContract: compiledContract as any,
    } as any),
    120_000,
    'Join',
  );
}

/**
 * Calls the `increment` circuit with a private amount. The amount is a
 * private circuit input — it is used inside the ZK proof generated
 * locally by the wallet, and never appears in the submitted transaction
 * or in this function's return value.
 */
export async function callIncrement(deployedContract: any, incrementBy: bigint) {
  const result: any = await withTimeout(deployedContract.callTx.increment(incrementBy), 120_000, 'Increment');
  return result.public;
}

/** Calls the `reset` circuit, bringing the public counter back to zero. */
export async function callReset(deployedContract: any) {
  const result: any = await withTimeout(deployedContract.callTx.reset(), 120_000, 'Reset');
  return result.public;
}

/** Reads the current public counter value from the contract's ledger state. */
export async function readCounterValue(connectedAPI: ConnectedAPI, contractAddress: string): Promise<bigint | null> {
  const providers = await buildProviders(connectedAPI);
  const state = await providers.publicDataProvider.queryContractState(contractAddress as any);
  if (!state) return null;
  return ledger((state as any).data ?? state).count;
}
