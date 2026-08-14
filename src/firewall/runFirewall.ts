import { budgetCheck } from './budgetCheck.js';
import { priceCheck } from './priceCheck.js';
import { providerCheck } from './providerCheck.js';

export interface FirewallInput {
  offerPrice: number;
  budgetLeft: number;
  providerAddress: string;
}

export interface FirewallResult {
  approved: boolean;
  checks: {
    budget: boolean;
    price: boolean;
    provider: boolean;
  };
  reason?: string;
}

export function runFirewall(input: FirewallInput): FirewallResult {
  const budget = budgetCheck(input.offerPrice, input.budgetLeft);
  if (!budget.pass) {
    return { approved: false, checks: { budget: false, price: true, provider: true }, reason: budget.reason };
  }

  const price = priceCheck(input.offerPrice);
  if (!price.pass) {
    return { approved: false, checks: { budget: true, price: false, provider: true }, reason: price.reason };
  }

  const provider = providerCheck(input.providerAddress);
  if (!provider.pass) {
    return { approved: false, checks: { budget: true, price: true, provider: false }, reason: provider.reason };
  }

  return {
    approved: true,
    checks: { budget: true, price: true, provider: true },
  };
}