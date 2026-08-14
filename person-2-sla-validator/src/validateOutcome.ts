/**
 * SLAShield402 - Main Outcome Validator
 * Orchestrates all SLA rules (Freshness, Format, Latency), determines PASS/FAIL outcome,
 * and compiles the on-chain Settlement Payload for Person 3's Algorand Smart Contract.
 */

import { checkFreshnessRule } from './rules/freshnessRule.js';
import { checkFormatRule } from './rules/formatRule.js';
import { checkLatencyRule } from './rules/latencyRule.js';
import {
  OutcomeResult,
  RuleEvaluations,
  SettlementPayload,
  ValidationContext,
  ValidatorResult,
} from './types.js';

export const DEFAULT_AGENT_ADDRESS = 'YVEHNV3EWF4GULZHABH64QKOYLE5MO2MSBAAK7O76A2ESACA5OV2AZSOKQ';
export const DEFAULT_PROVIDER_ADDRESS = 'YVEHNV3EWF4GULZHABH64QKOYLE5MO2MSBAAK7O76A2ESACA5OV2AZSOKQ';
export const DEFAULT_MICRO_AMOUNT = 20_000; // 0.02 USDC

/**
 * Validates the API response outcome against specified SLA rules.
 */
export function validateOutcome(context: ValidationContext): ValidatorResult {
  const paymentId = context.payment_id || `REQ-${Date.now()}`;
  const agentAddress = context.agent_address || DEFAULT_AGENT_ADDRESS;
  const providerAddress = context.provider_address || DEFAULT_PROVIDER_ADDRESS;
  const amount = context.amount !== undefined ? context.amount : DEFAULT_MICRO_AMOUNT;

  const nowMs = typeof context.evaluation_time === 'number'
    ? context.evaluation_time
    : (context.evaluation_time instanceof Date ? context.evaluation_time.getTime() : Date.now());

  // 1. Execute individual rule checks
  const freshnessEval = checkFreshnessRule(context.api_response, context.sla_rules, nowMs);
  const formatEval = checkFormatRule(context.api_response, context.sla_rules);
  const latencyEval = checkLatencyRule(context.api_response, context.sla_rules, context.latency_sec);

  const ruleEvaluations: RuleEvaluations = {
    freshness: freshnessEval,
    format: formatEval,
    latency: latencyEval,
  };

  // 2. Synthesize outcome
  const allPassed = freshnessEval.pass && formatEval.pass && latencyEval.pass;
  const result: OutcomeResult = allPassed ? 'PASS' : 'FAIL';

  // 3. Formulate diagnostic reason summary
  let summaryReason: string;
  if (allPassed) {
    summaryReason = `SLA PASSED: All requirements satisfied (Freshness: ${freshnessEval.actual_age_sec}s <= ${freshnessEval.max_allowed_sec}s, Format: ${formatEval.detected_format}, Latency: ${latencyEval.actual_latency_sec}s <= ${latencyEval.max_allowed_sec}s)`;
  } else {
    const failures: string[] = [];
    if (!freshnessEval.pass) failures.push(freshnessEval.reason);
    if (!formatEval.pass) failures.push(formatEval.reason);
    if (!latencyEval.pass) failures.push(latencyEval.reason);
    summaryReason = `SLA VIOLATED: ${failures.join(' | ')}`;
  }

  // 4. Construct smart contract settlement payload
  const slashAmount = result === 'FAIL' ? Math.max(1000, Math.floor(amount * 0.10)) : 0;
  const settlementPayload: SettlementPayload = {
    payment_id: paymentId,
    action: result === 'PASS' ? 'SETTLE' : 'REFUND_AND_PENALIZE',
    agent_address: agentAddress,
    provider_address: providerAddress,
    amount,
    slash_amount: slashAmount,
    reason: summaryReason,
  };

  return {
    payment_id: paymentId,
    result,
    reason: summaryReason,
    agent_address: agentAddress,
    provider_address: providerAddress,
    amount,
    rule_evaluations: ruleEvaluations,
    settlement_payload: settlementPayload,
    evaluated_at: new Date(nowMs).toISOString(),
  };
}

/**
 * Helper to build command-line arguments string for Person 3's settlement scripts.
 */
export function buildContractCliCommand(validatorResult: ValidatorResult, pythonBinary: string = 'python'): string {
  const p = validatorResult.settlement_payload;
  if (p.action === 'SETTLE') {
    return `${pythonBinary} person-3-algorand-contract/scripts/settle.py --payment_id "${p.payment_id}" --agent "${p.agent_address}" --provider "${p.provider_address}" --amount ${p.amount}`;
  } else {
    return `${pythonBinary} person-3-algorand-contract/scripts/refundAndPenalize.py --payment_id "${p.payment_id}" --agent "${p.agent_address}" --provider "${p.provider_address}" --amount ${p.amount} --slash_amount ${p.slash_amount}`;
  }
}
