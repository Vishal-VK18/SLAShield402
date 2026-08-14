# SLAShield402

> A safety checkpoint for every payment an AI agent makes. Built on Algorand & x402.

SLAShield402 intercepts AI agent payment requests before execution to enforce budget and price boundaries, executes the payment via x402 on the agent's behalf, validates that the returned data satisfies all promised SLA conditions (freshness, format, latency), and coordinates with an Algorand smart contract to settle funds or issue automatic refunds and provider bond penalties.

---

## Architecture Overview

```
                          ┌────────────────────────┐
                          │   AI Agent / Client    │
                          └───────────┬────────────┘
                                      │ (1) Request & x402 Fee
                                      ▼
                      ┌────────────────────────────────┐
                      │  Person 1: Firewall API        │
                      │  - Budget Check                │
                      │  - Price Anomaly Check         │
                      │  - Provider Allow/Blocklist    │
                      └───────────────┬────────────────┘
                                      │ (2) Outgoing x402 Payment
                                      ▼
                      ┌────────────────────────────────┐
                      │       Target Paid API          │
                      └───────────────┬────────────────┘
                                      │ (3) Response Data
                                      ▼
                      ┌────────────────────────────────┐
                      │  Person 2: SLA Validator       │
                      │  - Freshness Check             │
                      │  - Format & Schema Check       │
                      │  - Roundtrip Latency Check     │
                      └───────────────┬────────────────┘
                                      │ (4) PASS / FAIL Result
                                      ▼
                      ┌────────────────────────────────┐
                      │  Person 3: Algorand Contract   │
                      │  - PASS ➔ SETTLE to Provider   │
                      │  - FAIL ➔ REFUND + Bond Slash  │
                      └────────────────────────────────┘
```

---

## Directory Structure

```
slashield402/
├── shared/                          # 🔗 Agreed Day-1 Schemas & Demo Data
│   ├── types/
│   │   ├── sla-rules.schema.json
│   │   ├── shield-request.schema.json
│   │   ├── validator-result.schema.json
│   │   └── settlement-payload.schema.json
│   └── sample-data/
│       ├── demo-1-normal-success.json
│       ├── demo-2-price-too-high.json
│       ├── demo-3-stale-data-fail.json
│       └── demo-4-provider-comparison.json
│
├── person-1-firewall-api/           # 👤 Person 1: Firewall & x402 Endpoint
├── person-2-sla-validator/          # 👤 Person 2: SLA Rules & Outcome Validator
│   ├── src/
│   │   ├── rules/                   # Freshness, Format, Latency rule engines
│   │   ├── validateOutcome.ts       # Main orchestrator & contract payload builder
│   │   └── demo/runDemoScenarios.ts # Interactive presentation runner
│   └── tests/                       # Unit & integration test suites
│
└── person-3-algorand-contract/      # 👤 Person 3: Algorand Escrow & Slashing Contract
```

---

## How to Run

### 1. Run Person 2 SLA Validator Tests
```bash
# Run all unit tests
npx tsx person-2-sla-validator/tests/freshnessRule.test.ts
npx tsx person-2-sla-validator/tests/formatRule.test.ts
npx tsx person-2-sla-validator/tests/latencyRule.test.ts
npx tsx person-2-sla-validator/tests/validateOutcome.test.ts
```

### 2. Run Live Hackathon Demo
```bash
# Executes all 4 canonical presentation scenarios
npx tsx person-2-sla-validator/src/demo/runDemoScenarios.ts
```

### 3. Run Person 1 Firewall API
```bash
npm run dev
```

### 4. Run Person 3 Algorand Contract Tests
```bash
pytest person-3-algorand-contract/tests/test_settle_flow.py
pytest person-3-algorand-contract/tests/test_refund_flow.py
```

---

## Demo Scenarios

1. **Scenario 1 (Normal Success)**: Agent requests weather data $\rightarrow$ Firewall approves $\rightarrow$ API returns fresh data in 0.85s $\rightarrow$ SLA `PASS` $\rightarrow$ Algorand contract executes `SETTLE`.
2. **Scenario 2 (Price Spike / Budget Exceeded)**: Quote exceeds budget $\rightarrow$ Firewall `BLOCKED` before payment $\rightarrow$ Zero funds spent.
3. **Scenario 3 (Stale Data SLA Violation)**: Payment executes $\rightarrow$ API returns 4-hour old stale cache $\rightarrow$ SLA `FAIL` $\rightarrow$ Algorand contract executes `REFUND_AND_PENALIZE` (Agent refunded + Provider bond slashed 10%).
4. **Scenario 4 (Provider Reliability Benchmark)**: Side-by-side comparison between high-reliability Provider Alpha (`PASS`) and degraded Provider Beta (`FAIL`).

---

## Team Roles

- **Person 1**: Firewall & x402 API Gateway (`person-1-firewall-api/`)
- **Person 2**: SLA Rules Engine & Outcome Validator (`person-2-sla-validator/` & `shared/`)
- **Person 3**: Algorand Escrow & Settlement Smart Contracts (`person-3-algorand-contract/`)