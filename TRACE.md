# Architecture & Codebase Execution Trace

This document records the exact component mappings, file paths, endpoints, and data flows traced directly from the codebase.

---

## 1. Component Map & Responsibilities

| Component | Repository Path | Responsibility & Key Exports |
|---|---|---|
| **AI Agent / Client** | `person-1-firewall-api/src/client/signPaymentProof.ts`<br/>`person-2-sla-validator/src/demo/runDemoScenarios.ts` | Intercepts HTTP 402 challenge, dynamically constructs and signs fresh Algorand USDC ASA transfers (`#10458941`) using `algosdk`, and retries with `X-Payment-Proof`. |
| **SLAShield402 Gateway & Firewall (Person 1)** | `person-1-firewall-api/src/server.ts`<br/>`person-1-firewall-api/src/routes/shieldCheck.ts`<br/>`person-1-firewall-api/src/verifier/verifyPaymentProof.ts` | Serves `POST /shield/check`, issues 402 challenges with CAIP-2 network strings, enforces pre-flight budget rules, guards against replay attacks, executes upstream calls, and invokes contract subprocesses. |
| **Bazaar Discovery Config** | `person-1-firewall-api/src/x402/config.ts` | Implements `declareDiscoveryExtension` exposing machine-readable Bazaar discovery metadata on `GET /api/discovery`. |
| **Algorand Testnet Indexer** | `https://testnet-idx.algonode.cloud/v2/transactions/{txId}` | Used by `verifyPaymentProof.ts` to confirm on-chain payment proof existence, transaction type (`axfer`), and round finality. |
| **SLA Outcome Validator (Person 2)** | `person-2-sla-validator/src/validateOutcome.ts` | Inspects target API responses in real time, validating timestamp freshness ($\le 60$s), JSON syntax format, and measured network roundtrip latency ($\le 5$s). |
| **Escrow Smart Contract (Person 3)** | `person-3-algorand-contract/contracts/slashield_escrow/`<br/>`person-3-algorand-contract/scripts/settle.py`<br/>`person-3-algorand-contract/scripts/refundAndPenalize.py` | PyTeal AVM smart contract (`App ID #769236555`). Executes atomic inner transaction settlement on SLA PASS (`settle.py`), or inner transaction refund + 10% provider bond slashing on SLA FAIL (`refundAndPenalize.py`). |
| **Real-Time Dashboard** | `dashboard/src/App.tsx`<br/>`dashboard/src/components/` | Subscribes to `/ws` WebSocket event telemetry, visualizing 402 challenge states, firewall budget blocks, and live Pera Explorer transaction links. |

---

## 2. End-to-End Execution Trace

### Phase 1: Request & 402 Negotiation
1. **Request:** Client makes an unpaid `POST /shield/check` request with payload `{ target_api, offer_price, agent_budget_left }`.
2. **Challenge:** Server detects absence of `X-Payment-Proof` header and returns:
   - Status: `HTTP/1.1 402 Payment Required`
   - Header: `WWW-Authenticate: x402 realm="SLAShield402", amount="0.001", currency="USDC", network="algorand-testnet", caip2="algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=", app_id="769236555", recipient="YVEHNV3E..."`
   - Body: JSON challenge containing `amount_usdc: 0.001`, `asset_id: "10458941"`, `payment_id`, and `nonce`.

### Phase 2: Client-Side Dynamic Signing & Retry
3. **Signing:** `signAndBroadcastPayment()` in `signPaymentProof.ts` constructs an `axfer` transaction with `assetIndex: 10458941`, signs with client secret key, submits to Algorand Testnet algod, and awaits confirmation round.
4. **Retry:** Client retries `POST /shield/check` with `X-Payment-Proof: {"txId": "<FRESH_TX_ID>", "amount_paid": 1000}`.

### Phase 3: Firewall Verification & Pre-flight Inspection
5. **Replay Check:** `verifyPaymentProof.ts` checks in-memory `consumedTxIds` set. If seen, returns `HTTP 403 Forbidden`. If new, adds to set.
6. **Indexer Verification:** Queries `https://testnet-idx.algonode.cloud/v2/transactions/${txId}`, verifying `confirmed-round > 0`.
7. **Budget Gate:** Compares `offer_price` against `agent_budget_left`. If exceeded, returns `HTTP 400 BLOCKED` (zero upstream funds spent).

### Phase 4: Target API Execution & SLA Validation
8. **Upstream Call:** Gateway executes outgoing call to target API (simulated oracle/data provider) and records latency via `performance.now()`.
9. **Outcome Validation:** `validateOutcome()` evaluates response data against SLA rules:
   - Freshness: `(now - timestamp) <= max_freshness_sec`
   - Format: JSON validation
   - Latency: `measured_latency <= max_latency_sec`

### Phase 5: Smart Contract Settlement or Slashing
10. **SLA PASS:** Server runs `settle.py`, triggering `approve_and_settle` on App `#769236555`. Smart contract issues inner transaction transferring funds to provider.
11. **SLA FAIL:** Server runs `refundAndPenalize.py`, triggering `fail_and_refund` on App `#769236555`. Smart contract issues inner transaction refunding agent and slashes provider's bonded stake in global state by 10%.
12. **Response:** Server returns `HTTP 200 OK` with `shield_fee_tx`, `confirmed_round`, `settlement_tx_id`, and `settlement_explorer_url`.
