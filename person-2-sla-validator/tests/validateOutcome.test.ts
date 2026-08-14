/**
 * Test Suite: Outcome Validator & Settlement Integration
 */

import assert from 'node:assert/strict';
import { validateOutcome, buildContractCliCommand } from '../src/validateOutcome.js';

console.log('🧪 Running Main Outcome Validator Tests...');

const fixedNow = 1723617600000;

// Test 1: Full PASS Scenario (Fresh, Valid JSON, Fast)
const passResult = validateOutcome({
  payment_id: 'REQ-TEST-PASS-001',
  agent_address: 'AGENTADDR11111111111111111111111111111111111111111111111',
  provider_address: 'PROVIDERADDR22222222222222222222222222222222222222222222',
  amount: 20000,
  sla_rules: {
    max_freshness_sec: 60,
    format: 'JSON',
    max_latency_sec: 5.0,
    required_fields: ['city', 'temp_c'],
  },
  api_response: {
    city: 'Bengaluru',
    temp_c: 28.5,
    timestamp: '10 seconds ago',
  },
  latency_sec: 0.85,
  evaluation_time: fixedNow,
});

assert.equal(passResult.result, 'PASS');
assert.equal(passResult.payment_id, 'REQ-TEST-PASS-001');
assert.equal(passResult.rule_evaluations.freshness.pass, true);
assert.equal(passResult.rule_evaluations.format.pass, true);
assert.equal(passResult.rule_evaluations.latency.pass, true);
assert.equal(passResult.settlement_payload.action, 'SETTLE');
assert.equal(passResult.settlement_payload.amount, 20000);
assert.equal(passResult.settlement_payload.slash_amount, 0);

const settleCli = buildContractCliCommand(passResult);
assert(settleCli.includes('settle.py'));
assert(settleCli.includes('--payment_id "REQ-TEST-PASS-001"'));
console.log('  ✔ Full PASS scenario generates SETTLE action & contract command');

// Test 2: Full FAIL Scenario (Stale Data)
const failResult = validateOutcome({
  payment_id: 'REQ-TEST-FAIL-002',
  agent_address: 'AGENTADDR11111111111111111111111111111111111111111111111',
  provider_address: 'PROVIDERADDR22222222222222222222222222222222222222222222',
  amount: 20000,
  sla_rules: {
    max_freshness_sec: 60,
    format: 'JSON',
    max_latency_sec: 5.0,
  },
  api_response: {
    city: 'Bengaluru',
    temp_c: 28.5,
    timestamp: '4 hours ago',
  },
  latency_sec: 1.1,
  evaluation_time: fixedNow,
});

assert.equal(failResult.result, 'FAIL');
assert.equal(failResult.rule_evaluations.freshness.pass, false);
assert.equal(failResult.rule_evaluations.format.pass, true);
assert.equal(failResult.rule_evaluations.latency.pass, true);
assert.equal(failResult.settlement_payload.action, 'REFUND_AND_PENALIZE');
assert.equal(failResult.settlement_payload.amount, 20000);
assert.equal(failResult.settlement_payload.slash_amount, 2000); // 10% penalty
assert(failResult.reason.includes('SLA VIOLATED'));

const refundCli = buildContractCliCommand(failResult);
assert(refundCli.includes('refundAndPenalize.py'));
assert(refundCli.includes('--slash_amount 2000'));
console.log('  ✔ Stale FAIL scenario generates REFUND_AND_PENALIZE and slashed bond penalty');

// Test 3: Multiple Violations (Stale + Slow + Missing Required Field)
const multiFailResult = validateOutcome({
  payment_id: 'REQ-TEST-MULTI-FAIL',
  sla_rules: {
    max_freshness_sec: 30,
    format: 'JSON',
    max_latency_sec: 2.0,
    required_fields: ['missing_field'],
  },
  api_response: {
    timestamp: '5 hours ago',
  },
  latency_sec: 6.2,
  evaluation_time: fixedNow,
});

assert.equal(multiFailResult.result, 'FAIL');
assert.equal(multiFailResult.rule_evaluations.freshness.pass, false);
assert.equal(multiFailResult.rule_evaluations.format.pass, false);
assert.equal(multiFailResult.rule_evaluations.latency.pass, false);
assert(multiFailResult.reason.includes('Freshness check FAILED'));
assert(multiFailResult.reason.includes('Format check FAILED'));
assert(multiFailResult.reason.includes('Latency check FAILED'));
console.log('  ✔ Multi-violation scenario properly diagnoses all failed rules');

console.log('✅ All Main Outcome Validator tests passed successfully!\n');
