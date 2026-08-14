/**
 * SLAShield402 - Person 2 Type Definitions
 * Typed representations of Day-1 agreed shared JSON schemas.
 */

export type DataFormat = 'JSON' | 'JSON_OBJECT' | 'JSON_ARRAY' | 'TEXT' | 'RAW';

export interface SLARules {
  /** Maximum allowable age of the response data in seconds */
  max_freshness_sec: number;
  /** Expected format of response body */
  format: DataFormat | string;
  /** Maximum roundtrip response latency in seconds */
  max_latency_sec: number;
  /** Optional required keys that must exist in the response */
  required_fields?: string[];
  /** Optional minimum byte size of the payload */
  min_payload_size_bytes?: number;
}

export interface ShieldRequest {
  payment_id?: string;
  target_api: string;
  agent_wallet?: string;
  agent_address?: string;
  provider_address: string;
  offer_price: number | string;
  agent_budget_left: number | string;
  sla_rules: SLARules;
}

export interface TargetAPIResponse {
  statusCode?: number;
  headers?: Record<string, string | string[] | undefined>;
  body?: any;
  rawBody?: string;
  latencySec?: number;
}

export interface FreshnessEvaluation {
  pass: boolean;
  actual_age_sec: number;
  max_allowed_sec: number;
  extracted_timestamp?: string | number;
  reason: string;
}

export interface FormatEvaluation {
  pass: boolean;
  detected_format: string;
  expected_format: string;
  missing_fields?: string[];
  reason: string;
}

export interface LatencyEvaluation {
  pass: boolean;
  actual_latency_sec: number;
  max_allowed_sec: number;
  reason: string;
}

export interface RuleEvaluations {
  freshness: FreshnessEvaluation;
  format: FormatEvaluation;
  latency: LatencyEvaluation;
}

export type OutcomeResult = 'PASS' | 'FAIL';

export interface ValidatorResult {
  payment_id: string;
  result: OutcomeResult;
  reason: string;
  agent_address: string;
  provider_address: string;
  amount: number;
  rule_evaluations: RuleEvaluations;
  settlement_payload: SettlementPayload;
  evaluated_at: string;
}

export type SettlementAction = 'SETTLE' | 'REFUND_AND_PENALIZE';

export interface SettlementPayload {
  payment_id: string;
  action: SettlementAction;
  agent_address: string;
  provider_address: string;
  amount: number;
  slash_amount: number;
  reason?: string;
}

export interface ValidationContext {
  payment_id?: string;
  agent_address?: string;
  provider_address?: string;
  amount?: number;
  sla_rules: SLARules;
  api_response: TargetAPIResponse | any;
  latency_sec?: number;
  evaluation_time?: Date | number;
}
