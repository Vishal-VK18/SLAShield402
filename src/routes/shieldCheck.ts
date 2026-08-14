import { Hono } from 'hono';
import { runFirewall } from '../firewall/runFirewall.js';
import { payTargetApi } from '../client/payTargetApi.js';

export const shieldCheckRoute = new Hono();

shieldCheckRoute.post('/shield/check', async (c) => {
  try {
    const body = await c.req.json();
    const { target_api, provider_address, offer_price, agent_budget_left, sla_rules } = body;

    if (!target_api || offer_price === undefined || agent_budget_left === undefined) {
      return c.json({ error: 'Missing required parameters' }, 400);
    }

    // 1. Run Firewall Checks
    const firewallResult = runFirewall({
      offerPrice: Number(offer_price),
      budgetLeft: Number(agent_budget_left),
      providerAddress: provider_address || 'unknown_provider',
    });

    if (!firewallResult.approved) {
      return c.json({
        status: 'BLOCKED',
        decision: firewallResult,
      }, 400);
    }

    // 2. Execute Outgoing x402 Payment to Target API
    const targetResponse = await payTargetApi(target_api);

    // 3. Return payload + target response (Ready for Person 2's SLA Validator)
    return c.json({
      status: 'EXECUTED',
      decision: firewallResult,
      target_response: targetResponse,
      sla_rules,
    });

  } catch (err) {
    return c.json({ error: 'Invalid JSON payload' }, 400);
  }
});