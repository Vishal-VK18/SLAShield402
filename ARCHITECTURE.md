# Architecture: SLAShield402

SLAShield402 is an autonomous AI agent payment firewall, real-time SLA outcome validator, and conditional smart contract escrow gateway built on Algorand Testnet.

## System Diagram

```mermaid
flowchart TD
    Agent["Autonomous AI Agent<br/>(Client / Payer)"]
    Firewall["SLAShield402 Firewall<br/>(Hono Gateway :3000)"]
    TargetAPI["Target Data Provider / Oracle<br/>(Paid Upstream API)"]
    Validator["Person 2: SLA Outcome Validator<br/>(Freshness, Format, Latency)"]
    Escrow["Person 3: Algorand Escrow Contract<br/>(App ID #769236555)"]
    Chain["Algorand TestNet<br/>(USDC ASA #10458941)"]

    Agent -->|1. POST /shield/check (Unpaid)| Firewall
    Firewall -->>|2. HTTP 402 + USDC Challenge| Agent
    Agent -->|3. Sign USDC ASA Tx + Retry with X-Payment-Proof| Firewall
    Firewall -->|4. Verify On-Chain Fee + Enforce Spend Budget| Firewall
    Firewall -->|5. Outgoing Paid Call| TargetAPI
    TargetAPI -->>|6. Raw Response Data + Measured Latency| Firewall
    Firewall -->|7. Evaluate SLA Rules| Validator
    Validator -->|8a. PASS: approve_and_settle| Escrow
    Validator -->|8b. FAIL: fail_and_refund + slash bond| Escrow
    Escrow -->|9. Execute Inner Transaction Settlement/Refund| Chain
    Firewall -->>|10. HTTP 200 OK + SLA Decision + Settlement Tx ID| Agent
```

## Sequence Flow

```txt
   Agent / Client                 SLAShield402 Gateway           Target API           Algorand Smart Contract
        |                                  |                         |                           |
        |--- 1. POST /shield/check ------->|                         |                           |
        |<-- 2. 402 Payment Required ------|                         |                           |
        |--- 3. Retry + X-Payment-Proof -->|                         |                           |
        |                                  |-- 4. Spend Check PASS ->|                           |
        |                                  |-- 5. Outgoing Call ---->|                           |
        |                                  |<-- 6. Response Data ----|                           |
        |                                  |-- 7. SLA Outcome Validation                         |
        |                                  |-- 8. Trigger Subprocess (Settle or Refund) -------->|
        |                                  |<-- 9. Inner Tx ID & Explorer URL -------------------|
        |<-- 10. 200 OK + Receipts + Data -|                         |                           |
```

## Components

| Component | Responsibility | Tech Stack |
|---|---|---|
| **Autonomous AI Agent** | Intercepts 402 challenge, evaluates spend policy, signs fresh USDC ASA transfers, retries with payment proof. | TypeScript / `algosdk` / `@x402/fetch` |
| **SLAShield402 Firewall** | Enforces budget caps, verifies on-chain payment proofs, guards against replay attacks, exposes `/api/discovery`. | Node.js / `@x402/hono` / `@x402/avm` |
| **SLA Outcome Validator** | Real-time payload inspection measuring schema format, timestamp freshness, and network roundtrip latency. | TypeScript / Perf Hooks / JSON Schema |
| **Smart Contract Escrow** | Holds provider bonds, conditionally releases funds on SLA pass (`settle.py`), or refunds agent & slashes provider bond by 10% on SLA failure (`refundAndPenalize.py`). | PyTeal / Algorand AVM (App `#769236555`) |
| **Real-Time Dashboard** | Visualizes live x402 challenge cycles, budget decisions, WebSocket event telemetry, and on-chain Pera explorer receipts. | React / Vite / TailwindCSS / Lucide |

## Why Two-Phase Escrow Replaces Standard Facilitator `/settle`
In standard x402 implementations (e.g. GoPlausible hosted facilitator), a merchant immediately calls `POST /settle` upon receiving a payment proof, pocketing the fee *before* delivering data. If the provider returns hallucinated, stale, or malformed data, the agent has already lost its funds with no recourse.

**SLAShield402 introduces two-phase escrow settlement:**
1. **Pre-flight Gate:** Firewall checks agent budget and pricing anomalies before funds are locked.
2. **Post-response SLA Verification:** The smart contract locks the payment in escrow until Person 2's Outcome Validator verifies data freshness ($\le 60$s), JSON syntax, and latency ($\le 5$s).
3. **Automated Enforcement:** On SLA pass, funds settle to the provider. On SLA failure, the contract instantly refunds the agent and slashes the provider's bonded stake by 10%.

## What's Real vs. What's Simulated

- **Real:**
  - `402 Payment Required` challenge with official CAIP-2 network identifier (`algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=`).
  - Client-side dynamic signing and broadcasting of fresh Algorand USDC ASA transfers (`#10458941`) on Testnet.
  - On-chain fee verification and round confirmation via Algonode Testnet Indexer.
  - Session replay attack rejection returning `HTTP 403`.
  - Real Python subprocess invocations executing PyTeal smart contract transactions on Algorand Testnet (`App ID #769236555`).
  - Verified on-chain inner transaction payouts and provider bond slash deductions visible on Pera Explorer.
  - Live WebSocket telemetry stream feeding the React dashboard.
- **Simulated:**
  - Target weather/market oracle endpoints are mocked with deterministic timestamps and latency profiles to reliably demonstrate SLA pass vs. stale SLA fail conditions.

## Known Limitations

1. **In-Memory Replay Guard:** The replay protection set is maintained in memory for the active server session. Production deployments would use Redis with TTL expiration.
2. **Demo Account Opt-In:** For frictionless hackathon evaluation without requiring multiple dispenser wallets, `DEFAULT_AGENT_ADDR` and `DEFAULT_PROVIDER_ADDR` default to the same funded testnet wallet (`YVEHNV3E...`). Distinct addresses are supported via CLI flags (`--agent`, `--provider`).
