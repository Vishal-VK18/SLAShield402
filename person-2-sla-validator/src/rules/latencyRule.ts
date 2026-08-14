/**
 * SLAShield402 - Latency SLA Rule
 * Evaluates whether API roundtrip response time satisfies the max_latency_sec SLA requirement.
 */

import { LatencyEvaluation, SLARules, TargetAPIResponse } from '../types.js';

/**
 * Extracts latency from response object or explicitly provided timing metrics.
 */
export function extractLatencySec(
  response: TargetAPIResponse | any,
  explicitLatencySec?: number
): number {
  if (typeof explicitLatencySec === 'number') {
    return explicitLatencySec;
  }

  if (response && typeof response === 'object') {
    if (typeof response.latencySec === 'number') {
      return response.latencySec;
    }
    if (typeof response.measured_latency_sec === 'number') {
      return response.measured_latency_sec;
    }
    if (typeof response.duration_ms === 'number') {
      return response.duration_ms / 1000;
    }

    // Check response headers for latency metrics
    const headers = response.headers;
    if (headers) {
      const respTime = headers['x-response-time'] || headers['X-Response-Time'];
      if (respTime) {
        const parsed = parseFloat(String(respTime).replace(/ms|s/i, ''));
        if (!isNaN(parsed)) {
          return String(respTime).toLowerCase().includes('ms') ? parsed / 1000 : parsed;
        }
      }
    }
  }

  // Default to 0 if no timing metric was recorded
  return 0;
}

/**
 * Checks roundtrip latency against SLA rules.
 */
export function checkLatencyRule(
  response: TargetAPIResponse | any,
  slaRules: SLARules,
  explicitLatencySec?: number
): LatencyEvaluation {
  const maxAllowed = slaRules.max_latency_sec;
  const actualLatency = extractLatencySec(response, explicitLatencySec);
  const roundedLatency = Math.round(actualLatency * 1000) / 1000;

  if (roundedLatency <= maxAllowed) {
    return {
      pass: true,
      actual_latency_sec: roundedLatency,
      max_allowed_sec: maxAllowed,
      reason: `Latency check PASSED (latency: ${roundedLatency}s <= max: ${maxAllowed}s)`,
    };
  } else {
    return {
      pass: false,
      actual_latency_sec: roundedLatency,
      max_allowed_sec: maxAllowed,
      reason: `Latency check FAILED: measured latency (${roundedLatency}s) exceeds maximum allowed (${maxAllowed}s)`,
    };
  }
}
