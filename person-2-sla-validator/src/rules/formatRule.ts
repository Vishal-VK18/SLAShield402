/**
 * SLAShield402 - Format SLA Rule
 * Evaluates whether response body conforms to expected JSON/data structure and contains all required schema fields.
 */

import { FormatEvaluation, SLARules, TargetAPIResponse } from '../types.js';

/**
 * Helper to check nested field presence (e.g. "data.temperature" or "city")
 */
function hasNestedProperty(obj: any, path: string): boolean {
  if (!obj || typeof obj !== 'object') return false;
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined || !(part in current)) {
      return false;
    }
    current = current[part];
  }
  return current !== undefined && current !== null;
}

/**
 * Checks response formatting and required fields against SLA rules.
 */
export function checkFormatRule(
  response: TargetAPIResponse | any,
  slaRules: SLARules
): FormatEvaluation {
  const expectedFormat = (slaRules.format || 'JSON').toUpperCase();
  const rawBody = response?.rawBody !== undefined ? response.rawBody : (typeof response === 'string' ? response : undefined);
  let parsedBody = response?.body !== undefined ? response.body : response;

  let detectedFormat = 'UNKNOWN';

  // If body is raw string, attempt JSON parsing
  if (typeof parsedBody === 'string') {
    try {
      parsedBody = JSON.parse(parsedBody);
      detectedFormat = Array.isArray(parsedBody) ? 'JSON_ARRAY' : 'JSON_OBJECT';
    } catch {
      detectedFormat = 'TEXT';
    }
  } else if (parsedBody && typeof parsedBody === 'object') {
    detectedFormat = Array.isArray(parsedBody) ? 'JSON_ARRAY' : 'JSON_OBJECT';
  } else if (typeof parsedBody === 'number' || typeof parsedBody === 'boolean') {
    detectedFormat = 'PRIMITIVE';
  }

  // 1. Format mismatch checks
  if (expectedFormat === 'JSON' || expectedFormat === 'JSON_OBJECT' || expectedFormat === 'JSON_ARRAY') {
    if (detectedFormat !== 'JSON_OBJECT' && detectedFormat !== 'JSON_ARRAY') {
      return {
        pass: false,
        detected_format: detectedFormat,
        expected_format: expectedFormat,
        reason: `Format check FAILED: expected valid JSON format (${expectedFormat}), but received ${detectedFormat}`,
      };
    }

    if (expectedFormat === 'JSON_ARRAY' && detectedFormat !== 'JSON_ARRAY') {
      return {
        pass: false,
        detected_format: detectedFormat,
        expected_format: expectedFormat,
        reason: `Format check FAILED: expected JSON Array, but received JSON Object`,
      };
    }

    if (expectedFormat === 'JSON_OBJECT' && detectedFormat !== 'JSON_OBJECT') {
      return {
        pass: false,
        detected_format: detectedFormat,
        expected_format: expectedFormat,
        reason: `Format check FAILED: expected JSON Object, but received JSON Array`,
      };
    }
  }

  // 2. Required Fields check (if specified in SLA)
  if (slaRules.required_fields && Array.isArray(slaRules.required_fields) && slaRules.required_fields.length > 0) {
    const missing: string[] = [];

    for (const field of slaRules.required_fields) {
      if (detectedFormat === 'JSON_OBJECT') {
        if (!hasNestedProperty(parsedBody, field)) {
          missing.push(field);
        }
      } else if (detectedFormat === 'JSON_ARRAY') {
        // If array, check if first element or elements have required fields
        if (!parsedBody[0] || !hasNestedProperty(parsedBody[0], field)) {
          missing.push(field);
        }
      } else {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      return {
        pass: false,
        detected_format: detectedFormat,
        expected_format: expectedFormat,
        missing_fields: missing,
        reason: `Format check FAILED: missing required SLA fields: [${missing.join(', ')}]`,
      };
    }
  }

  // 3. Minimum payload size check
  if (slaRules.min_payload_size_bytes && slaRules.min_payload_size_bytes > 0) {
    const byteLength = rawBody ? Buffer.byteLength(rawBody, 'utf8') : Buffer.byteLength(JSON.stringify(parsedBody || ''), 'utf8');
    if (byteLength < slaRules.min_payload_size_bytes) {
      return {
        pass: false,
        detected_format: detectedFormat,
        expected_format: expectedFormat,
        reason: `Format check FAILED: payload size (${byteLength} bytes) is below minimum threshold (${slaRules.min_payload_size_bytes} bytes)`,
      };
    }
  }

  return {
    pass: true,
    detected_format: detectedFormat,
    expected_format: expectedFormat,
    reason: `Format check PASSED: valid ${detectedFormat} conforming to SLA specifications`,
  };
}
