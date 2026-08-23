import React, { useState } from 'react';
import { DemoExecutionResult } from '../types.js';

interface DemoRunnerTabProps {
  serverUrl: string;
  onSelectTx?: (txId: string) => void;
}

export const DemoRunnerTab: React.FC<DemoRunnerTabProps> = ({ serverUrl }) => {
  const [runningScenario, setRunningScenario] = useState<number | null>(null);
  const [results, setResults] = useState<{ [scenario: number]: DemoExecutionResult }>({});

  const runScenario = async (scenarioNumber: number) => {
    setRunningScenario(scenarioNumber);
    try {
      const res = await fetch(`${serverUrl}/api/demo/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: scenarioNumber }),
      });
      const data = await res.json();
      setResults((prev) => ({ ...prev, [scenarioNumber]: data }));
    } catch (err: any) {
      setResults((prev) => ({
        ...prev,
        [scenarioNumber]: {
          scenario: scenarioNumber,
          name: `Scenario ${scenarioNumber}`,
          status: 'ERROR',
          error: err.message,
        },
      }));
    } finally {
      setRunningScenario(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-6">
      {/* Header */}
      <div className="bg-app-surface border border-border-light rounded-card p-6 shadow-premium">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-[22px] font-bold text-charcoal">Interactive Hackathon Demo Scenarios</h2>
            <p className="text-[13px] text-text-muted mt-0.5">
              Execute live wire end-to-end tests spanning x402 402 challenge, firewalling, SLA verification, and Algorand Testnet smart contract subprocesses.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-charcoal bg-lime-accent px-3 py-1 rounded-full shadow-xs">
              Live Wire Execution
            </span>
          </div>
        </div>
      </div>

      {/* 3 Scenario Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Scenario 1 */}
        <div className="bg-app-surface border border-border-light rounded-card p-5 shadow-premium flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-2">
              <span className="text-[14px] font-bold text-charcoal flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-primary">check_circle</span>
                <span>Scenario 1: Normal Success</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-[#E8F5E9] text-[#2E7D32] rounded-full border border-[#C8E6C9]">
                SLA Pass &rarr; Settle
              </span>
            </div>
            <p className="text-[12px] text-text-muted mt-1 leading-relaxed">
              Agent sends $0.02 quote. Firewall approves within budget. Fresh weather data satisfies all SLA parameters. Smart contract conditionally settles funds to provider.
            </p>

            <div className="mt-4 p-3 bg-secondary-surface rounded-xl border border-border-light text-[11px] font-mono space-y-1">
              <div className="text-charcoal font-semibold">• Target: Weather API ($0.02)</div>
              <div className="text-text-muted">• Freshness: 4s &le; 60s max</div>
              <div className="text-text-muted">• Result: SETTLED on Algorand</div>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <button
              onClick={() => runScenario(1)}
              disabled={runningScenario !== null}
              className="w-full bg-lime-accent hover:bg-lime-accent/80 text-charcoal font-bold text-[13px] py-2.5 rounded-full flex items-center justify-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">
                {runningScenario === 1 ? 'hourglass_top' : 'play_arrow'}
              </span>
              <span>{runningScenario === 1 ? 'Executing Settle Subprocess...' : 'Run Scenario 1'}</span>
            </button>

            {results[1] && (
              <div className="p-3 bg-[#E8F5E9]/50 border border-[#C8E6C9] rounded-xl text-[11px] flex flex-col gap-1">
                <div className="font-bold text-[#2E7D32] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">done_all</span>
                  <span>SETTLED (Tx Confirmed)</span>
                </div>
                {results[1].tx_id && (
                  <div className="font-mono text-[10px] text-charcoal truncate">
                    Tx: {results[1].tx_id}
                  </div>
                )}
                {results[1].tx_id && (
                  <a
                    href={`https://lora.algokit.io/testnet/transaction/${results[1].tx_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline font-semibold flex items-center gap-0.5 mt-0.5"
                  >
                    <span>View on Lora Explorer</span>
                    <span className="material-symbols-outlined text-[11px]">open_in_new</span>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Scenario 2 */}
        <div className="bg-app-surface border border-border-light rounded-card p-5 shadow-premium flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-2">
              <span className="text-[14px] font-bold text-charcoal flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-error">shield_lock</span>
                <span>Scenario 2: Price Surge</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-[#FFEBEE] text-error rounded-full border border-[#FFCDD2]">
                Firewall Blocked
              </span>
            </div>
            <p className="text-[12px] text-text-muted mt-1 leading-relaxed">
              API provider attempts sudden $0.50 price surge against agent's $0.15 budget. Intercepted and blocked before contract lock.
            </p>

            <div className="mt-4 p-3 bg-secondary-surface rounded-xl border border-border-light text-[11px] font-mono space-y-1">
              <div className="text-charcoal font-semibold">• Target: Market API ($0.50)</div>
              <div className="text-text-muted">• Budget Left: $0.15</div>
              <div className="text-error font-semibold">• Result: BLOCKED (0 Gas Spent)</div>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <button
              onClick={() => runScenario(2)}
              disabled={runningScenario !== null}
              className="w-full bg-secondary-surface hover:bg-border-light/50 border border-border-light text-charcoal font-bold text-[13px] py-2.5 rounded-full flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">
                {runningScenario === 2 ? 'hourglass_top' : 'block'}
              </span>
              <span>{runningScenario === 2 ? 'Evaluating Firewall...' : 'Run Scenario 2'}</span>
            </button>

            {results[2] && (
              <div className="p-3 bg-[#FFEBEE]/50 border border-[#FFCDD2] rounded-xl text-[11px] flex flex-col gap-1">
                <div className="font-bold text-error flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">shield</span>
                  <span>BLOCKED (Budget Protected)</span>
                </div>
                <div className="text-[10px] text-text-muted">
                  {results[2].reason || 'Budget exceeded: Offer price ($0.50) is greater than budget ($0.15)'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Scenario 3 */}
        <div className="bg-app-surface border border-border-light rounded-card p-5 shadow-premium flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-2">
              <span className="text-[14px] font-bold text-charcoal flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-[#F57C00]">warning</span>
                <span>Scenario 3: Stale Data</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-[#FFF3E0] text-[#E65100] rounded-full border border-[#FFE0B2]">
                Refund &amp; Slash
              </span>
            </div>
            <p className="text-[12px] text-text-muted mt-1 leading-relaxed">
              Provider returns 4-hour stale cache data. SLA Validator detects violation. Escrow smart contract refunds agent and slashes 10% provider bond.
            </p>

            <div className="mt-4 p-3 bg-secondary-surface rounded-xl border border-border-light text-[11px] font-mono space-y-1">
              <div className="text-charcoal font-semibold">• Target: Oracle API (Stale)</div>
              <div className="text-error">• Age: 14400s &gt; 60s max</div>
              <div className="text-[#E65100] font-semibold">• Result: REFUNDED + BOND SLASHED</div>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <button
              onClick={() => runScenario(3)}
              disabled={runningScenario !== null}
              className="w-full bg-[#1B1F19] hover:bg-black text-lime-accent font-bold text-[13px] py-2.5 rounded-full flex items-center justify-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">
                {runningScenario === 3 ? 'hourglass_top' : 'gavel'}
              </span>
              <span>{runningScenario === 3 ? 'Executing Refund & Slash...' : 'Run Scenario 3'}</span>
            </button>

            {results[3] && (
              <div className="p-3 bg-[#FFF3E0]/50 border border-[#FFE0B2] rounded-xl text-[11px] flex flex-col gap-1">
                <div className="font-bold text-[#E65100] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">balance</span>
                  <span>REFUNDED &amp; PENALIZED</span>
                </div>
                {results[3].tx_id && (
                  <div className="font-mono text-[10px] text-charcoal truncate">
                    Tx: {results[3].tx_id}
                  </div>
                )}
                {results[3].tx_id && (
                  <a
                    href={`https://lora.algokit.io/testnet/transaction/${results[3].tx_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline font-semibold flex items-center gap-0.5 mt-0.5"
                  >
                    <span>View on Lora Explorer</span>
                    <span className="material-symbols-outlined text-[11px]">open_in_new</span>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
