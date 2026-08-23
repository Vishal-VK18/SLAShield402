import { signAndBroadcastPayment } from './client/signPaymentProof.js';

async function main() {
  console.log('--- STEP 1: Signing 0.001 USDC Payment Proof on Algorand Testnet ---');
  const paymentProof = await signAndBroadcastPayment(
    'YVEHNV3EWF4GULZHABH64QKOYLE5MO2MSBAAK7O76A2ESACA5OV2AZSOKQ',
    0
  );
  console.log('Payment Proof:', JSON.stringify(paymentProof, null, 2));

  console.log('\n--- STEP 2: Submitting Request with X-Payment-Proof to /shield/check ---');
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

  const res = await fetch('http://localhost:3000/shield/check', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Payment-Proof': paymentProof.txId,
    },
    body: JSON.stringify(payload),
  });

  console.log(`\nHTTP Response Status: ${res.status} ${res.statusText}`);
  const json = await res.json();
  console.log('Full Response Body:');
  console.log(JSON.stringify(json, null, 2));
}

main().catch(console.error);
