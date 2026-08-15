import { validateOutcome } from '../src/validateOutcome.js';

console.log('================================================================');
console.log('🔬 STANDALONE TEST FOR PERSON 2 SLA OUTCOME VALIDATOR');
console.log('================================================================\n');

// 1. Direct Test Case A: Fresh, Valid JSON Payload
console.log('▶ [TEST A] Evaluating Fresh & Valid Response:');
const freshResponse = {
  status: 'OK',
  data: {
    city: 'Bengaluru',
    temp_c: 28.2,
    humidity: 55,
  },
  timestamp: new Date(Date.now() - 2500).toISOString(), // 2.5 seconds old
};

const passRules = {
  max_freshness_sec: 30,
  format: 'JSON' as const,
  max_latency_sec: 3.0,
  required_fields: ['status', 'data', 'timestamp'],
};

const passResult = validateOutcome({
  payment_id: 'REQ-AUDIT-PASS-001',
  agent_address: 'AGENT_TEST_WALLET_ADDRESS_AAAAAAAAAAAAAAAAAAAAAAAA',
  provider_address: 'PROVIDER_ALPHA_WALLET_BBBBBBBBBBBBBBBBBBBBBBBBBBB',
  amount: 25000,
  sla_rules: passRules,
  api_response: freshResponse,
  latency_sec: 0.385,
});

console.log('Outcome Result:     ', passResult.result);
console.log('Contract Action:    ', passResult.settlement_payload.action);
console.log('Settlement Amount:  ', passResult.settlement_payload.amount, 'micro-units');
console.log('Diagnostic Reason:  ', passResult.reason);
console.log('Freshness Evaluation:', passResult.rule_evaluations.freshness);
console.log('Format Evaluation:   ', passResult.rule_evaluations.format);
console.log('Latency Evaluation:  ', passResult.rule_evaluations.latency);

// 2. Direct Test Case B: Stale & Malformed Response with High Latency
console.log('\n----------------------------------------------------------------\n');
console.log('▶ [TEST B] Evaluating Stale & Malformed Response (3 Simultaneous Violations):');
const staleMalformedResponse = {
  unrelated_key: 'stale cached dump',
  timestamp: '5 hours ago', // 18,000 seconds old
};

const strictRules = {
  max_freshness_sec: 60,
  format: 'JSON' as const,
  max_latency_sec: 2.0,
  required_fields: ['status', 'data', 'timestamp'],
};

const failResult = validateOutcome({
  payment_id: 'REQ-AUDIT-FAIL-001',
  agent_address: 'AGENT_TEST_WALLET_ADDRESS_AAAAAAAAAAAAAAAAAAAAAAAA',
  provider_address: 'PROVIDER_STALE_WALLET_CCCCCCCCCCCCCCCCCCCCCCCCCCC',
  amount: 25000,
  sla_rules: strictRules,
  api_response: staleMalformedResponse,
  latency_sec: 5.42, // Exceeds 2.0s limit
});

console.log('Outcome Result:     ', failResult.result);
console.log('Contract Action:    ', failResult.settlement_payload.action);
console.log('Refund to Agent:    ', failResult.settlement_payload.amount, 'micro-units');
console.log('Slashed Bond Penalty:', failResult.settlement_payload.slash_amount, 'micro-units (10%)');
console.log('Diagnostic Reason:  ', failResult.reason);
console.log('Freshness Evaluation:', failResult.rule_evaluations.freshness);
console.log('Format Evaluation:   ', failResult.rule_evaluations.format);
console.log('Latency Evaluation:  ', failResult.rule_evaluations.latency);
console.log('\n================================================================');
