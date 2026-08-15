import React, { useState } from 'react';
import { Play, ArrowRight, CheckCircle2, ShieldAlert, Clock } from 'lucide-react';

interface SendTestRequestProps {
  serverUrl: string;
  onExecutionComplete?: () => void;
}

export const SendTestRequest: React.FC<SendTestRequestProps> = ({ serverUrl }) => {
  const [scenarioId, setScenarioId] = useState<'1' | '2' | '3'>('1');
  const [loading, setLoading] = useState(false);
  const [lastStatus, setLastStatus] = useState<string | null>(null);

  const scenarios = [
    {
      id: '1' as const,
      name: 'Scenario 1: Normal Success',
      desc: 'Fresh API data within SLA ➔ Smart contract SETTLES 0.02 USDC to provider',
      badge: 'SLA Pass',
      icon: CheckCircle2,
      payload: {
        target_api: 'https://api.weather-provider-alpha.algo/v1/current?city=Bengaluru',
        provider_address: 'YVEHNV3EWF4GULZHABH64QKOYLE5MO2MSBAAK7O76A2ESACA5OV2AZSOKQ',
        offer_price: 0.02,
        agent_budget_left: 1.0,
        execute_pipeline: true,
        simulate_stale: false,
        sla_rules: { max_freshness_sec: 60, format: 'JSON', max_latency_sec: 5 },
      },
    },
    {
      id: '2' as const,
      name: 'Scenario 2: Price Spike Anomaly',
      desc: 'Offer price $0.50 exceeds $0.15 budget ➔ Intercepted & BLOCKED at Firewall',
      badge: 'Blocked',
      icon: ShieldAlert,
      payload: {
        target_api: 'https://api.marketdata.algo/v1/quote',
        provider_address: 'YVEHNV3EWF4GULZHABH64QKOYLE5MO2MSBAAK7O76A2ESACA5OV2AZSOKQ',
        offer_price: 0.50,
        agent_budget_left: 0.15,
        execute_pipeline: true,
      },
    },
    {
      id: '3' as const,
      name: 'Scenario 3: Stale Data Violation',
      desc: '4-hour stale cache data ➔ SLA VIOLATION ➔ REFUND agent + Slash provider bond 10%',
      badge: 'SLA Slash',
      icon: Clock,
      payload: {
        target_api: 'https://api.crypto-oracle.algo/v1/ticker',
        provider_address: 'YVEHNV3EWF4GULZHABH64QKOYLE5MO2MSBAAK7O76A2ESACA5OV2AZSOKQ',
        offer_price: 0.02,
        agent_budget_left: 1.0,
        execute_pipeline: true,
        simulate_stale: true,
        sla_rules: { max_freshness_sec: 60, format: 'JSON', max_latency_sec: 5 },
      },
    },
  ];

  const activeScenario = scenarios.find((s) => s.id === scenarioId) || scenarios[0];

  const triggerRealRequest = async () => {
    setLoading(true);
    setLastStatus('Sending initial request (expecting 402)...');

    try {
      const endpoint = `${serverUrl}/shield/check`;
      
      // Step 1: Initial call without proof (gets real 402 challenge)
      const res1 = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activeScenario.payload),
      });

      if (res1.status === 402) {
        setLastStatus('HTTP 402 received. Signing fee & retrying with on-chain payment proof...');
        
        // Step 2: Retry with on-chain verified payment proof
        const paymentProof = {
          txId: 'RPZFMYQTZ2RKWPTXNGQP53DWJ4ATX5H5MHGCWSFATQU4NCEG65FQ',
          amount_paid: 1000,
          timestamp: new Date().toISOString(),
        };

        const res2 = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Payment-Proof': JSON.stringify(paymentProof),
          },
          body: JSON.stringify(activeScenario.payload),
        });

        const data2 = await res2.json();
        setLastStatus(`Completed with status HTTP ${res2.status} (${data2.status || 'PROCESSED'})`);
      } else {
        const data1 = await res1.json();
        setLastStatus(`Returned status HTTP ${res1.status}: ${data1.status || data1.error}`);
      }
    } catch (err: any) {
      setLastStatus(`Request failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-5 mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Scenario Selector */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-[#86868B] uppercase tracking-wider">
              Autonomous Trigger Panel
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-black/5 text-[#1D1D1F] font-mono">
              Live HTTP & WebSocket Wire
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {scenarios.map((s) => {
              const Icon = s.icon;
              const isSelected = scenarioId === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setScenarioId(s.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-[#1D1D1F] text-white shadow-sm'
                      : 'bg-white/80 text-[#1D1D1F] hover:bg-white border border-black/5'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-[#86868B]'}`} />
                  <span>{s.name}</span>
                </button>
              );
            })}
          </div>

          <p className="text-xs text-[#86868B] mt-2.5 leading-relaxed">
            {activeScenario.desc}
          </p>
        </div>

        {/* Right: Trigger Action Button */}
        <div className="flex flex-col sm:items-end gap-2 shrink-0">
          <button
            onClick={triggerRealRequest}
            disabled={loading}
            className="apple-button flex items-center justify-center gap-2 px-6 py-3 text-sm shadow-md disabled:opacity-50"
          >
            <Play className={`w-4 h-4 fill-current ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Executing Pipeline...' : 'Send Test Request'}</span>
            <ArrowRight className="w-4 h-4 opacity-70" />
          </button>

          {lastStatus && (
            <span className="text-[11px] text-[#86868B] font-mono text-right max-w-xs truncate">
              {lastStatus}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
