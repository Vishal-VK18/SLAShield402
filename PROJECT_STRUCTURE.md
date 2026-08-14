# SLAShield402 — Project Structure

One repo, three folders that map directly to Person 1 / Person 2 / Person 3.
Each person works only inside their own folder — nobody edits someone else's files.
They connect through the **shared/** folder, which holds the agreed data shapes (JSON schemas).

```
slashield402/
│
├── .gitignore
├── README.md
├── .env.example                     # template of required env vars (no real secrets)
│
├── shared/                          # 🔗 AGREED ON DAY ONE — everyone reads this, nobody owns it alone
│   ├── types/
│   │   ├── sla-rules.schema.json         # shape of the SLA an agent sends
│   │   ├── shield-request.schema.json    # shape of what Agent → SLAShield sends
│   │   ├── validator-result.schema.json  # shape of PASS/FAIL Person 2 sends to Person 3
│   │   └── settlement-payload.schema.json# shape of the on-chain settlement call
│   └── sample-data/
│       ├── demo-1-normal-success.json
│       ├── demo-2-price-too-high.json
│       ├── demo-3-stale-data-fail.json
│       └── demo-4-provider-comparison.json
│
├── person-1-firewall-api/           # 👤 PERSON 1 — Firewall & x402 endpoint (incoming + outgoing)
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── src/
│   │   ├── index.ts                      # server entrypoint (Hono app)
│   │   ├── server.ts                     # /shield/check x402 endpoint setup
│   │   ├── firewall/
│   │   │   ├── budgetCheck.ts             # rule 1: budget check
│   │   │   ├── priceCheck.ts              # rule 2: price anomaly check
│   │   │   ├── providerCheck.ts           # rule 3: allow/blocklist check
│   │   │   └── runFirewall.ts             # combines all 3 checks → APPROVE/BLOCK
│   │   ├── client/
│   │   │   └── payTargetApi.ts            # outgoing x402 client call (@x402/fetch)
│   │   └── routes/
│   │       └── shieldCheck.ts             # main route handler, wires everything together
│   └── tests/
│       ├── firewall.test.ts
│       └── payTargetApi.test.ts
│
├── person-2-sla-validator/          # 👤 PERSON 2 — SLA rules & Outcome Validator
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts                      # exportable validator module
│   │   ├── rules/
│   │   │   ├── freshnessRule.ts           # checks data age vs max_freshness_sec
│   │   │   ├── formatRule.ts              # checks response format (e.g. JSON)
│   │   │   └── latencyRule.ts             # checks response time vs max_latency_sec
│   │   ├── validateOutcome.ts             # runs all rules → PASS/FAIL + reason
│   │   └── demo/
│   │       └── runDemoScenarios.ts        # scripted demo runner for hack day
│   └── tests/
│       ├── freshnessRule.test.ts
│       ├── formatRule.test.ts
│       └── validateOutcome.test.ts
│
├── person-3-algorand-contract/      # 👤 PERSON 3 — Algorand smart contract & settlement
│   ├── pyproject.toml (or package.json if using TypeScript AlgoKit)
│   ├── .algokit.toml
│   ├── contracts/
│   │   └── slashield_escrow/
│   │       ├── contract.py                # main contract: LOCKED / APPROVED / SETTLED / REFUNDED
│   │       ├── state.py                   # contract state definitions
│   │       └── bond.py                    # provider bond registration + slashing logic
│   ├── deployment/
│   │   ├── deploy_config.py
│   │   └── deploy.py                      # deploy to Algorand testnet
│   ├── scripts/
│   │   ├── registerProvider.ts/py         # provider bond deposit script
│   │   ├── settle.ts/py                   # triggers SETTLED path (on PASS)
│   │   └── refundAndPenalize.ts/py        # triggers REFUNDED path (on FAIL)
│   └── tests/
│       ├── test_settle_flow.py
│       └── test_refund_flow.py
│
├── docs/
│   ├── architecture-diagram.png
│   ├── workflow.md                  # the 5-step flow (from the HTML doc)
│   └── demo-script.md               # the 4 live demo scenarios for judges
│
└── scripts/
    └── run-full-demo.sh             # one command that starts all 3 pieces together for the final demo
```

---

## How the folders connect

```
person-1-firewall-api/          person-2-sla-validator/        person-3-algorand-contract/
        │                                │                                │
        │  imports & calls               │  imports & calls               │
        │  validateOutcome()             │  settle() / refund()           │
        └───────────────►  shared/types/  ◄───────────────────────────────┘
                    (everyone imports schemas from here, nobody edits them mid-build)
```

- **Person 1's** endpoint calls **Person 2's** `validateOutcome()` function directly (imported as a package or called via a small internal API — team's choice).
- **Person 2's** result (`PASS` / `FAIL`) is passed straight into **Person 3's** `settle()` or `refundAndPenalize()` script.
- All three only ever read from `shared/types/` — that folder is locked after the day-one agreement, so nobody's build breaks because someone changed a field name.

---

## Day-one setup checklist (before anyone codes)

1. Create the repo with this folder structure.
2. Add `.gitignore` (already have this).
3. Fill in the 4 JSON schema files in `shared/types/` together — this is the 30-minute sync.
4. Each person `cd`s into their own folder and runs their own `npm init` / `algokit init` — independent from here on.
5. Agree on one shared `.env.example` for facilitator URL, testnet wallet addresses, and USDC ASA ID.

---

## Suggested `README.md` sections (for judges browsing your repo)

```
# SLAShield402
## What it does
## Architecture diagram
## How to run (person-1, person-2, person-3, full demo)
## x402 endpoints exposed
## Algorand contract address (testnet)
## Team
```
