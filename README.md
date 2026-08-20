# SLAShield402

> Autonomous x402 AI Payment Firewall, Real-Time SLA Validator & Conditional Algorand Smart Contract Escrow Layer.

## What is this?

**SLAShield402** is an agentic payment infrastructure gateway that sits between autonomous AI agents and paid external APIs. It solves two critical production risks in agentic commerce: **wallet depletion from unexpected price spikes**, and **financial loss from paying upfront for stale, malformed, or slow API responses**.

Using the **x402 payment protocol** on **Algorand Testnet**, SLAShield402 enforces pre-flight spend policy limits, measures real-time response SLAs (Freshness, Format, Latency), and coordinates conditional smart contract escrow settlements with automated 10% provider bond slashing when quality guarantees are broken.

---

## How It Works

![SLAShield402 x402 Sequence Flow](./docs/assets/sequence_diagram.png)

```mermaid
sequenceDiagram
    participant Agent as AI Agent / Client
    participant Shield as SLAShield402 (Person 1)
    participant Indexer as Algorand Indexer (verification)
    participant SLA as SLA Validator (Person 2)
    participant Contract as Escrow Contract (Person 3, App #769236555)
    participant Target as Target API (simulated)

    Agent->>Shield: 1. POST /shield/check
    Shield-->>Agent: 2. 402 Payment Required (price, CAIP-2, ASA 10458941)
    Note over Agent: 3. sign USDC ASA transfer (axfer)
    Agent->>Shield: 4. retry with X-Payment-Proof
    Shield->>Indexer: 5. verify tx on-chain
    Indexer-->>Shield: confirmed round
    Shield->>Target: 6. outgoing x402 call (simulated target)
    Target-->>Shield: response data
    Shield->>SLA: 7. validate outcome (freshness/format/latency)
    SLA-->>Shield: PASS or FAIL
    Shield->>Contract: 8. spawn subprocess (settle.py / refundAndPenalize.py)
    Contract-->>Shield: settlement/refund tx id
    Shield-->>Agent: 9. 200 OK + shield_fee_tx + settlement_tx_id
```

1. **Pre-flight Firewall Gate:** Evaluates agent budget caps and provider authorization before funds leave the wallet.
2. **x402 Challenge & Client Signing:** Returns `HTTP 402 Payment Required`; client dynamically signs and broadcasts a fresh USDC ASA payment on Algorand Testnet.
3. **Outgoing API Execution & Timing:** Executes upstream call and records sub-second roundtrip network latency.
4. **Real-Time SLA Validation:** Evaluates response JSON syntax, data timestamp freshness ($\le 60$s), and latency thresholds ($\le 5$s).
5. **Conditional Escrow Settlement & Slashing:**
   - **SLA PASS:** Smart contract triggers `approve_and_settle`, releasing payment to the provider.
   - **SLA FAIL:** Smart contract triggers `fail_and_refund`, instantly refunding the agent and slashing the provider's bonded stake by 10%.

---

## Architecture

![SLAShield402 System Architecture Flowchart](./docs/assets/architecture_flowchart.png)

```mermaid
flowchart LR
    Client["AI Agent / Client"]
    Server["SLAShield402<br/>Firewall + x402 Gateway"]
    Indexer["Algorand Indexer<br/>(verification)"]
    SLA["SLA Validator<br/>(Person 2)"]
    Contract["Escrow Smart Contract<br/>App #769236555"]
    Dashboard["Real-Time Dashboard<br/>(WebSocket, observability)"]

    Client -->|1. request| Server
    Server -->|2. 402 + price| Client
    Client -->|3. sign + retry USDC| Server
    Server -->|4. verify| Indexer
    Server -->|5. validate| SLA
    Server -->|6. settle/refund| Contract
    Contract -->|7. tx id| Server
    Server -->|8. 200 + receipt| Client
    Server -.->|live events| Dashboard
```


---

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

---

## Pricing

| Endpoint / Action | Price | Description |
|---|---|---|
| `POST /shield/check` | 0.001 USDC | Pre-flight firewall inspection, SLA verification & escrow guarantee fee |
| `GET /api/discovery` | Free ($0.00) | Public Bazaar discovery catalog metadata for agent crawlers |
| `GET /api/events/recent` | Free ($0.00) | Recent execution events and telemetry backlog |

---

## Tech Stack

| Layer | Technology | Role |
|---|---|---|
| **Payment Protocol** | `x402` (`exact` scheme, USDC on Algorand Testnet) | Standardized HTTP 402 negotiation and client headers |
| **Client Signer** | `@x402/fetch` / `algosdk` (`v3.2.0`) | Dynamic client-side USDC ASA transaction construction and signing |
| **Resource Gateway** | `@x402/hono` / `@x402/avm` (`v2.19.0`) | High-performance HTTP server with CAIP-2 network verification |
| **Discovery Extension** | `@x402-avm/extensions` (`v2.6.1`) | Exposes machine-readable Bazaar metadata on `GET /api/discovery` |
| **Smart Contract Escrow** | PyTeal / Algorand AVM (`App ID #769236555`) | Conditional escrow settlement and provider bond slashing logic |
| **Facilitator Choice** | **Custom Two-Phase Escrow vs. GoPlausible Facilitator** | *Architectural Rationale:* Hosted facilitators (like GoPlausible) execute immediate `/settle` upfront before data is delivered. SLAShield402 routes through a two-phase smart contract escrow to enable post-response SLA validation and bond penalties. |
| **Frontend Dashboard** | React / Vite / TailwindCSS / Lucide Icons | Apple-style real-time telemetry dashboard with WebSocket streaming |

---

## Setup & Running Locally

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/Vishal-VK18/SLAShield402.git
cd SLAShield402
npm install
npm --prefix dashboard install
pip install -r person-3-algorand-contract/requirements.txt
```

### 2. Configure Environment
```bash
cp .env.example .env
# Ensure DEPLOYER_MNEMONIC, ALGOD_SERVER, and APP_ID (769236555) are set
```

### 3. Fund Testnet Wallet & Opt In
1. Fund with Testnet ALGO: [Lora Dispenser](https://lora.algokit.io/testnet/fund)
2. Opt in to USDC ASA ID `10458941`:
```bash
python person-3-algorand-contract/scripts/optInUsdc.py
```

### 4. Run the Full Stack
```bash
# Starts both Firewall Gateway (:3000) and Real-Time Dashboard (:5173)
npm run dev:full
```

### 5. Run the Automated Live Demo
```bash
npm run demo
```

---

## Live On-Chain Proofs (Algorand Testnet)

| Flow | Transaction ID | Confirmation Round | Pera Explorer Link |
|---|---|:---:|---|
| **Fresh USDC ASA Client Sign** | `7DDDB4OSEYWCLBKZV23BXVUQTEBSSLIE2EALXJARQAUQ2QJCFAOQ` | 66487818 | [View Tx](https://testnet.explorer.perawallet.app/tx/7DDDB4OSEYWCLBKZV23BXVUQTEBSSLIE2EALXJARQAUQ2QJCFAOQ/) |
| **Scenario 1: SLA Pass Settlement** | `DWR5KCQPJMCTRNFKRJNKZE7VD6HK5YMRI2RCKAUWNMGONDVHZUTA` | 66487820 | [View Tx](https://testnet.explorer.perawallet.app/tx/DWR5KCQPJMCTRNFKRJNKZE7VD6HK5YMRI2RCKAUWNMGONDVHZUTA/) |
| **Scenario 3: Refund & Bond Slash** | `KXZXOGNHT7BGUOH6JPFVFULVIOD7H6AGGVYKIVRSIWORYDSMSE4Q` | 66487823 | [View Tx](https://testnet.explorer.perawallet.app/tx/KXZXOGNHT7BGUOH6JPFVFULVIOD7H6AGGVYKIVRSIWORYDSMSE4Q/) |

---

## What's Next (Mainnet Readiness)

To transition from Algorand Testnet to Mainnet:
1. Switch CAIP-2 network identifier to Mainnet (`algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=`).
2. Update USDC Asset ID to Mainnet (`31566704`).
3. Transition client signing from `.env` mnemonic to a secure HSM or Web3 Agent Key Management Service (e.g. Turnkey/Privy).
4. Persist consumed transaction nonces in Redis with TTLs for distributed replay protection.

---

## Team

- **Vishal D & Team SLAShield402** — Web3 & AI Agents Engineers.
