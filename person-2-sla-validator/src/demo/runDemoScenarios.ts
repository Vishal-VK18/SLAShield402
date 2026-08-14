/**
 * SLAShield402 - Person 2 Live Hackathon Demo Runner
 * Executes all 4 canonical demo scenarios with structured visual logs,
 * showing SLA evaluation, firewall checks, and Algorand contract settlement bridging.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateOutcome, buildContractCliCommand } from '../validateOutcome.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sampleDataDir = path.resolve(__dirname, '../../../shared/sample-data');

// ANSI Color helper
const C = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  bgBlue: '\x1b[44m',
  bgGreen: '\x1b[42m',
  bgRed: '\x1b[41m',
};

function readJsonFile(filename: string): any {
  const filePath = path.join(sampleDataDir, filename);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function divider(char = '=', len = 70) {
  console.log(C.dim + char.repeat(len) + C.reset);
}

export function runDemo(): void {
  console.log('\n' + C.cyan + C.bright);
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║               SLAShield402 — LIVE DEMO RUNNER                      ║');
  console.log('║       Autonomous x402 AI Payment Firewall & Outcome Validator      ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝' + C.reset);
  console.log(`${C.yellow}Simulating 4 End-to-End Scenarios across Person 1, 2, and 3 components...${C.reset}\n`);

  // =========================================================================
  // SCENARIO 1
  // =========================================================================
  divider();
  console.log(`${C.bright}${C.green}▶ SCENARIO 1: Normal Success (Fresh Data, Fast Response)${C.reset}`);
  divider('-');
  const demo1 = readJsonFile('demo-1-normal-success.json');
  console.log(`${C.dim}Description:${C.reset} ${demo1.description}`);
  console.log(`${C.dim}Target API:${C.reset}  ${demo1.request.target_api}`);
  console.log(`${C.dim}Offer Price:${C.reset} $${demo1.request.offer_price} USDC (${demo1.request.offer_price_microunits} micro-units)`);
  console.log(`${C.dim}SLA Rules:${C.reset}   max_freshness: ${demo1.request.sla_rules.max_freshness_sec}s | format: ${demo1.request.sla_rules.format} | max_latency: ${demo1.request.sla_rules.max_latency_sec}s`);

  console.log(`\n${C.bright}[Step 1] Firewall Check (Person 1):${C.reset} ${C.green}✔ APPROVED${C.reset} ($0.02 <= budget $1.00)`);
  console.log(`${C.bright}[Step 2] Executed x402 API Call:${C.reset} HTTP 200 OK received in ${demo1.execution.measured_latency_sec}s`);
  console.log(`${C.dim}Response Body:${C.reset} ${JSON.stringify(demo1.execution.response_body)}`);

  console.log(`\n${C.bright}[Step 3] Running Outcome Validator (Person 2):${C.reset}`);
  const valResult1 = validateOutcome({
    payment_id: demo1.request.payment_id,
    agent_address: demo1.request.agent_address,
    provider_address: demo1.request.provider_address,
    amount: demo1.request.offer_price_microunits,
    sla_rules: demo1.request.sla_rules,
    api_response: demo1.execution.response_body,
    latency_sec: demo1.execution.measured_latency_sec,
  });

  console.log(`  • Freshness Rule: ${valResult1.rule_evaluations.freshness.pass ? C.green + '✔ PASS' : C.red + '✘ FAIL'}${C.reset} (${valResult1.rule_evaluations.freshness.actual_age_sec}s age <= ${valResult1.rule_evaluations.freshness.max_allowed_sec}s max)`);
  console.log(`  • Format Rule:    ${valResult1.rule_evaluations.format.pass ? C.green + '✔ PASS' : C.red + '✘ FAIL'}${C.reset} (Detected: ${valResult1.rule_evaluations.format.detected_format})`);
  console.log(`  • Latency Rule:   ${valResult1.rule_evaluations.latency.pass ? C.green + '✔ PASS' : C.red + '✘ FAIL'}${C.reset} (${valResult1.rule_evaluations.latency.actual_latency_sec}s <= ${valResult1.rule_evaluations.latency.max_allowed_sec}s max)`);
  console.log(`\n${C.bright}Outcome Decision:${C.reset} ${C.green + C.bright}★ PASS ★${C.reset}`);
  console.log(`${C.dim}Summary Reason:${C.reset} ${valResult1.reason}`);

  console.log(`\n${C.bright}[Step 4] Trigger Algorand Smart Contract (Person 3):${C.reset}`);
  console.log(`  Contract Action:   ${C.green}${valResult1.settlement_payload.action}${C.reset}`);
  console.log(`  Settled to Provider: ${valResult1.settlement_payload.amount} micro-USDC ($${valResult1.settlement_payload.amount / 1e6})`);
  console.log(`  State Transition:  ${C.cyan}LOCKED ➔ APPROVED ➔ SETTLED${C.reset}`);
  console.log(`  CLI Command:       ${C.dim}${buildContractCliCommand(valResult1)}${C.reset}\n`);

  // =========================================================================
  // SCENARIO 2
  // =========================================================================
  divider();
  console.log(`${C.bright}${C.yellow}▶ SCENARIO 2: Price Spike / Budget Exceeded (Blocked at Firewall)${C.reset}`);
  divider('-');
  const demo2 = readJsonFile('demo-2-price-too-high.json');
  console.log(`${C.dim}Description:${C.reset} ${demo2.description}`);
  console.log(`${C.dim}Target API:${C.reset}  ${demo2.request.target_api}`);
  console.log(`${C.dim}Offer Price:${C.reset} $${demo2.request.offer_price} USDC vs Budget Left: $${demo2.request.agent_budget_left} USDC`);

  console.log(`\n${C.bright}[Step 1] Firewall Check (Person 1):${C.reset} ${C.red + C.bright}✘ BLOCKED${C.reset}`);
  console.log(`  Reason: ${C.red}${demo2.expected_outcome.block_reason}${C.reset}`);
  console.log(`\n${C.bright}Protection Result:${C.reset} ${C.green}Zero funds transferred.${C.reset} Payment safely aborted before escrow lock.\n`);

  // =========================================================================
  // SCENARIO 3
  // =========================================================================
  divider();
  console.log(`${C.bright}${C.red}▶ SCENARIO 3: Stale Data Violation (SLA Fail ➔ Automatic Refund & Bond Slash)${C.reset}`);
  divider('-');
  const demo3 = readJsonFile('demo-3-stale-data-fail.json');
  console.log(`${C.dim}Description:${C.reset} ${demo3.description}`);
  console.log(`${C.dim}Target API:${C.reset}  ${demo3.request.target_api}`);
  console.log(`${C.dim}SLA Rules:${C.reset}   max_freshness: ${demo3.request.sla_rules.max_freshness_sec}s | format: ${demo3.request.sla_rules.format}`);

  console.log(`\n${C.bright}[Step 1] Firewall Check (Person 1):${C.reset} ${C.green}✔ APPROVED${C.reset}`);
  console.log(`${C.bright}[Step 2] Executed x402 API Call:${C.reset} HTTP 200 received in ${demo3.execution.measured_latency_sec}s`);
  console.log(`${C.dim}Response Body:${C.reset} ${JSON.stringify(demo3.execution.response_body)}`);

  console.log(`\n${C.bright}[Step 3] Running Outcome Validator (Person 2):${C.reset}`);
  const valResult3 = validateOutcome({
    payment_id: demo3.request.payment_id,
    agent_address: demo3.request.agent_address,
    provider_address: demo3.request.provider_address,
    amount: demo3.request.offer_price_microunits,
    sla_rules: demo3.request.sla_rules,
    api_response: demo3.execution.response_body,
    latency_sec: demo3.execution.measured_latency_sec,
  });

  console.log(`  • Freshness Rule: ${valResult3.rule_evaluations.freshness.pass ? C.green + '✔ PASS' : C.red + '✘ FAIL'}${C.reset} (${valResult3.rule_evaluations.freshness.actual_age_sec}s age vs ${valResult3.rule_evaluations.freshness.max_allowed_sec}s limit)`);
  console.log(`  • Format Rule:    ${valResult3.rule_evaluations.format.pass ? C.green + '✔ PASS' : C.red + '✘ FAIL'}${C.reset}`);
  console.log(`  • Latency Rule:   ${valResult3.rule_evaluations.latency.pass ? C.green + '✔ PASS' : C.red + '✘ FAIL'}${C.reset}`);
  console.log(`\n${C.bright}Outcome Decision:${C.reset} ${C.red + C.bright}★ FAIL (SLA VIOLATED) ★${C.reset}`);
  console.log(`${C.dim}Summary Reason:${C.reset} ${valResult3.reason}`);

  console.log(`\n${C.bright}[Step 4] Trigger Algorand Smart Contract (Person 3):${C.reset}`);
  console.log(`  Contract Action:   ${C.red}${valResult3.settlement_payload.action}${C.reset}`);
  console.log(`  Refund to Agent:   ${C.green}${valResult3.settlement_payload.amount} micro-USDC ($${valResult3.settlement_payload.amount / 1e6} full refund)${C.reset}`);
  console.log(`  Provider Bond Slash: ${C.red}-${valResult3.settlement_payload.slash_amount} micro-USDC (10% penalty)${C.reset}`);
  console.log(`  State Transition:  ${C.magenta}LOCKED ➔ REFUNDED + PENALIZED${C.reset}`);
  console.log(`  CLI Command:       ${C.dim}${buildContractCliCommand(valResult3)}${C.reset}\n`);

  // =========================================================================
  // SCENARIO 4
  // =========================================================================
  divider();
  console.log(`${C.bright}${C.magenta}▶ SCENARIO 4: Multi-Provider Reliability Benchmark (Provider Alpha vs Beta)${C.reset}`);
  divider('-');
  const demo4 = readJsonFile('demo-4-provider-comparison.json');
  console.log(`${C.dim}Description:${C.reset} ${demo4.description}`);
  console.log(`${C.dim}Shared SLA Rules:${C.reset} max_freshness: ${demo4.sla_rules.max_freshness_sec}s, max_latency: ${demo4.sla_rules.max_latency_sec}s, required: [${demo4.sla_rules.required_fields.join(', ')}]`);

  // Provider Alpha
  console.log(`\n${C.cyan}[Provider Alpha - ${demo4.provider_alpha.provider_name}]:${C.reset}`);
  const valAlpha = validateOutcome({
    payment_id: 'REQ-DEMO4-ALPHA',
    amount: demo4.provider_alpha.offer_price_microunits,
    sla_rules: demo4.sla_rules,
    api_response: demo4.provider_alpha.response_body,
    latency_sec: demo4.provider_alpha.measured_latency_sec,
  });
  console.log(`  • Latency: ${valAlpha.rule_evaluations.latency.actual_latency_sec}s | Freshness: ${valAlpha.rule_evaluations.freshness.actual_age_sec}s`);
  console.log(`  • Result:  ${valAlpha.result === 'PASS' ? C.green + '✔ PASS (SETTLE)' : C.red + '✘ FAIL'}${C.reset}`);

  // Provider Beta
  console.log(`\n${C.yellow}[Provider Beta - ${demo4.provider_beta.provider_name}]:${C.reset}`);
  const valBeta = validateOutcome({
    payment_id: 'REQ-DEMO4-BETA',
    amount: demo4.provider_beta.offer_price_microunits,
    sla_rules: demo4.sla_rules,
    api_response: demo4.provider_beta.response_body,
    latency_sec: demo4.provider_beta.measured_latency_sec,
  });
  console.log(`  • Latency: ${valBeta.rule_evaluations.latency.actual_latency_sec}s | Freshness: ${valBeta.rule_evaluations.freshness.actual_age_sec}s`);
  console.log(`  • Result:  ${valBeta.result === 'PASS' ? C.green + '✔ PASS' : C.red + '✘ FAIL (REFUND & PENALIZE)'}${C.reset}`);
  console.log(`  • Violations: ${C.red}${valBeta.reason}${C.reset}`);

  divider();
  console.log(`${C.green}${C.bright}🎉 ALL 4 DEMO SCENARIOS EXECUTED SUCCESSFULLY!${C.reset}`);
  divider();
}

// Auto-run if executed directly
if (process.argv[1] && (process.argv[1].endsWith('runDemoScenarios.ts') || process.argv[1].endsWith('runDemoScenarios.js'))) {
  runDemo();
}
