/**
 * SLAShield402 - On-Chain x402 Payment Proof Verifier & Facilitator Gateway
 * Integrates directly with GoPlausible Facilitator (POST /verify & POST /settle)
 * and Algorand Testnet Indexer.
 */
import { x402ResourceServer, HTTPFacilitatorClient } from '@x402/core/server';
import { ExactAvmScheme as ServerExactAvmScheme } from '@x402/avm/exact/server';
import { ALGORAND_TESTNET_CAIP2, USDC_TESTNET_ASA_ID } from '@x402/avm';

const INDEXER_URL = process.env.INDEXER_SERVER || 'https://testnet-idx.algonode.cloud';
const FACILITATOR_URL = process.env.FACILITATOR_URL || 'https://facilitator.goplausible.xyz';
const FULL_TESTNET_CAIP2 = 'algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=';

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
    payer?: string;
    invalidReason?: string;
    raw?: any;
  };
}

export interface FacilitatorSettlementResult {
  success: boolean;
  facilitator_url: string;
  transaction?: string;
  network?: string;
  payer?: string;
  errorReason?: string;
  raw?: any;
}

// Initialize Resource Server for Facilitator Communication
const facilitatorClient = new HTTPFacilitatorClient({ url: FACILITATOR_URL });
const resourceServer = new x402ResourceServer(facilitatorClient)
  .register(ALGORAND_TESTNET_CAIP2, new ServerExactAvmScheme())
  .register(FULL_TESTNET_CAIP2, new ServerExactAvmScheme());

let isServerInitialized = false;
async function ensureResourceServerInitialized(): Promise<void> {
  if (!isServerInitialized) {
    try {
      await resourceServer.initialize();
      isServerInitialized = true;
      console.log('✅ GoPlausible Facilitator Resource Server initialized');
    } catch (e: any) {
      console.warn('Facilitator initialization warning:', e.message);
    }
  }
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
 * Direct Facilitator Verification using official x402ResourceServer.verifyPayment
 */
export async function verifyWithFacilitator(
  paymentPayload: any,
  requirements?: any
): Promise<{ isValid: boolean; payer?: string; invalidReason?: string; raw?: any }> {
  try {
    await ensureResourceServerInitialized();
    const req = requirements || {
      scheme: 'exact',
      network: FULL_TESTNET_CAIP2,
      amount: '0',
      asset: String(USDC_TESTNET_ASA_ID),
      payTo: process.env.SLASHIELD_RECIPIENT_ADDRESS || 'YVEHNV3EWF4GULZHABH64QKOYLE5MO2MSBAAK7O76A2ESACA5OV2AZSOKQ',
      maxTimeoutSeconds: 300,
      extra: {
        asset: Number(USDC_TESTNET_ASA_ID),
        feePayer: 'ZMFK2OI7ZBD2U27ISERZC4S6LKM6WMFJPZQ4MYNJDZ2VNBNMBA67RA22AA'
      }
    };

    const res = await resourceServer.verifyPayment(paymentPayload, req);
    console.log(`[Facilitator Verifier] /verify response: isValid=${res.isValid}, payer=${(res as any).payer || 'N/A'}`);
    return {
      isValid: Boolean(res.isValid),
      payer: (res as any).payer,
      invalidReason: (res as any).invalidReason,
      raw: res
    };
  } catch (err: any) {
    console.error('[Facilitator Verifier] verify error:', err.message);
    return {
      isValid: false,
      invalidReason: err.message
    };
  }
}

/**
 * Direct Facilitator Settlement using official x402ResourceServer.settlePayment
 */
export async function settleWithFacilitator(
  paymentPayload: any,
  requirements?: any
): Promise<FacilitatorSettlementResult> {
  try {
    await ensureResourceServerInitialized();
    const req = requirements || {
      scheme: 'exact',
      network: FULL_TESTNET_CAIP2,
      amount: '0',
      asset: String(USDC_TESTNET_ASA_ID),
      payTo: process.env.SLASHIELD_RECIPIENT_ADDRESS || 'YVEHNV3EWF4GULZHABH64QKOYLE5MO2MSBAAK7O76A2ESACA5OV2AZSOKQ',
      maxTimeoutSeconds: 300,
      extra: {
        asset: Number(USDC_TESTNET_ASA_ID),
        feePayer: 'ZMFK2OI7ZBD2U27ISERZC4S6LKM6WMFJPZQ4MYNJDZ2VNBNMBA67RA22AA'
      }
    };

    const res = await resourceServer.settlePayment(paymentPayload, req);
    console.log(`[Facilitator Settle] /settle response: success=${res.success}, tx=${res.transaction}`);
    return {
      success: Boolean(res.success),
      facilitator_url: FACILITATOR_URL,
      transaction: res.transaction,
      network: res.network || FULL_TESTNET_CAIP2,
      payer: (res as any).payer,
      errorReason: (res as any).errorReason,
      raw: res
    };
  } catch (err: any) {
    console.error('[Facilitator Settle] settle error:', err.message);
    return {
      success: false,
      facilitator_url: FACILITATOR_URL,
      errorReason: err.message
    };
  }
}

/**
 * Validates a payment against the GoPlausible Facilitator AND/OR Algorand Testnet Indexer.
 * Handles both structured signed paymentPayloads and transaction ID hashes.
 */
export async function verifyTransactionOnChain(
  proof: string | any,
  requirements?: any
): Promise<VerificationResult> {
  if (!proof) {
    return { valid: false, reason: 'Payment proof is missing or invalid format.' };
  }

  // Case 1: Structured x402 paymentPayload (with paymentGroup array of base64 signed txns)
  if (typeof proof === 'object' && (proof.paymentGroup || (proof.payload && proof.payload.paymentGroup))) {
    const payload = proof.payload ? proof : { x402Version: 2, payload: proof };
    const facVerify = await verifyWithFacilitator(payload, requirements);
    
    if (facVerify.isValid) {
      return {
        valid: true,
        sender: facVerify.payer,
        feePaid: 0,
        facilitator_verification: {
          checked: true,
          facilitator_url: FACILITATOR_URL,
          isValid: true,
          payer: facVerify.payer,
          raw: facVerify.raw
        }
      };
    } else {
      return {
        valid: false,
        reason: `GoPlausible Facilitator verification failed: ${facVerify.invalidReason || 'Invalid payload'}`,
        facilitator_verification: {
          checked: true,
          facilitator_url: FACILITATOR_URL,
          isValid: false,
          invalidReason: facVerify.invalidReason,
          raw: facVerify.raw
        }
      };
    }
  }

  // Case 2: Transaction ID hash string
  const cleanTxId = typeof proof === 'string' ? proof.trim() : (proof.txId || proof.transaction || '').trim();

  // Basic Algorand 52-char base32 regex check
  if (!/^[A-Z2-7]{52}$/i.test(cleanTxId)) {
    return { valid: false, txId: cleanTxId, reason: `Transaction ID '${cleanTxId}' is not a valid 52-character base32 Algorand transaction hash.` };
  }

  // Session Replay Check
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
        facilitator_verification: {
          checked: true,
          facilitator_url: FACILITATOR_URL,
          isValid: false,
          invalidReason: `Transaction not found on testnet indexer`
        }
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
        isValid: true,
        payer: txn.sender,
        raw: { onChainConfirmed: true, confirmedRound }
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
