import { declareDiscoveryExtension, bazaarResourceServerExtension } from '@x402-avm/extensions';
import { ALGORAND_TESTNET_CAIP2, USDC_TESTNET_ASA_ID } from '@x402/avm';

export const SHIELD_DESCRIPTION =
  'SLAShield402 AI Agent Payment Firewall & Escrow Validator: Pre-flight price & budget guardrails, post-response SLA validation, and smart contract escrow settlement with provider bond slashing on Algorand Testnet.';

export const shieldDiscoveryExtension = declareDiscoveryExtension({
  input: {
    type: 'http',
    method: 'POST',
    bodyType: 'json',
    body: {
      target_api: 'https://api.weather-provider-alpha.algo/v1/current',
      offer_price: 0.02,
      agent_budget_left: 1.0,
      provider_address: 'YVEHNV3EWF4GULZHABH64QKOYLE5MO2MSBAAK7O76A2ESACA5OV2AZSOKQ',
      sla_rules: {
        max_latency_ms: 2000,
        max_age_seconds: 300,
        required_schema: ['temp_c', 'timestamp', 'city']
      }
    }
  },
  output: {
    type: 'json',
    example: {
      firewall_decision: 'ALLOWED',
      sla_decision: 'PASS',
      settlement_status: 'SETTLED',
      settlement_tx_id: 'DHPVIETRFCK22RVHTTIIBCPKCJOWKQJ2PQCZ4BEWI7LHAD3DZURA',
      escrow_app_id: 769236555,
      response_data: {
        temp_c: 28,
        city: 'Bengaluru',
        timestamp: '2026-08-18T12:00:00Z'
      }
    }
  }
});

export const slashieldX402Config = {
  version: 2,
  endpoint: 'POST /shield/check',
  description: SHIELD_DESCRIPTION,
  accepts: [
    {
      scheme: 'exact',
      price: '$0.001',
      priceMicroUsdc: 1000,
      network: ALGORAND_TESTNET_CAIP2,
      networkHuman: 'algorand-testnet',
      asset: USDC_TESTNET_ASA_ID,
      payTo: process.env.SLASHIELD_RECIPIENT_ADDRESS || 'YVEHNV3EWF4GULZHABH64QKOYLE5MO2MSBAAK7O76A2ESACA5OV2AZSOKQ',
      appId: Number(process.env.SLASHIELD_ESCROW_APP_ID || 769236555),
      facilitator: process.env.FACILITATOR_URL || 'https://facilitator.goplausible.xyz'
    }
  ],
  discovery: shieldDiscoveryExtension
};
