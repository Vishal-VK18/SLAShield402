import React from 'react';

export const SlaMonitorTab: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col gap-6">
      {/* Header */}
      <div className="bg-app-surface border border-border-light rounded-card p-6 shadow-premium">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-[22px] font-bold text-charcoal">Real-Time SLA Outcome Enforcement</h2>
            <p className="text-[13px] text-text-muted mt-0.5">
              Three-point validation (Freshness, Format, Latency) coupled with PyTeal escrow conditional settlement &amp; bond slashing.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-primary bg-primary-container/25 border border-primary-container/40 px-3 py-1 rounded-full">
              PyTeal App #769236555
            </span>
          </div>
        </div>
      </div>

      {/* 3 SLA Dimensions Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Dimension 1: Freshness */}
        <div className="bg-app-surface border border-border-light rounded-card p-5 shadow-premium flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-2">
              <span className="text-[13px] font-bold text-charcoal flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-primary">schedule</span>
                <span>1. Timestamp Freshness</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-primary-container/30 text-primary rounded-full">
                &le; 60s Bound
              </span>
            </div>
            <p className="text-[12px] text-text-muted mt-1 leading-relaxed">
              Compares response timestamp against current wall-clock time. Stale cache (e.g. 4 hours old) triggers immediate contract breach.
            </p>
          </div>

          <div className="mt-4 p-3 bg-secondary-surface rounded-xl border border-border-light text-[11px]">
            <div className="flex justify-between text-charcoal font-semibold">
              <span>Fresh Response:</span>
              <span className="text-[#2E7D32]">✔ Age: ~4s &le; 60s (PASS)</span>
            </div>
            <div className="flex justify-between text-charcoal font-semibold mt-1">
              <span>Stale Cache:</span>
              <span className="text-error">✘ Age: 14400s &gt; 60s (FAIL)</span>
            </div>
          </div>
        </div>

        {/* Dimension 2: Format & Schema */}
        <div className="bg-app-surface border border-border-light rounded-card p-5 shadow-premium flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-2">
              <span className="text-[13px] font-bold text-charcoal flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-primary">data_object</span>
                <span>2. Format &amp; Schema</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-primary-container/30 text-primary rounded-full">
                JSON Object
              </span>
            </div>
            <p className="text-[12px] text-text-muted mt-1 leading-relaxed">
              Validates syntactic structure, required keys, and payload integrity before accepting the API delivery.
            </p>
          </div>

          <div className="mt-4 p-3 bg-secondary-surface rounded-xl border border-border-light text-[11px]">
            <div className="flex justify-between text-charcoal font-semibold">
              <span>Valid Schema:</span>
              <span className="text-[#2E7D32]">✔ JSON_OBJECT (PASS)</span>
            </div>
            <div className="flex justify-between text-charcoal font-semibold mt-1">
              <span>Corrupt / Raw:</span>
              <span className="text-error">✘ Non-JSON / Incomplete (FAIL)</span>
            </div>
          </div>
        </div>

        {/* Dimension 3: Latency */}
        <div className="bg-app-surface border border-border-light rounded-card p-5 shadow-premium flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-2">
              <span className="text-[13px] font-bold text-charcoal flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-primary">speed</span>
                <span>3. Network Latency</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-primary-container/30 text-primary rounded-full">
                &le; 5.0s Timeout
              </span>
            </div>
            <p className="text-[12px] text-text-muted mt-1 leading-relaxed">
              Measures high-precision roundtrip network latency. Slow unresponsive APIs trigger timeout penalties.
            </p>
          </div>

          <div className="mt-4 p-3 bg-secondary-surface rounded-xl border border-border-light text-[11px]">
            <div className="flex justify-between text-charcoal font-semibold">
              <span>Fast Gateway:</span>
              <span className="text-[#2E7D32]">✔ Latency: 0.29s &le; 5s (PASS)</span>
            </div>
            <div className="flex justify-between text-charcoal font-semibold mt-1">
              <span>Hanging API:</span>
              <span className="text-error">✘ Latency: &gt; 5.0s (TIMEOUT)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Two-Phase Smart Contract Escrow Mechanics */}
      <div className="bg-app-surface border border-border-light rounded-card p-6 shadow-premium flex flex-col gap-4">
        <h3 className="text-[16px] font-bold text-charcoal">Two-Phase Escrow State Transitions</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[12px]">
          <div className="p-4 bg-[#E8F5E9]/40 border border-[#C8E6C9] rounded-xl flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-[#2E7D32] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                <span>Branch A: SLA Compliance (Pass)</span>
              </span>
              <span className="font-mono text-[11px] font-bold text-charcoal">approve_and_settle</span>
            </div>
            <p className="text-text-muted">
              State transitions: <code className="font-mono text-charcoal font-bold">LOCKED &rarr; APPROVED &rarr; SETTLED</code>. 
              The smart contract releases the held escrow amount (e.g. 0.02 USDC) to the provider wallet.
            </p>
          </div>

          <div className="p-4 bg-[#FFEBEE]/40 border border-[#FFCDD2] rounded-xl flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-error flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span>Branch B: SLA Violation (Failure)</span>
              </span>
              <span className="font-mono text-[11px] font-bold text-charcoal">fail_and_refund</span>
            </div>
            <p className="text-text-muted">
              State transitions: <code className="font-mono text-charcoal font-bold">LOCKED &rarr; SLA_FAILED &rarr; REFUNDED_AND_PENALIZED</code>. 
              The escrow refunds 100% of agent funds AND slashes 10% of provider bonded stake in contract global state.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
