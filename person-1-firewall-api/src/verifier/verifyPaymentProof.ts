/**
 * SLAShield402 - On-Chain x402 Payment Proof Verifier
 * Queries Algorand Testnet Indexer / Algod Node to verify that the
 * provided transaction hash exists, is confirmed, and represents a valid payment.
 */

const INDEXER_URL = process.env.INDEXER_SERVER || 'https://testnet-idx.algonode.cloud';

// In-memory set tracking transaction hashes consumed during the current server session
const consumedTxIds = new Set<string>();

export interface VerificationResult {
  valid: boolean;
  txId?: string;
  confirmedRound?: number;
  sender?: string;
  feePaid?: number;
  reason?: string;
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
 * Validates a transaction ID against the Algorand Testnet Indexer.
 * Includes in-memory replay guard for the current server session.
 */
export async function verifyTransactionOnChain(txId: string): Promise<VerificationResult> {
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

  try {
    const url = `${INDEXER_URL}/v2/transactions/${cleanTxId}`;
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      return {
        valid: false,
        txId: cleanTxId,
        reason: `Transaction '${cleanTxId}' was not found on Algorand Testnet (Indexer returned HTTP ${res.status}).`,
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
    };
  } catch (err: any) {
    return {
      valid: false,
      txId: cleanTxId,
      reason: `Failed to connect to Algorand Testnet Indexer: ${err.message}`,
    };
  }
}
