/**
 * Test Suite: Format SLA Rule
 */

import assert from 'node:assert/strict';
import { checkFormatRule } from '../src/rules/formatRule.js';

console.log('🧪 Running Format Rule Tests...');

// Test 1: Valid JSON Object
const res1 = checkFormatRule({ body: { key: 'value' } }, {
  max_freshness_sec: 60,
  format: 'JSON',
  max_latency_sec: 5,
});
assert.equal(res1.pass, true);
assert.equal(res1.detected_format, 'JSON_OBJECT');
console.log('  ✔ Valid JSON object passes');

// Test 2: Valid JSON Array
const res2 = checkFormatRule({ body: [{ id: 1 }, { id: 2 }] }, {
  max_freshness_sec: 60,
  format: 'JSON_ARRAY',
  max_latency_sec: 5,
});
assert.equal(res2.pass, true);
assert.equal(res2.detected_format, 'JSON_ARRAY');
console.log('  ✔ Valid JSON array passes');

// Test 3: Raw string parsing
const res3 = checkFormatRule({ body: '{"city": "Paris", "temp": 19}' }, {
  max_freshness_sec: 60,
  format: 'JSON',
  max_latency_sec: 5,
});
assert.equal(res3.pass, true);
console.log('  ✔ Raw string JSON parses and passes');

// Test 4: Format mismatch (Plain text when JSON expected)
const res4 = checkFormatRule({ body: 'Internal Server Error 500' }, {
  max_freshness_sec: 60,
  format: 'JSON',
  max_latency_sec: 5,
});
assert.equal(res4.pass, false);
assert.equal(res4.detected_format, 'TEXT');
assert(res4.reason.includes('expected valid JSON format'));
console.log('  ✔ Plain text when JSON expected correctly fails');

// Test 5: Required fields satisfied
const res5 = checkFormatRule({
  body: {
    city: 'Bengaluru',
    temp_c: 28,
    data: { humidity: 60 },
  },
}, {
  max_freshness_sec: 60,
  format: 'JSON',
  max_latency_sec: 5,
  required_fields: ['city', 'temp_c', 'data.humidity'],
});
assert.equal(res5.pass, true);
console.log('  ✔ Required top-level & nested fields pass');

// Test 6: Missing required fields
const res6 = checkFormatRule({
  body: {
    city: 'Bengaluru',
  },
}, {
  max_freshness_sec: 60,
  format: 'JSON',
  max_latency_sec: 5,
  required_fields: ['city', 'temp_c', 'timestamp'],
});
assert.equal(res6.pass, false);
assert.deepEqual(res6.missing_fields, ['temp_c', 'timestamp']);
assert(res6.reason.includes('missing required SLA fields'));
console.log('  ✔ Missing required fields correctly identified and reported');

console.log('✅ All Format Rule tests passed successfully!\n');
