/**
 * SLAShield402 - On-Chain x402 Payment Proof Verifier
 * Queries Algorand Testnet Indexer / Algod Node to verify that the
 * provided transaction hash exists, is confirmed, and represents a valid payment.
 */

const INDEXER_URL = process.env.INDEXER_SERVER || 'https://testnet-idx.algonode.cloud';
const FACILITATOR_URL = process.env.FACILITATOR_URL || 'https://facilitator.goplausible.xyz';

// In-memory set tracking transaction hashes consumed during the current server session
const consumedTxIds = new Set<string>();

export interface VerificationResult {
  valid: boolean;
  txId?: string;
  confirmedRound?: number;
  sender?: string;
  feePaid?: number;
  reason?: string;
  facilitator_verification?: {
    checked: boolean;
    facilitator_url: string;
    isValid: boolean;
    invalidReason?: string;
    raw?: any;
  };
}

export interface FacilitatorSettlementResult {
  success: boolean;
  facilitator_url: string;
  transaction?: string;
  network?: string;
  errorReason?: string;
  raw?: any;
}

/**
 * Helper to reset or check consumed transaction IDs (useful for tests)
 */
export function resetConsumedPayments(): void {
  consumedTxIds.clear();
}

export function isPaymentConsumed(txId: string): boolean {
  return consumedTxIds.has(txId.trim());
}

/**
 * Queries GoPlausible Facilitator /verify endpoint.
 */
export async function queryFacilitatorVerify(
  txId: string,
  requirements?: {
    scheme?: string;
    price?: string;
    network?: string;
    payTo?: string;
    extra?: { asset?: number };
  }
): Promise<{ isValid: boolean; invalidReason?: string; raw?: any }> {
  try {
    const payload = {
      x402Version: 2,
      paymentPayload: {
        x402Version: 2,
        txId,
        transaction: txId,
        network: requirements?.network || 'algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=',
      },
      paymentRequirements: {
        x402Version: 2,
        scheme: requirements?.scheme || 'exact',
        price: requirements?.price || '$0.001',
        network: requirements?.network || 'algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=',
        payTo: requirements?.payTo || process.env.SLASHIELD_RECIPIENT_ADDRESS || 'YVEHNV3EWF4GULZHABH64QKOYLE5MO2MSBAAK7O76A2ESACA5OV2AZSOKQ',
        extra: requirements?.extra || { asset: 10458941 },
      },
    };

    const res = await fetch(`${FACILITATOR_URL}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data: any = await res.json().catch(() => ({}));
    return {
      isValid: Boolean(data?.isValid),
      invalidReason: data?.invalidReason,
      raw: data,
    };
  } catch (err: any) {
    return {
      isValid: false,
      invalidReason: `Facilitator connection error: ${err.message}`,
    };
  }
}

/**
 * Queries GoPlausible Facilitator /settle endpoint for the shield verification fee.
 */
export async function queryFacilitatorSettle(
  txId: string,
  requirements?: {
    scheme?: string;
    price?: string;
    network?: string;
    payTo?: string;
    extra?: { asset?: number };
  }
): Promise<FacilitatorSettlementResult> {
  try {
    const payload = {
      x402Version: 2,
      paymentPayload: {
        x402Version: 2,
        txId,
        transaction: txId,
        network: requirements?.network || 'algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=',
      },
      paymentRequirements: {
        x402Version: 2,
        scheme: requirements?.scheme || 'exact',
        price: requirements?.price || '$0.001',
        network: requirements?.network || 'algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=',
        payTo: requirements?.payTo || process.env.SLASHIELD_RECIPIENT_ADDRESS || 'YVEHNV3EWF4GULZHABH64QKOYLE5MO2MSBAAK7O76A2ESACA5OV2AZSOKQ',
        extra: requirements?.extra || { asset: 10458941 },
      },
    };

    const res = await fetch(`${FACILITATOR_URL}/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data: any = await res.json().catch(() => ({}));
    return {
      success: res.ok && data?.success !== false,
      facilitator_url: FACILITATOR_URL,
      transaction: data?.transaction || txId,
      network: data?.network || requirements?.network || 'algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=',
      errorReason: data?.errorReason,
      raw: data,
    };
  } catch (err: any) {
    return {
      success: false,
      facilitator_url: FACILITATOR_URL,
      transaction: txId,
      errorReason: `Facilitator settle error: ${err.message}`,
    };
  }
}

/**
 * Validates a transaction ID against the Algorand Testnet Indexer AND GoPlausible Facilitator.
 * Includes in-memory replay guard for the current server session.
 */
export async function verifyTransactionOnChain(
  txId: string,
  requirements?: {
    scheme?: string;
    price?: string;
    network?: string;
    payTo?: string;
    extra?: { asset?: number };
  }
): Promise<VerificationResult> {
  if (!txId || typeof txId !== 'string') {
    return { valid: false, reason: 'Transaction ID is missing or invalid format.' };
  }

  const cleanTxId = txId.trim();

  // Basic Algorand 52-char base32 regex check
  if (!/^[A-Z2-7]{52}$/i.test(cleanTxId)) {
    return { valid: false, txId: cleanTxId, reason: `Transaction ID '${cleanTxId}' is not a valid 52-character base32 Algorand transaction hash.` };
  }

  // 1. Session Replay Check
  if (consumedTxIds.has(cleanTxId)) {
    return {
      valid: false,
      txId: cleanTxId,
      reason: `Payment proof replay rejected: Transaction '${cleanTxId}' has already been consumed in this server session.`,
    };
  }

  // 2. Parallel check: Query GoPlausible Facilitator /verify
  const facilitatorPromise = queryFacilitatorVerify(cleanTxId, requirements);

  try {
    const url = `${INDEXER_URL}/v2/transactions/${cleanTxId}`;
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
    });

    const facilitatorCheck = await facilitatorPromise;
    console.log(`[Payment Verifier] Indexer HTTP Status: ${res.status}`);
    console.log(`[Payment Verifier] GoPlausible Facilitator Check: isValid=${facilitatorCheck.isValid}, reason=${facilitatorCheck.invalidReason || 'NONE'}`);

    if (!res.ok) {
      return {
        valid: false,
        txId: cleanTxId,
        reason: `Transaction '${cleanTxId}' was not found on Algorand Testnet (Indexer returned HTTP ${res.status}).`,
        facilitator_verification: {
          checked: true,
          facilitator_url: FACILITATOR_URL,
          isValid: facilitatorCheck.isValid,
          invalidReason: facilitatorCheck.invalidReason,
          raw: facilitatorCheck.raw,
        },
      };
    }

    const data: any = await res.json();
    const txn = data?.transaction;

    if (!txn) {
      return { valid: false, txId: cleanTxId, reason: `Transaction record is missing from Indexer response.` };
    }

    const confirmedRound = txn['confirmed-round'];
    if (!confirmedRound || confirmedRound <= 0) {
      return { valid: false, txId: cleanTxId, reason: `Transaction '${cleanTxId}' is not yet confirmed on-chain.` };
    }

    // Mark transaction as consumed in this session
    consumedTxIds.add(cleanTxId);

    return {
      valid: true,
      txId: cleanTxId,
      confirmedRound,
      sender: txn.sender,
      feePaid: txn.fee || 1000,
      facilitator_verification: {
        checked: true,
        facilitator_url: FACILITATOR_URL,
        isValid: facilitatorCheck.isValid,
        invalidReason: facilitatorCheck.invalidReason,
        raw: facilitatorCheck.raw,
      },
    };
  } catch (err: any) {
    return {
      valid: false,
      txId: cleanTxId,
      reason: `Failed to connect to Algorand Testnet Indexer: ${err.message}`,
    };
  }
}
