# Midnight Privacy Counter

> A counter dApp on Midnight that proves it advanced, without ever revealing by how much.

## Live Demo

https://midnight-new-moon-lvl-2.vercel.app/

## Contract Address

| Network | Address |
|---------|---------|
| Preprod | `706fc8b7f568054e009236475a957a9b9eeb576bde9d5424ab10b9222dbb044d` |
| Preview | `1d2b58da2d666f53574e6ba4ab862f1b93d52c90ff24a67b9d253579c34d08ab` |

## What This Does

This is a small dApp built on top of the `counter.compact` contract from Level 1. Connect any Midnight-compatible wallet (e.g. Lace), deploy or join a counter contract, and call `increment` with a private amount. The proof that the increment is valid is generated entirely in your browser via the connected wallet, and only the public result — the new count and the transaction id — is ever submitted on-chain or shown in the UI.

## Privacy Model

- **PUBLIC:** `count` — the current counter value. Anyone reading the chain can see it.
- **PRIVATE:** `increment_by` — the amount typed into the "Amount to increment by" field. This never leaves your browser except as an input to a locally-generated zero-knowledge proof.
- **PROVED without revealing:** that `increment_by > 0` and that the counter advanced correctly by that amount, without disclosing what the amount actually was.

## Privacy Claim

An on-chain observer watching this contract sees: the contract address, the public `count` value before and after each transaction, and the transaction id. They do **not** see, and cannot recover, the `increment_by` value used in any individual call — not from the transaction, not from the proof, and not from the difference between counter values if multiple calls happen between observations.

## Tech Stack

- Midnight Network (Preprod / Preview)
- Compact — ZK smart contract language
- Midnight.js SDK (`midnight-js-contracts` v4.1.1)
- DApp Connector API (`@midnight-ntwrk/dapp-connector-api`) — works with any Midnight-compatible wallet
- React 19 + Vite 6
- Lace Wallet (reference wallet used during development)

## Prerequisites

- A Midnight-compatible wallet browser extension (e.g. [Lace](https://chromewebstore.google.com/detail/lace/gafhhkghbfjjkeiendhlofajokpaflmk)), set to the **Preprod** network
- In your wallet's settings: **Proof server → Local** (`http://127.0.0.1:6300`) — proofs are generated locally in the browser via the connected wallet, which needs a running local proof server to do that
- Docker Desktop running (for the local proof server)
- Node.js v22+

## Run Locally

```bash
git clone <this-repo-url>
cd level-2
npm install --legacy-peer-deps

# Start the local proof server (pinned version — do not use :latest or 7.x,
# which hang indefinitely generating proofs on Apple Silicon under Docker Desktop)
docker run --rm -p 6300:6300 midnightntwrk/proof-server:8.1.0

# In Lace: set Proof server to Local (http://127.0.0.1:6300)

npm run dev
# Open http://localhost:5173, connect Lace, and deploy or join a contract
```

## Run Tests

```bash
npm run test:run
```

10 tests passing — circuit logic, state transitions, and privacy isolation (verifying `increment_by` never appears in the public ledger).

## Deploy Frontend (Vercel)

```bash
npm i -g vercel
vercel login
vercel --prod
```

`vercel.json` in this repo sets the build command, output directory, and install command (`npm install --legacy-peer-deps`) for you.

## Demo Video

[PLACEHOLDER — will be added after recording]

## Project Structure

```
contracts/counter.compact       — the Compact contract (same as Level 1)
managed/counter/                 — compiler output (ZK keys, zkir, compiled JS)
public/managed/counter/          — ZK keys/zkir copied here for the browser to fetch at runtime
src/contract/counter.js          — compiled contract JS, statically imported by the frontend
src/hooks/useMidnight.ts         — Lace wallet connect/disconnect hook
src/components/WalletConnect.tsx — wallet connect/disconnect UI
src/components/CircuitCall.tsx   — deploy/join + circuit call UI
src/api/providers.ts             — browser-side midnight-js providers backed by Lace
src/api/contract.ts              — deploy/join + typed circuit call helpers
src/network.ts, src/wallet.ts, src/deploy.ts — Level 1's Node.js CLI deploy path (kept for reference)
tests/counter.test.ts            — contract test suite
```

## Note on deployment path

This contract was deployed to Preprod **from the frontend** (via a connected Lace wallet), not via the Node.js CLI script (`src/deploy.ts`). The CLI path builds its own wallet and syncs it directly against the public indexer, which proved unreliable against Preprod during development (the wallet-sdk's sync stream has no internal retry and can stall indefinitely on a transient indexer hiccup). The frontend path sidesteps this entirely — Lace owns wallet sync internally as a long-running browser extension, so the dApp never opens its own raw indexer subscription.
