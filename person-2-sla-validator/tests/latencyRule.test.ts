/**
 * Test Suite: Latency SLA Rule
 */

import assert from 'node:assert/strict';
import { checkLatencyRule, extractLatencySec } from '../src/rules/latencyRule.js';

console.log('🧪 Running Latency Rule Tests...');

// Test 1: Fast latency (0.8s <= 5.0s max)
const res1 = checkLatencyRule({ latencySec: 0.8 }, {
  max_freshness_sec: 60,
  format: 'JSON',
  max_latency_sec: 5.0,
});
assert.equal(res1.pass, true);
assert.equal(res1.actual_latency_sec, 0.8);
assert.equal(res1.max_allowed_sec, 5.0);
console.log('  ✔ Latency within limit passes');

// Test 2: Slow latency (7.5s > 5.0s max)
const res2 = checkLatencyRule({ latencySec: 7.5 }, {
  max_freshness_sec: 60,
  format: 'JSON',
  max_latency_sec: 5.0,
});
assert.equal(res2.pass, false);
assert.equal(res2.actual_latency_sec, 7.5);
assert(res2.reason.includes('exceeds maximum allowed'));
console.log('  ✔ Latency exceeding limit fails');

// Test 3: Extract from explicit parameter
const res3 = checkLatencyRule({}, {
  max_freshness_sec: 60,
  format: 'JSON',
  max_latency_sec: 3.0,
}, 2.45);
assert.equal(res3.pass, true);
assert.equal(res3.actual_latency_sec, 2.45);
console.log('  ✔ Latency extracted from explicit argument');

// Test 4: Extract from header (e.g. "x-response-time": "120ms")
const res4 = checkLatencyRule({
  headers: { 'x-response-time': '120ms' },
}, {
  max_freshness_sec: 60,
  format: 'JSON',
  max_latency_sec: 1.0,
});
assert.equal(res4.pass, true);
assert.equal(res4.actual_latency_sec, 0.12);
console.log('  ✔ Latency extracted from X-Response-Time header');

console.log('✅ All Latency Rule tests passed successfully!\n');
