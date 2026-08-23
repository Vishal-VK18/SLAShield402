import { Hono } from 'hono';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import algosdk from 'algosdk';
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
        amount: '1000',
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
    const requestedAmount = proof?.accepted?.amount || '1000';

    const paymentRequirements = {
      scheme: 'exact',
      network: 'algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=',
      amount: requestedAmount,
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

/**
 * GET /api/wallet/status
 * Returns live Algorand Testnet balances for Primary and Secondary wallets.
 */
const ALGOD_SERVER = process.env.ALGOD_SERVER || 'https://testnet-api.algonode.cloud';
const algodClient = new algosdk.Algodv2('', ALGOD_SERVER, 443);

shieldCheckRoute.get('/api/wallet/status', async (c) => {
  try {
    const primaryAddr = DEFAULT_RECIPIENT;
    const info = await algodClient.accountInformation(primaryAddr).do();
    const algoBalance = Number(info.amount) / 1e6;
    const usdcAsset = info.assets?.find((a: any) => Number(a.assetId ?? a['asset-id']) === Number(USDC_ASA_ID));
    const usdcBalance = usdcAsset ? Number(usdcAsset.amount) / 1e6 : 0;

    let secondaryData = null;
    const secMnemonic = process.env.SECONDARY_TEST_MNEMONIC;
    if (secMnemonic && secMnemonic.trim()) {
      try {
        const secAccount = algosdk.mnemonicToSecretKey(secMnemonic.trim());
        const secAddr = secAccount.addr.toString();
        const secInfo = await algodClient.accountInformation(secAddr).do();
        const secAlgo = Number(secInfo.amount) / 1e6;
        const secUsdcAsset = secInfo.assets?.find((a: any) => Number(a.assetId ?? a['asset-id']) === Number(USDC_ASA_ID));
        const secUsdc = secUsdcAsset ? Number(secUsdcAsset.amount) / 1e6 : 0;
        secondaryData = {
          address: secAddr,
          algoBalance: secAlgo,
          usdcBalance: secUsdc,
          optedIn: !!secUsdcAsset,
        };
      } catch {}
    }

    return c.json({
      primary: {
        address: primaryAddr,
        algoBalance,
        usdcBalance,
        optedIn: !!usdcAsset,
      },
      secondary: secondaryData,
      activeWalletMode: (process.env.PAYMENT_WALLET || 'primary').trim().toLowerCase(),
      network: 'algorand-testnet',
      usdcAssetId: USDC_ASA_ID,
      appId: ESCROW_APP_ID,
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

/**
 * POST /api/demo/run
 * Triggers full live end-to-end demo scenario execution with on-chain settlement/refunds.
 */
shieldCheckRoute.post('/api/demo/run', async (c) => {
  try {
    const body = await c.req.json();
    const scenario = Number(body.scenario || 1);

    if (scenario === 1) {
      // Scenario 1: Normal Success (Settled)
      const paymentId = `REQ-DEMO-PASS-${Date.now()}`;
      eventBus.emit('request_received', {
        payment_id: paymentId,
        target_api: 'https://api.weather-provider-alpha.algo/v1/current?city=Bengaluru',
        offer_price: 0.02,
        agent_budget_left: 1.0,
      });

      // Firewall check
      eventBus.emit('firewall_decision', {
        payment_id: paymentId,
        approved: true,
        reason: 'Budget check passed ($0.02 <= budget $1.00)',
      });

      // SLA evaluation
      eventBus.emit('sla_decision', {
        payment_id: paymentId,
        outcome: 'PASS',
        freshness: { pass: true, measured_sec: 4, max_allowed_sec: 60 },
        format: { pass: true, format: 'JSON_OBJECT' },
        latency: { pass: true, measured_sec: 1.25, max_allowed_sec: 5 },
        reason: 'All SLA parameters within bounds (Freshness: 4s <= 60s, Format: JSON, Latency: 1.25s <= 5s)',
      });

      // Run Python smart contract settlement
      const subprocessResult = runSmartContractSubprocess('settle.py', [
        '--payment_id', paymentId,
        '--amount', '20000',
      ]);

      eventBus.emit('settlement_result', {
        payment_id: paymentId,
        action: 'SETTLE',
        tx_id: subprocessResult.txId,
        explorer_url: subprocessResult.explorerUrl,
        amount: 20000,
        slashed_amount: 0,
        raw_stdout: subprocessResult.stdout,
      });

      return c.json({
        scenario: 1,
        name: 'Normal Success',
        status: 'SETTLED',
        tx_id: subprocessResult.txId,
        explorer_url: subprocessResult.explorerUrl,
        payment_id: paymentId,
        amount: 0.02,
      });
    } else if (scenario === 2) {
      // Scenario 2: Price Spike Block
      const paymentId = `REQ-DEMO-BLOCK-${Date.now()}`;
      eventBus.emit('request_received', {
        payment_id: paymentId,
        target_api: 'https://api.marketdata.algo/v1/quote',
        offer_price: 0.50,
        agent_budget_left: 0.15,
      });

      const blockReason = 'Budget exceeded: Offer price (0.50) is greater than budget left (0.15)';
      eventBus.emit('firewall_decision', {
        payment_id: paymentId,
        approved: false,
        reason: blockReason,
      });

      return c.json({
        scenario: 2,
        name: 'Price Spike Anomaly',
        status: 'BLOCKED',
        reason: blockReason,
        payment_id: paymentId,
        amount: 0.50,
      });
    } else {
      // Scenario 3: Stale Data Violation (Refund & Slash)
      const paymentId = `REQ-DEMO-SLASH-${Date.now()}`;
      eventBus.emit('request_received', {
        payment_id: paymentId,
        target_api: 'https://api.crypto-oracle.algo/v1/ticker',
        offer_price: 0.02,
        agent_budget_left: 1.0,
      });

      eventBus.emit('firewall_decision', {
        payment_id: paymentId,
        approved: true,
        reason: 'Budget check passed ($0.02 <= budget $1.00)',
      });

      const failReason = 'SLA VIOLATED: Response timestamp age (14400s) exceeds maximum allowed freshness (60s)';
      eventBus.emit('sla_decision', {
        payment_id: paymentId,
        outcome: 'FAIL',
        freshness: { pass: false, measured_sec: 14400, max_allowed_sec: 60 },
        format: { pass: true, format: 'JSON_OBJECT' },
        latency: { pass: true, measured_sec: 0.25, max_allowed_sec: 5 },
        reason: failReason,
      });

      // Run Python smart contract refund & penalty
      const subprocessResult = runSmartContractSubprocess('refundAndPenalize.py', [
        '--payment_id', paymentId,
        '--amount', '20000',
        '--reason', failReason,
      ]);

      eventBus.emit('settlement_result', {
        payment_id: paymentId,
        action: 'REFUND_AND_PENALIZE',
        tx_id: subprocessResult.txId,
        explorer_url: subprocessResult.explorerUrl,
        amount: 20000,
        slashed_amount: 1000000,
        raw_stdout: subprocessResult.stdout,
      });

      return c.json({
        scenario: 3,
        name: 'Stale Data Violation',
        status: 'REFUNDED_AND_PENALIZED',
        tx_id: subprocessResult.txId,
        explorer_url: subprocessResult.explorerUrl,
        payment_id: paymentId,
        amount: 0.02,
        slashed_bond: 1.0,
      });
    }
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

/**
 * POST /api/firewall/simulate
 * Interactive sandbox firewall evaluation.
 */
shieldCheckRoute.post('/api/firewall/simulate', async (c) => {
  try {
    const body = await c.req.json();
    const result = runFirewall({
      offerPrice: Number(body.offer_price ?? body.offerPrice ?? 0.02),
      budgetLeft: Number(body.agent_budget_left ?? body.budgetLeft ?? 1.0),
      providerAddress: body.provider_address || body.providerAddress || DEFAULT_RECIPIENT,
    });
    return c.json(result);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});