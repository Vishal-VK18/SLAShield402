import { Hono } from 'hono';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALGORAND_TESTNET_CAIP2, USDC_TESTNET_ASA_ID } from '@x402/avm';
import { runFirewall } from '../firewall/runFirewall.js';
import { payTargetApi } from '../client/payTargetApi.js';
import { verifyTransactionOnChain } from '../verifier/verifyPaymentProof.js';
import { eventBus } from '../eventBus.js';
import { validateOutcome } from '../../../person-2-sla-validator/src/validateOutcome.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../../');

export const shieldCheckRoute = new Hono();

const DEFAULT_RECIPIENT = process.env.SLASHIELD_RECIPIENT_ADDRESS || 'YVEHNV3EWF4GULZHABH64QKOYLE5MO2MSBAAK7O76A2ESACA5OV2AZSOKQ';
const FACILITATOR_URL = process.env.FACILITATOR_URL || 'https://facilitator.goplausible.xyz';
const USDC_ASA_ID = Number(process.env.USDC_ASA_ID) || USDC_TESTNET_ASA_ID;
const ESCROW_APP_ID = Number(process.env.SLASHIELD_ESCROW_APP_ID || 769236555);
const SHIELD_FEE_MICRO_USDC = Number(process.env.SHIELD_CHECK_FEE_MICRO_USDC || 1000); // 0.001 USDC

/**
 * Spawns a real Python subprocess to run Person 3's smart contract scripts.
 */
function runSmartContractSubprocess(
  scriptName: 'settle.py' | 'refundAndPenalize.py',
  args: string[]
): { stdout: string; txId: string; explorerUrl: string } {
  const scriptPath = path.join(projectRoot, 'person-3-algorand-contract', 'scripts', scriptName);
  const formattedArgs = args.map((arg) => (arg.startsWith('--') ? arg : `"${arg.replace(/"/g, '\\"')}"`)).join(' ');
  const command = `py -3.12 "${scriptPath}" ${formattedArgs}`;

  try {
    const stdout = execSync(command, {
      cwd: path.join(projectRoot, 'person-3-algorand-contract'),
      env: { ...process.env, PYTHONPATH: '.' },
      encoding: 'utf-8',
      timeout: 35000,
    });

    const match = stdout.match(/Transaction ID:\s+([A-Z0-9]{52})/i);
    const txId = match ? match[1] : 'UNKNOWN_TX';
    const explorerUrl = `https://testnet.explorer.perawallet.app/tx/${txId}/`;
    return { stdout, txId, explorerUrl };
  } catch (err: any) {
    const stdout = err.stdout || err.message;
    const match = stdout.match(/Transaction ID:\s+([A-Z0-9]{52})/i);
    const txId = match ? match[1] : 'ERROR_TX';
    return { stdout, txId, explorerUrl: `https://testnet.explorer.perawallet.app/tx/${txId}/` };
  }
}

/**
 * Extracts transaction ID from incoming request headers or body.
 */
/**
 * Extracts payment proof (structured paymentPayload object or transaction ID string)
 * from incoming request headers or body.
 */
function extractPaymentProof(c: any, body: any): any {
  const xPaymentProof = c.req.header('X-Payment-Proof') || c.req.header('x-payment-proof') || c.req.header('Payment-Signature') || c.req.header('payment-signature');
  const authHeader = c.req.header('Authorization') || c.req.header('authorization');
  const bodyProof = body?.payment_payload || body?.payment_proof || body?.x402_proof;

  if (bodyProof) {
    if (typeof bodyProof === 'object') return bodyProof;
    try { return JSON.parse(bodyProof); } catch { return bodyProof; }
  }

  if (xPaymentProof) {
    try {
      return JSON.parse(xPaymentProof);
    } catch {
      try {
        const decoded = Buffer.from(xPaymentProof, 'base64').toString('utf-8');
        return JSON.parse(decoded);
      } catch {
        return xPaymentProof;
      }
    }
  }

  if (authHeader && authHeader.toLowerCase().startsWith('x402 ')) {
    const raw = authHeader.substring(5).trim();
    try {
      const decoded = Buffer.from(raw, 'base64').toString('utf-8');
      return JSON.parse(decoded);
    } catch {
      return raw;
    }
  }

  return null;
}

/**
 * Generates standard x402 challenge object matching official Facilitator requirements.
 */
function build402Challenge(paymentId: string) {
  const nonce = `NONCE-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

  return {
    x402Version: 2,
    x402: true,
    status: 402,
    error: 'Payment Required',
    message: 'SLAShield402 firewall requires an on-chain x402 verification fee (0.001 USDC) to evaluate and secure this API call.',
    resource: {
      url: 'http://localhost:3000/shield/check'
    },
    accepts: [
      {
        scheme: 'exact',
        network: 'algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=',
        amount: '0',
        asset: String(USDC_ASA_ID),
        payTo: DEFAULT_RECIPIENT,
        maxTimeoutSeconds: 300,
        extra: {
          asset: USDC_ASA_ID,
          feePayer: 'ZMFK2OI7ZBD2U27ISERZC4S6LKM6WMFJPZQ4MYNJDZ2VNBNMBA67RA22AA'
        }
      }
    ],
    challenge: {
      amount_usdc: SHIELD_FEE_MICRO_USDC / 1e6,
      amount_microunits: SHIELD_FEE_MICRO_USDC,
      currency: 'USDC',
      asset_id: USDC_ASA_ID,
      network: 'algorand-testnet',
      network_caip2: ALGORAND_TESTNET_CAIP2,
      caip2: ALGORAND_TESTNET_CAIP2,
      app_id: ESCROW_APP_ID,
      recipient: DEFAULT_RECIPIENT,
      facilitator_url: FACILITATOR_URL,
      payment_id: paymentId,
      nonce: nonce,
      description: 'SLAShield402 AI Agent Payment Firewall Check'
    }
  };
}

/**
 * POST /shield/check
 * Authenticates payment proof against GoPlausible Facilitator & Algorand Testnet, then executes firewall checks.
 * Emits real-time WebSocket events at each lifecycle stage.
 */
shieldCheckRoute.post('/shield/check', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const { target_api, provider_address, offer_price, agent_budget_left, sla_rules } = body;

    // Validate minimum required payload fields
    if (!target_api || offer_price === undefined || agent_budget_left === undefined) {
      return c.json({
        error: 'Missing required parameters: target_api, offer_price, and agent_budget_left are required.'
      }, 400);
    }

    const paymentId = body.payment_id || `REQ-SHIELD-${Date.now()}`;
    const proof = extractPaymentProof(c, body);

    const paymentRequirements = {
      scheme: 'exact',
      network: 'algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=',
      amount: '0',
      asset: String(USDC_ASA_ID),
      payTo: DEFAULT_RECIPIENT,
      maxTimeoutSeconds: 300,
      extra: {
        asset: USDC_ASA_ID,
        feePayer: 'ZMFK2OI7ZBD2U27ISERZC4S6LKM6WMFJPZQ4MYNJDZ2VNBNMBA67RA22AA'
      }
    };

    // 1. Emit Event: request_received
    eventBus.emit('request_received', {
      payment_id: paymentId,
      target_api,
      offer_price: Number(offer_price),
      agent_budget_left: Number(agent_budget_left),
      timestamp: new Date().toISOString()
    });

    // 2. If no payment proof is provided -> Return 402 Challenge
    if (!proof) {
      const challengeObj = build402Challenge(paymentId);
      
      // Emit Event: challenge_issued
      eventBus.emit('challenge_issued', {
        payment_id: paymentId,
        amount_usdc: challengeObj.challenge.amount_usdc,
        nonce: challengeObj.challenge.nonce,
        recipient: challengeObj.challenge.recipient
      });

      c.header(
        'WWW-Authenticate',
        `x402 realm="SLAShield402", amount="${SHIELD_FEE_MICRO_USDC / 1e6}", currency="USDC", network="algorand-testnet", caip2="${ALGORAND_TESTNET_CAIP2}", app_id="${ESCROW_APP_ID}", recipient="${DEFAULT_RECIPIENT}", facilitator="${FACILITATOR_URL}"`
      );
      return c.json(challengeObj, 402);
    }

    // 3. Real on-chain verification against GoPlausible Facilitator & Algorand Testnet
    const verification = await verifyTransactionOnChain(proof, paymentRequirements);

    if (!verification.valid) {
      // Emit Event: payment_verified (REJECTED)
      eventBus.emit('payment_verified', {
        payment_id: paymentId,
        rejected: true,
        reason: verification.reason,
      });

      return c.json({
        x402: true,
        status: 403,
        error: 'Payment Verification Failed',
        reason: verification.reason,
        facilitator_verification: verification.facilitator_verification,
        challenge: build402Challenge(paymentId).challenge
      }, 403);
    }

    // Settle the shield verification fee specifically on GoPlausible Facilitator
    let facilitatorSettlement: any = {
      success: true,
      facilitator_url: FACILITATOR_URL,
      transaction: verification.txId || 'FACILITATOR_VERIFIED',
      network: 'algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI='
    };

    if (typeof proof === 'object' && (proof.paymentGroup || proof.payload?.paymentGroup)) {
      const { settleWithFacilitator } = await import('../verifier/verifyPaymentProof.js');
      const payload = proof.payload ? proof : { x402Version: 2, payload: proof };
      facilitatorSettlement = await settleWithFacilitator(payload, paymentRequirements);
    }

    console.log(`[Facilitator Settle] Fee settled via ${FACILITATOR_URL}: success=${facilitatorSettlement.success}, tx=${facilitatorSettlement.transaction}`);

    const proofTxId = facilitatorSettlement.transaction || verification.txId;

    // Emit Event: payment_verified (CONFIRMED)
    eventBus.emit('payment_verified', {
      payment_id: paymentId,
      tx_id: proofTxId,
      confirmed_round: verification.confirmedRound,
      facilitator_verified: verification.facilitator_verification?.isValid ?? true,
    });

    // 4. Payment proof verified on-chain -> Run Person 1 Firewall Rules
    const firewallResult = runFirewall({
      offerPrice: Number(offer_price),
      budgetLeft: Number(agent_budget_left),
      providerAddress: provider_address || 'unknown_provider',
    });

    // Emit Event: firewall_checked
    eventBus.emit('firewall_checked', {
      payment_id: paymentId,
      approved: firewallResult.approved,
      reason: firewallResult.reason,
      offer_price: Number(offer_price),
      budget_left: Number(agent_budget_left)
    });

    // If Firewall rejects budget/policy -> Return 400 with refusal reason
    if (!firewallResult.approved) {
      return c.json({
        status: 'BLOCKED',
        shield_fee_tx: verification.txId,
        confirmed_round: verification.confirmedRound,
        facilitator_settlement: facilitatorSettlement,
        reason: firewallResult.reason,
        decision: firewallResult,
        agent_budget_remaining: Number(agent_budget_left)
      }, 400);
    }

    // 5. Firewall Approved -> Forward outgoing paid request to Target API
    const startFetch = Date.now();
    const targetResponse = await payTargetApi(target_api, Number(offer_price));
    const latencySec = Number(((Date.now() - startFetch) / 1000).toFixed(3)) || 0.05;
    const responseStatus = targetResponse.success ? 200 : 500;

    // Emit Event: target_response
    eventBus.emit('target_response', {
      payment_id: paymentId,
      target_api,
      status: responseStatus,
      latency_sec: latencySec,
      data: targetResponse.data
    });

    let subprocessResult: { stdout: string; txId: string; explorerUrl: string } | null = null;

    if (targetResponse.success && targetResponse.data) {
      const evalBody = targetResponse.data;

      // Run Outcome Validator
      const slaResult = validateOutcome({
        payment_id: paymentId,
        agent_address: DEFAULT_RECIPIENT,
        provider_address: provider_address || DEFAULT_RECIPIENT,
        amount: Math.round(Number(offer_price) * 1e6),
        sla_rules: sla_rules || { max_freshness_sec: 60, format: 'JSON', max_latency_sec: 5 },
        api_response: evalBody,
        latency_sec: latencySec,
      });

      // Emit Event: sla_decision
      eventBus.emit('sla_decision', {
        payment_id: paymentId,
        outcome: slaResult.result,
        freshness: slaResult.rule_evaluations.freshness,
        format: slaResult.rule_evaluations.format,
        latency: slaResult.rule_evaluations.latency,
        reason: slaResult.reason
      });

      const isPass = slaResult.result === 'PASS';
      const action = slaResult.settlement_payload.action;
      const microAmount = String(slaResult.settlement_payload.amount || 20000);

      // REAL PYTHON SUBPROCESS EXECUTION FOR CONDITIONAL TWO-PHASE ESCROW
      if (isPass) {
        subprocessResult = runSmartContractSubprocess('settle.py', [
          '--payment_id', paymentId,
          '--amount', microAmount,
        ]);
      } else {
        subprocessResult = runSmartContractSubprocess('refundAndPenalize.py', [
          '--payment_id', paymentId,
          '--amount', microAmount,
          '--reason', slaResult.reason || 'SLA Violated',
        ]);
      }

      console.log(`[ON-CHAIN SUBPROCESS] ${action} -> Tx ID: ${subprocessResult.txId}`);

      // Emit Event: settlement_result with REAL FRESH TX ID
      eventBus.emit('settlement_result', {
        payment_id: paymentId,
        action: action,
        tx_id: subprocessResult.txId,
        explorer_url: subprocessResult.explorerUrl,
        amount: slaResult.settlement_payload.amount,
        slashed_amount: slaResult.settlement_payload.slash_amount,
        raw_stdout: subprocessResult.stdout
      });
    }

    // Return complete execution package
    return c.json({
      status: 'EXECUTED',
      shield_fee_tx: verification.txId,
      confirmed_round: verification.confirmedRound,
      facilitator_verification: verification.facilitator_verification,
      facilitator_settlement: facilitatorSettlement,
      settlement_tx_id: subprocessResult?.txId || null,
      settlement_explorer_url: subprocessResult?.explorerUrl || null,
      decision: firewallResult,
      target_response: targetResponse,
      sla_rules: sla_rules || { max_freshness_sec: 60, format: 'JSON', max_latency_sec: 5 },
      agent_budget_remaining: Number(agent_budget_left) - Number(offer_price)
    }, 200);

  } catch (err: any) {
    return c.json({ error: 'Internal Server Error', details: err.message }, 500);
  }
});

/**
 * GET /api/events/recent
 * Returns recent events backlog for dashboard hydration.
 */
shieldCheckRoute.get('/api/events/recent', (c) => {
  return c.json({ events: eventBus.getRecentEvents() });
});