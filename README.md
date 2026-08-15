# SLAShield402

> A safety checkpoint for every payment an AI agent makes. Built on Algorand & x402.

SLAShield402 sits between an AI agent and any paid API. Before an agent spends funds, the **Firewall** verifies the price, enforces budget limits, and evaluates provider trust. The system then intercepts the call via **x402**, validates that the API response satisfies promised **SLA conditions** (freshness, schema/format, latency), and automatically executes on-chain settlement on **Algorand** (releasing funds to the provider on `PASS`, or issuing instant refunds and provider bond penalties on `FAIL`).

---

## 🏗️ Architecture & Real-Time Event Stream

```
                          ┌────────────────────────┐
                          │   AI Agent / Client    │
                          └───────────┬────────────┘
                                      │ (1) Request + x402 402 Challenge/Proof
                                      ▼
                      ┌────────────────────────────────┐
                      │  Person 1: Firewall API        │
                      │  - x402 HTTP 402 Challenge     │
                      │  - On-Chain Proof Verification │
                      │  - Budget & Price Anomaly Check│
                      │  - Provider Blocklist Check    │
                      └───────────────┬────────────────┘
                                      │ (2) Outgoing x402 Payment
                                      ▼
                      ┌────────────────────────────────┐
                      │       Target Paid API          │
                      └───────────────┬────────────────┘
                                      │ (3) Raw Response Data
                                      ▼
                      ┌────────────────────────────────┐
                      │  Person 2: SLA Validator       │
                      │  - Freshness (Age Delta) Check │
                      │  - Schema & Format Validation  │
                      │  - Roundtrip Latency Timing    │
                      └───────────────┬────────────────┘
                                      │ (4) PASS / FAIL Outcome
                                      ▼
                      ┌────────────────────────────────┐
                      │  Person 3: Algorand Contract   │
                      │  - PASS ➔ SETTLE to Provider   │
                      │  - FAIL ➔ REFUND + Bond Slash  │
                      └────────────────────────────────┘
                                      │
                                      ▼
                      ┌────────────────────────────────┐
                      │  Live WebSocket Event Stream   │
                      │  ws://localhost:3000/ws        │
                      │  - request_received            │
                      │  - challenge_issued (HTTP 402) │
                      │  - payment_verified            │
                      │  - firewall_decision           │
                      │  - target_api_response         │
                      │  - sla_decision                │
                      │  - settlement_result           │
                      └────────────────────────────────┘
```

---

## 🌟 Live Algorand Testnet Deployment Proofs

| Item | Details | Live Pera Explorer Link |
| :--- | :--- | :--- |
| **Smart Contract App ID** | `769236555` | [View Application #769236555](https://testnet.explorer.perawallet.app/application/769236555/) |
| **Contract App Address** | `4IXAMX45CUWKRHQEGUMAIHT45ABGOMO2LK6P5V2BHHLXNCOMSYDOJNCUXA` | [View Contract Address](https://testnet.explorer.perawallet.app/address/4IXAMX45CUWKRHQEGUMAIHT45ABGOMO2LK6P5V2BHHLXNCOMSYDOJNCUXA/) |
| **Contract Deployment Tx** | `IKEQATEBSHETIEHTUKVG33PIUEY7BZY2Q5RY6NLSIA252AFSIBJQ` | [View Deployment Tx](https://testnet.explorer.perawallet.app/tx/IKEQATEBSHETIEHTUKVG33PIUEY7BZY2Q5RY6NLSIA252AFSIBJQ/) |
| **Provider Bond Stake Tx** | `RPZFMYQTZ2RKWPTXNGQP53DWJ4ATX5H5MHGCWSFATQU4NCEG65FQ` | [View Bond Stake Tx](https://testnet.explorer.perawallet.app/tx/RPZFMYQTZ2RKWPTXNGQP53DWJ4ATX5H5MHGCWSFATQU4NCEG65FQ/) |
| **Official USDC Asset ID** | `10458941` *(Circle Testnet USDC)* | [View USDC ASA](https://testnet.explorer.perawallet.app/asset/10458941/) |

---

## 🚀 How to Run

### 1. Install Dependencies
```bash
# Install Node dependencies (Root, Person 1, Person 2, and Dashboard)
npm install
npm --prefix dashboard install

# Install Python dependencies (Person 3 Algorand Contract)
cd person-3-algorand-contract
pip install pyteal py-algorand-sdk algokit-utils pytest python-dotenv
cd ..
```

### 2. Environment Setup
Copy template configuration files:
```bash
cp .env.example .env
cp person-1-firewall-api/.env.example person-1-firewall-api/.env
cp person-3-algorand-contract/.env.example person-3-algorand-contract/.env
```

### 3. Start the Full System (Firewall API + Real-Time Live Dashboard)
The primary way to run and demo SLAShield402 is with a single command:
```bash
npm run dev:full
```
This concurrently starts:
- **Firewall Server & WebSocket Bus**: `http://localhost:3000` (`ws://localhost:3000/ws`)
- **Apple Design Live Dashboard**: `http://localhost:5173/`

Open `http://localhost:5173/` in your browser. From the dashboard, you can trigger real test requests, observe the 402 challenge/retry flow in the live stream, and click directly through to verified on-chain explorer links.

### 4. Alternative: CLI Demo Runner
If you prefer running scenarios strictly in terminal:
```bash
# Start server in Terminal 1
npm run dev

# Run all 4 CLI demo scenarios in Terminal 2
npm run demo
```

### 5. Run Unit & Component Test Suites
```bash
# Person 1 Firewall Tests
npm test

# Person 2 SLA Validator Tests
npm run test:person-2

# Person 3 Algorand Smart Contract Tests (10/10)
cd person-3-algorand-contract
$env:PYTHONPATH="."; py -3.12 -m pytest tests/ -v
cd ..
```

---

## 🎯 4 Canonical Demo Scenarios

1. **Scenario 1 (Normal Success)**: Agent requests weather data $\rightarrow$ Firewall issues `402`, client attaches verified on-chain proof $\rightarrow$ API returns fresh data $\rightarrow$ SLA `PASS` $\rightarrow$ Algorand contract executes `SETTLE` to provider.
2. **Scenario 2 (Price Spike / Budget Exceeded)**: Quote exceeds agent's budget ($0.50 > $0.15) $\rightarrow$ Firewall returns `HTTP 400 BLOCKED` $\rightarrow$ Zero target funds spent.
3. **Scenario 3 (Stale Data SLA Violation)**: Payment executes $\rightarrow$ API returns 4-hour old stale cache $\rightarrow$ SLA `FAIL` $\rightarrow$ Algorand contract executes `REFUND_AND_PENALIZE` (Agent refunded + Provider bond slashed 10%).
4. **Scenario 4 (Multi-Provider Benchmark)**: Comparative evaluation between high-reliability Provider Alpha (`PASS`) and degraded Provider Beta (`FAIL`).

---

## ⚠️ Known Limitations & Design Decisions

1. **On-Chain Payment Proof Verification vs Facilitator:**
   The hackathon specification references `https://facilitator.goplausible.xyz` as the intended payment facilitator. Our implementation issues x402-compliant `402 Payment Required` challenge headers and verifies payment proofs directly against the **Algorand Testnet Indexer API** (`https://testnet-idx.algonode.cloud/v2/transactions/${txId}`) to confirm that the transaction exists and is confirmed in a valid round on-chain. This provides direct decentralized verification while maintaining full architectural compatibility with GoPlausible facilitator endpoints.
2. **Payment Proof Replay Protection:**
   The firewall validates that any submitted `X-Payment-Proof` transaction hash exists and is confirmed on Algorand Testnet. For this MVP hackathon scope, the server does not maintain an on-disk database of consumed nonces/hashes, meaning a previously confirmed transaction hash can be submitted multiple times. Production deployment would store spent transaction IDs in Redis/Postgres with expiry TTLs.
3. **Shared Test Wallet for Demo Roles:**
   For local hackathon testing, the `DEFAULT_AGENT_ADDR` and `DEFAULT_PROVIDER_ADDR` default to the same funded testnet wallet (`YVEHNV3E...`) to ensure all smart contract inner transactions succeed without failing minimum balance constraints. Distinct addresses are fully supported via the `--agent` and `--provider` CLI flags.

---

## 👥 Team Directory Structure

```
slashield402/
├── shared/                          # 🔗 Shared JSON Schemas & Reference Payloads
├── person-1-firewall-api/           # 👤 Person 1: Firewall API & x402 Gateway (Hono + WebSocket)
├── person-2-sla-validator/          # 👤 Person 2: SLA Rules Engine & Demo Runner
├── person-3-algorand-contract/      # 👤 Person 3: Algorand Escrow & Slashing Contract (PyTeal)
└── dashboard/                   
```
