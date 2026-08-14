/**
 * SLAShield402 - Freshness SLA Rule
 * Evaluates whether response data recency satisfies the SLA max_freshness_sec threshold.
 */

import { FreshnessEvaluation, SLARules, TargetAPIResponse } from '../types.js';

/**
 * Parses relative time descriptions (e.g., "4 hours ago", "10 seconds ago", "2m ago") into seconds.
 */
export function parseRelativeTimeString(text: string): number | null {
  const normalized = text.trim().toLowerCase();
  
  // Direct matching for patterns like "X (hours|minutes|seconds|days) ago"
  const regex = /(\d+(?:\.\d+)?)\s*(s|sec|second|seconds|m|min|minute|minutes|h|hr|hour|hours|d|day|days)\s*(?:ago)?/;
  const match = normalized.match(regex);
  if (!match) return null;

  const value = parseFloat(match[1]);
  const unit = match[2];

  if (unit.startsWith('s')) {
    return value;
  } else if (unit.startsWith('m')) {
    return value * 60;
  } else if (unit.startsWith('h')) {
    return value * 3600;
  } else if (unit.startsWith('d')) {
    return value * 86400;
  }
  return null;
}

/**
 * Extracts data timestamp or age from response body or headers.
 */
export function extractDataAgeSeconds(
  response: TargetAPIResponse | any,
  nowMs: number = Date.now()
): { ageSec: number; sourceField?: string; rawValue?: any } {
  // If response is null/undefined
  if (!response) {
    return { ageSec: 0 };
  }

  const body = response.body !== undefined ? response.body : response;
  const headers = response.headers || {};

  // 1. Direct explicit age field in body
  if (body && typeof body === 'object') {
    const ageCandidates = ['data_age_sec', 'age_sec', 'actual_data_age', 'freshness_sec'];
    for (const key of ageCandidates) {
      if (typeof body[key] === 'number') {
        return { ageSec: body[key], sourceField: key, rawValue: body[key] };
      }
    }
  }

  // 2. Timestamp candidates in body
  if (body && typeof body === 'object') {
    const tsCandidates = ['timestamp', 'time', 'date', 'updated_at', 'created_at', 'ts', 'dt', 'generated_at'];
    for (const key of tsCandidates) {
      const val = body[key];
      if (val !== undefined && val !== null) {
        // A. Relative string e.g. "4 hours ago"
        if (typeof val === 'string') {
          const parsedRel = parseRelativeTimeString(val);
          if (parsedRel !== null) {
            return { ageSec: parsedRel, sourceField: key, rawValue: val };
          }

          // B. ISO timestamp or date string
          const parsedDate = Date.parse(val);
          if (!isNaN(parsedDate)) {
            const age = Math.max(0, (nowMs - parsedDate) / 1000);
            return { ageSec: age, sourceField: key, rawValue: val };
          }
        }

        // C. Numeric epoch timestamp (seconds or milliseconds)
        if (typeof val === 'number') {
          if (val > 1e11) {
            // Milliseconds
            const age = Math.max(0, (nowMs - val) / 1000);
            return { ageSec: age, sourceField: key, rawValue: val };
          } else if (val > 1e8) {
            // Seconds
            const age = Math.max(0, (nowMs / 1000) - val);
            return { ageSec: age, sourceField: key, rawValue: val };
          } else {
            // Raw delta age in seconds
            return { ageSec: val, sourceField: key, rawValue: val };
          }
        }
      }
    }
  }

  // 3. HTTP Header checks (Age header, Last-Modified, Date)
  if (headers) {
    const ageHeader = headers['age'] || headers['Age'];
    if (ageHeader) {
      const parsedAge = parseFloat(String(ageHeader));
      if (!isNaN(parsedAge)) {
        return { ageSec: parsedAge, sourceField: 'Header: Age', rawValue: ageHeader };
      }
    }

    const lastMod = headers['last-modified'] || headers['Last-Modified'];
    if (lastMod) {
      const parsedDate = Date.parse(String(lastMod));
      if (!isNaN(parsedDate)) {
        const age = Math.max(0, (nowMs - parsedDate) / 1000);
        return { ageSec: age, sourceField: 'Header: Last-Modified', rawValue: lastMod };
      }
    }
  }

  // Default: If no explicit timestamp is attached, assume freshly generated (0s age)
  return { ageSec: 0, sourceField: 'default', rawValue: 'none' };
}

/**
 * Checks data freshness against SLA rules.
 */
export function checkFreshnessRule(
  response: TargetAPIResponse | any,
  slaRules: SLARules,
  evaluationTimeMs: number = Date.now()
): FreshnessEvaluation {
  const maxAllowed = slaRules.max_freshness_sec;
  const extraction = extractDataAgeSeconds(response, evaluationTimeMs);
  const actualAge = Math.round(extraction.ageSec * 100) / 100;

  if (actualAge <= maxAllowed) {
    return {
      pass: true,
      actual_age_sec: actualAge,
      max_allowed_sec: maxAllowed,
      extracted_timestamp: extraction.rawValue,
      reason: `Freshness check PASSED (age: ${actualAge}s <= max: ${maxAllowed}s)`,
    };
  } else {
    return {
      pass: false,
      actual_age_sec: actualAge,
      max_allowed_sec: maxAllowed,
      extracted_timestamp: extraction.rawValue,
      reason: `Freshness check FAILED: response data age (${actualAge}s) exceeds maximum allowed freshness (${maxAllowed}s)`,
    };
  }
}
