import React, { useState } from 'react';
import { FirewallSimulationResult } from '../types.js';

interface ProtectionTabProps {
  serverUrl: string;
}

export const ProtectionTab: React.FC<ProtectionTabProps> = ({ serverUrl }) => {
  const [offerPrice, setOfferPrice] = useState('0.02');
  const [budgetLeft, setBudgetLeft] = useState('1.00');
  const [targetApi, setTargetApi] = useState('https://api.weather-provider-alpha.algo/v1/current?city=Bengaluru');
  const [evaluating, setEvaluating] = useState(false);
  const [result, setResult] = useState<FirewallSimulationResult | null>(null);

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    setEvaluating(true);
    try {
      const res = await fetch(`${serverUrl}/api/firewall/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offer_price: parseFloat(offerPrice),
          agent_budget_left: parseFloat(budgetLeft),
          target_api: targetApi,
        }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await res.text();
        throw new Error(`Server returned non-JSON (${res.status}): ${text.slice(0, 200)}`);
      }
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || data?.message || `Request failed with status ${res.status}`);
      }
      setResult(data);
    } catch (err: any) {
      setResult({
        approved: false,
        checks: { budget: false, price: false, provider: false },
        reason: `Evaluation error: ${err.message}`,
      });
    } finally {
      setEvaluating(false);
    }
  };

  const loadPreset = (price: string, budget: string, api: string) => {
    setOfferPrice(price);
    setBudgetLeft(budget);
    setTargetApi(api);
    setResult(null);
  };

  return (
    <div className="flex-1 flex flex-col gap-6">
      {/* Header */}
      <div className="bg-app-surface border border-border-light rounded-card p-6 shadow-premium">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-[22px] font-bold text-charcoal">Pre-Flight Spend Policy Firewall</h2>
            <p className="text-[13px] text-text-muted mt-0.5">
              Intercepts anomalous pricing, budget depletion, and malicious paywalls before funds leave the wallet.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-primary bg-primary-container/20 px-3 py-1 rounded-full border border-primary-container/40">
              0 Algorand Gas on Interception
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Interactive Simulation Sandbox (Span 7) */}
        <div className="lg:col-span-7 bg-app-surface border border-border-light rounded-card p-6 shadow-premium flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[16px] font-bold text-charcoal">Interactive Policy Evaluator</h3>
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="text-text-muted">Presets:</span>
                <button
                  type="button"
                  onClick={() => loadPreset('0.02', '1.00', 'https://api.weather-provider-alpha.algo/v1/current')}
                  className="px-2 py-0.5 rounded-full bg-secondary-surface hover:bg-border-light/50 text-charcoal font-semibold border border-border-light text-[11px]"
                >
                  Normal ($0.02)
                </button>
                <button
                  type="button"
                  onClick={() => loadPreset('0.50', '0.15', 'https://api.marketdata.algo/v1/quote')}
                  className="px-2 py-0.5 rounded-full bg-error-container/40 hover:bg-error-container text-error font-semibold border border-error/20 text-[11px]"
                >
                  Price Surge ($0.50)
                </button>
              </div>
            </div>

            <form onSubmit={handleEvaluate} className="flex flex-col gap-4">
              {/* Target API */}
              <div>
                <label className="block text-[12px] font-semibold text-charcoal mb-1">
                  Target API Resource URL
                </label>
                <input
                  type="text"
                  value={targetApi}
                  onChange={(e) => setTargetApi(e.target.value)}
                  className="w-full px-3.5 py-2 bg-secondary-surface border border-border-light rounded-xl text-[13px] font-mono focus:outline-none focus:border-charcoal transition-colors"
                />
              </div>

              {/* Grid 2 cols for Price and Budget */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-semibold text-charcoal mb-1">
                    API Offer Price ($ USDC)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(e.target.value)}
                    className="w-full px-3.5 py-2 bg-secondary-surface border border-border-light rounded-xl text-[13px] font-mono font-bold focus:outline-none focus:border-charcoal transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-charcoal mb-1">
                    Agent Budget Remaining ($ USDC)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={budgetLeft}
                    onChange={(e) => setBudgetLeft(e.target.value)}
                    className="w-full px-3.5 py-2 bg-secondary-surface border border-border-light rounded-xl text-[13px] font-mono font-bold focus:outline-none focus:border-charcoal transition-colors"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={evaluating}
                className="w-full mt-2 bg-lime-accent hover:bg-lime-accent/80 text-charcoal font-bold text-[13px] py-3 rounded-full flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {evaluating ? 'hourglass_top' : 'gavel'}
                </span>
                <span>{evaluating ? 'Evaluating Firewall...' : 'Evaluate Spend Policy'}</span>
              </button>
            </form>
          </div>

          {/* Results Box */}
          {result && (
            <div className={`mt-5 p-4 rounded-xl border transition-all ${
              result.approved 
                ? 'bg-[#E8F5E9]/60 border-[#C8E6C9]' 
                : 'bg-[#FFEBEE]/60 border-[#FFCDD2]'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-bold text-charcoal flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${result.approved ? 'bg-[#2E7D32]' : 'bg-error'}`}></span>
                  Decision: {result.approved ? 'POLICY APPROVED' : 'INTERCEPTED & BLOCKED'}
                </span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  result.approved ? 'bg-[#2E7D32] text-white' : 'bg-error text-white'
                }`}>
                  {result.approved ? 'FORWARDED' : 'ABORTED'}
                </span>
              </div>

              <p className="text-[12px] text-text-muted mb-3 font-mono">
                {result.reason || 'All pre-flight policy checks satisfied. Request authorized for execution.'}
              </p>

              {/* Checks Breakdown */}
              <div className="grid grid-cols-3 gap-2 text-[11px] pt-2 border-t border-border-light/60">
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-primary">
                    {result.checks.budget ? 'check_circle' : 'cancel'}
                  </span>
                  <span className="font-medium text-charcoal">Budget Constraint</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-primary">
                    {result.checks.price ? 'check_circle' : 'cancel'}
                  </span>
                  <span className="font-medium text-charcoal">Price Anomaly</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-primary">
                    {result.checks.provider ? 'check_circle' : 'cancel'}
                  </span>
                  <span className="font-medium text-charcoal">Valid Provider</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Firewall Guardrails & Rules Info (Span 5) */}
        <div className="lg:col-span-5 bg-app-surface border border-border-light rounded-card p-6 shadow-premium flex flex-col gap-4">
          <h3 className="text-[16px] font-bold text-charcoal">Active Spend Guardrails</h3>

          <div className="flex flex-col gap-3 text-[12px]">
            <div className="p-3 bg-secondary-surface rounded-xl border border-border-light">
              <div className="font-bold text-charcoal flex items-center gap-1.5 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-lime-accent"></span> 1. Strict Budget Enforcement
              </div>
              <p className="text-text-muted leading-relaxed">
                Rejects any payment request where <code className="font-mono text-charcoal">offer_price &gt; agent_budget_left</code>. Zero transactions are submitted to Algorand.
              </p>
            </div>

            <div className="p-3 bg-secondary-surface rounded-xl border border-border-light">
              <div className="font-bold text-charcoal flex items-center gap-1.5 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-lime-accent"></span> 2. Price Surge Anomaly Detection
              </div>
              <p className="text-text-muted leading-relaxed">
                Flags abnormal price jumps across repetitive micro-tasks, preventing runaway AI loop billing spikes.
              </p>
            </div>

            <div className="p-3 bg-secondary-surface rounded-xl border border-border-light">
              <div className="font-bold text-charcoal flex items-center gap-1.5 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-lime-accent"></span> 3. Replay Proof Invalidation
              </div>
              <p className="text-text-muted leading-relaxed">
                Maintains a cryptographically checked cache of spent transaction IDs to prevent replay attack exploits.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
