/**
 * Test Suite: Freshness SLA Rule
 */

import assert from 'node:assert/strict';
import {
  checkFreshnessRule,
  extractDataAgeSeconds,
  parseRelativeTimeString,
} from '../src/rules/freshnessRule.js';

console.log('🧪 Running Freshness Rule Tests...');

// Test 1: Relative time string parser
assert.equal(parseRelativeTimeString('10 seconds ago'), 10);
assert.equal(parseRelativeTimeString('5 mins ago'), 300);
assert.equal(parseRelativeTimeString('4 hours ago'), 14400);
assert.equal(parseRelativeTimeString('1 day ago'), 86400);
assert.equal(parseRelativeTimeString('invalid'), null);
console.log('  ✔ Relative time string parser works');

// Test 2: Fresh response (<60s)
const nowMs = 1723617600000;
const freshResponse = {
  body: {
    city: 'Bengaluru',
    temp_c: 28,
    timestamp: '15 seconds ago',
  },
};
const res1 = checkFreshnessRule(freshResponse, { max_freshness_sec: 60, format: 'JSON', max_latency_sec: 5 }, nowMs);
assert.equal(res1.pass, true);
assert.equal(res1.actual_age_sec, 15);
assert.equal(res1.max_allowed_sec, 60);
console.log('  ✔ Fresh response within 60s passes');

// Test 3: Stale response (>60s)
const staleResponse = {
  body: {
    city: 'Bengaluru',
    temp_c: 28,
    timestamp: '4 hours ago',
  },
};
const res2 = checkFreshnessRule(staleResponse, { max_freshness_sec: 60, format: 'JSON', max_latency_sec: 5 }, nowMs);
assert.equal(res2.pass, false);
assert.equal(res2.actual_age_sec, 14400);
assert(res2.reason.includes('exceeds maximum allowed freshness'));
console.log('  ✔ Stale response (>60s) fails with clear reason');

// Test 4: ISO date timestamp extraction
const tenSecsAgoIso = new Date(nowMs - 10000).toISOString();
const isoResponse = {
  body: {
    price: 1.25,
    timestamp: tenSecsAgoIso,
  },
};
const res3 = checkFreshnessRule(isoResponse, { max_freshness_sec: 30, format: 'JSON', max_latency_sec: 5 }, nowMs);
assert.equal(res3.pass, true);
assert.equal(res3.actual_age_sec, 10);
console.log('  ✔ ISO 8601 timestamp properly parsed and verified');

// Test 5: Unix timestamp (seconds)
const thirtySecsAgoUnixSec = (nowMs / 1000) - 30;
const unixResponse = {
  body: {
    quote: 45.2,
    ts: thirtySecsAgoUnixSec,
  },
};
const res4 = checkFreshnessRule(unixResponse, { max_freshness_sec: 45, format: 'JSON', max_latency_sec: 5 }, nowMs);
assert.equal(res4.pass, true);
assert.equal(res4.actual_age_sec, 30);
console.log('  ✔ Unix epoch timestamp (seconds) verified');

// Test 6: Explicit data_age_sec property
const explicitAgeResponse = {
  body: {
    data_age_sec: 120,
  },
};
const res5 = checkFreshnessRule(explicitAgeResponse, { max_freshness_sec: 60, format: 'JSON', max_latency_sec: 5 }, nowMs);
assert.equal(res5.pass, false);
assert.equal(res5.actual_age_sec, 120);
console.log('  ✔ Explicit data_age_sec checked');

console.log('✅ All Freshness Rule tests passed successfully!\n');
