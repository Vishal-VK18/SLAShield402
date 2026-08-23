import { createSignedPaymentPayload } from './client/signPaymentProof.js';

async function main() {
  const walletSelection = (process.env.PAYMENT_WALLET || 'primary').trim().toLowerCase();
  console.log(`[Payer Config] Active Wallet Mode: ${walletSelection.toUpperCase()} (PAYMENT_WALLET=${process.env.PAYMENT_WALLET || 'primary'})`);
  console.log('======================================================================');
  console.log('▶ STEP 1: Sending request without payment proof to /shield/check...');
  console.log('======================================================================');
  
  const payload = {
    target_api: 'http://localhost:3001/weather',
    offer_price: 0.02,
    agent_budget_left: 1.0,
    provider_address: 'YVEHNV3EWF4GULZHABH64QKOYLE5MO2MSBAAK7O76A2ESACA5OV2AZSOKQ',
    sla_rules: {
      max_freshness_sec: 60,
      format: 'JSON',
      max_latency_sec: 5
    }
  };

  const initialRes = await fetch('http://localhost:3000/shield/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  console.log(`HTTP Status: ${initialRes.status} ${initialRes.statusText}`);
  const challenge402 = await initialRes.json();
  console.log('402 Challenge Received:');
  console.log(JSON.stringify(challenge402, null, 2));

  console.log('\n======================================================================');
  console.log('▶ STEP 2: Client constructing raw signed x402 paymentPayload...');
  console.log('======================================================================');
  const paymentPayload = await createSignedPaymentPayload(challenge402);
  console.log('Signed Payment Payload Generated:');
  console.log(JSON.stringify(paymentPayload, null, 2));

  console.log('\n======================================================================');
  console.log('▶ STEP 3: Retrying request with X-Payment-Proof (GoPlausible /verify & /settle)...');
  console.log('======================================================================');
  const verifiedRes = await fetch('http://localhost:3000/shield/check', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Payment-Proof': JSON.stringify(paymentPayload),
    },
    body: JSON.stringify(payload),
  });

  console.log(`\nHTTP Response Status: ${verifiedRes.status} ${verifiedRes.statusText}`);
  const responseBody = await verifiedRes.json();
  console.log('Full Response Body:');
  console.log(JSON.stringify(responseBody, null, 2));

  console.log('\n======================================================================');
  console.log('▶ STEP 4: Facilitator Integration Assertions');
  console.log('======================================================================');
  console.log('• Facilitator /verify isValid:', responseBody.facilitator_verification?.isValid);
  console.log('• Facilitator /settle success:', responseBody.facilitator_settlement?.success);
  console.log('• Facilitator Settlement Tx ID:', responseBody.facilitator_settlement?.transaction);
  console.log('• Pera Explorer Link:', `https://testnet.explorer.perawallet.app/tx/${responseBody.facilitator_settlement?.transaction}/`);
  console.log('• Lora Explorer Link:', `https://lora.algokit.io/testnet/transaction/${responseBody.facilitator_settlement?.transaction}`);
}

main().catch(console.error);
