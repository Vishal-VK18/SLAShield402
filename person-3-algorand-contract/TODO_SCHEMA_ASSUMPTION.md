# TODO Schema Assumptions (Person 3 — Algorand Contract)

This document notes the JSON data shapes assumed by Person 3 (`person-3-algorand-contract`) for integration with Person 2's SLA Validator (`person-2-sla-validator`) and Person 1's Firewall API (`person-1-firewall-api`).

These match the contract interface described in `shared/types/validator-result.schema.json` and `shared/types/settlement-payload.schema.json`.

---

## 1. Validator Result Schema Assumption (`shared/types/validator-result.schema.json`)

When Person 2 completes SLA evaluation, the output result payload passed to the contract trigger is assumed to be:

```json
{
  "payment_id": "REQ-2026-0814-001",
  "result": "PASS",
  "reason": "Freshness requirement satisfied (12s < 60s max allowed)",
  "agent_address": "SLASAGENTERADDRESSXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  "provider_address": "SLASPROVIDERADDRESSXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  "amount": 20000
}
```

- `result`: `"PASS"` or `"FAIL"`
- `payment_id`: Unique request reference string tying off-chain request to smart contract escrow
- `amount`: Amount in USDC micro-units (e.g. 20,000 = 0.02 USDC)

---

## 2. Settlement Payload Schema Assumption (`shared/types/settlement-payload.schema.json`)

When triggering smart contract actions in `scripts/settle.py` or `scripts/refundAndPenalize.py`, the payload shape is:

```json
{
  "payment_id": "REQ-2026-0814-001",
  "action": "SETTLE",
  "agent_address": "SLASAGENTERADDRESSXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  "provider_address": "SLASPROVIDERADDRESSXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  "amount": 20000,
  "slash_amount": 2000
}
```

- `action`: `"SETTLE"` (for PASS) or `"REFUND_AND_PENALIZE"` (for FAIL)
- `slash_amount`: Penalty deducted from provider's staked bond on SLA failure (default 10% / fixed penalty)

---

## Sync Action Required
Please confirm these exact field names (`payment_id`, `result`, `action`, `agent_address`, `provider_address`, `amount`) during our team sync meeting!
