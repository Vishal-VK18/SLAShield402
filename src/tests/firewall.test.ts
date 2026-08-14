import { runFirewall } from '../firewall/runFirewall.js';

console.log('--- TEST 1: Valid Request ---');
console.log(runFirewall({ offerPrice: 0.02, budgetLeft: 1.00, providerAddress: '0xValidProvider' }));

console.log('\n--- TEST 2: Over Budget ---');
console.log(runFirewall({ offerPrice: 2.00, budgetLeft: 1.00, providerAddress: '0xValidProvider' }));

console.log('\n--- TEST 3: Price Spike ---');
console.log(runFirewall({ offerPrice: 0.50, budgetLeft: 5.00, providerAddress: '0xValidProvider' }));

console.log('\n--- TEST 4: Blocked Provider ---');
console.log(runFirewall({ offerPrice: 0.02, budgetLeft: 1.00, providerAddress: '0xBlocklistedProvider' }));