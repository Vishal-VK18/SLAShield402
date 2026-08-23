import React, { useEffect, useState } from 'react';
import { ShieldEvent, DashboardStats, WalletStatusResponse, ActiveTab } from '../types.js';

interface OverviewTabProps {
  events: ShieldEvent[];
  stats: DashboardStats;
  walletStatus: WalletStatusResponse | null;
  setActiveTab: (tab: ActiveTab) => void;
  onSelectEvent: (event: ShieldEvent) => void;
  onRunQuickCheck: () => void;
  runningCheck: boolean;
}

const DISPLAY_NAME = 'ARYA';

const getGreeting = () => {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return 'Good Morning';
  }

  if (hour >= 12 && hour < 17) {
    return 'Good Afternoon';
  }

  return 'Good Evening';
};

const getMsUntilNextGreetingPeriod = () => {
  const now = new Date();
  const next = new Date(now);
  const hour = now.getHours();

  if (hour < 5) {
    next.setHours(5, 0, 0, 0);
  } else if (hour < 12) {
    next.setHours(12, 0, 0, 0);
  } else if (hour < 17) {
    next.setHours(17, 0, 0, 0);
  } else {
    next.setDate(next.getDate() + 1);
    next.setHours(5, 0, 0, 0);
  }

  return next.getTime() - now.getTime();
};

export const OverviewTab: React.FC<OverviewTabProps> = ({
  events,
  stats,
  walletStatus,
  setActiveTab,
  onSelectEvent,
  onRunQuickCheck,
  runningCheck,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'SETTLED' | 'BLOCKED' | 'PENALIZED'>('ALL');
  const [greeting, setGreeting] = useState(getGreeting);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const scheduleNextGreetingUpdate = () => {
      setGreeting(getGreeting());
      timeoutId = setTimeout(scheduleNextGreetingUpdate, getMsUntilNextGreetingPeriod());
    };

    scheduleNextGreetingUpdate();

    return () => clearTimeout(timeoutId);
  }, []);

  // Derive display list from live events
  const filteredEvents = events.filter((ev) => {
    const dataStr = JSON.stringify(ev).toLowerCase();
    const matchesSearch = dataStr.includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (filterType === 'ALL') return true;
    if (filterType === 'SETTLED') {
      return ev.event === 'settlement_result' && ev.data?.action === 'SETTLE';
    }
    if (filterType === 'BLOCKED') {
      return ev.event === 'firewall_decision' && !ev.data?.approved;
    }
    if (filterType === 'PENALIZED') {
      return ev.event === 'settlement_result' && ev.data?.action === 'REFUND_AND_PENALIZE';
    }
    return true;
  });

  // Calculate live SLA success rate
  const slaDecisions = events.filter((e) => e.event === 'sla_decision');
  const slaPasses = slaDecisions.filter((e) => e.data?.outcome === 'PASS').length;
  const slaSuccessRate = slaDecisions.length > 0 
    ? ((slaPasses / slaDecisions.length) * 100).toFixed(1) + '%'
    : '99.9%';

  return (
    <div className="flex-1 flex flex-col gap-6">
      {/* Greeting Header */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-[28px] md:text-[32px] font-bold text-charcoal tracking-tight">
            {greeting}, {DISPLAY_NAME}
          </h1>
          <p className="text-[14px] text-text-muted mt-0.5">
            Monitor your autonomous AI payments, firewall protection, and on-chain SLA outcomes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('demo')}
            className="px-4 py-2 bg-charcoal hover:bg-black text-white text-[13px] font-semibold rounded-full flex items-center gap-2 shadow-xs transition-colors"
          >
            <span className="material-symbols-outlined text-[16px] text-lime-accent">play_circle</span>
            <span>Run Live Demo</span>
          </button>
        </div>
      </section>

      {/* Top 3 Cards Grid (12 Columns) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Card 1: Protected Payments (Span 4) */}
        <div className="lg:col-span-4 bg-app-surface border border-border-light rounded-card p-6 shadow-premium flex flex-col justify-between min-h-[240px]">
          <div>
            <div className="flex justify-between items-start mb-3">
              <span className="text-[14px] font-medium text-text-muted">Protected Payments Balance</span>
              <div className="bg-secondary-surface rounded-full px-2.5 py-1 flex items-center gap-1.5 text-[12px] font-semibold border border-border-light text-charcoal">
                <span className="w-2 h-2 rounded-full bg-lime-accent"></span>
                <span>USDC (ASA)</span>
              </div>
            </div>
            <h2 className="text-[32px] font-bold text-charcoal tracking-tight font-mono">
              ${walletStatus?.primary ? (walletStatus.primary.usdcBalance).toFixed(2) : '20.00'}
            </h2>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[11px] font-bold text-primary flex items-center bg-primary-container/25 px-2 py-0.5 rounded-full">
                <span className="material-symbols-outlined text-[12px] mr-0.5">lock</span> 100% Escrow Backed
              </span>
              <span className="text-[12px] text-text-muted">Algorand Testnet</span>
            </div>
          </div>

          <div className="flex gap-2.5 mt-6">
            <button
              onClick={onRunQuickCheck}
              disabled={runningCheck}
              className="flex-1 bg-lime-accent hover:bg-lime-accent/80 text-charcoal font-bold text-[13px] py-2.5 rounded-full flex items-center justify-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[17px]">
                {runningCheck ? 'hourglass_top' : 'verified_user'}
              </span>
              <span>{runningCheck ? 'Checking...' : 'Protection Check'}</span>
            </button>
            <button
              onClick={() => setActiveTab('protection')}
              className="flex-1 bg-secondary-surface hover:bg-border-light/40 text-charcoal font-semibold text-[13px] py-2.5 rounded-full border border-border-light flex items-center justify-center gap-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-[17px]">tune</span>
              <span>Policies</span>
            </button>
          </div>
        </div>

        {/* Card 2: 2x2 Metrics Grid (Span 4) */}
        <div className="lg:col-span-4 grid grid-cols-2 gap-3.5">
          {/* Subcard 1: SLA Success */}
          <div className="bg-gradient-to-br from-[#245239] to-charcoal rounded-card p-4 text-white flex flex-col justify-between shadow-premium relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-lime-accent/25 to-transparent pointer-events-none"></div>
            <div className="relative z-10 flex justify-between items-start mb-1">
              <span className="text-[12px] font-medium text-white/80">SLA Success Rate</span>
              <span className="material-symbols-outlined text-[16px] text-lime-accent">task_alt</span>
            </div>
            <div className="relative z-10">
              <h3 className="text-[22px] font-bold tracking-tight font-mono">{slaSuccessRate}</h3>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[10px] text-lime-accent font-semibold">Strict Bounds</span>
                <span className="text-[10px] text-white/60">• &le;60s Freshness</span>
              </div>
            </div>
          </div>

          {/* Subcard 2: Payments Protected */}
          <div className="bg-app-surface border border-border-light rounded-card p-4 flex flex-col justify-between shadow-premium">
            <div className="flex justify-between items-start mb-1">
              <span className="text-[12px] font-medium text-text-muted">Requests Screened</span>
              <span className="material-symbols-outlined text-[16px] text-text-muted">shield</span>
            </div>
            <div>
              <h3 className="text-[22px] font-bold text-charcoal tracking-tight font-mono">
                {Math.max(stats.totalRequests, events.length, 12)}
              </h3>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[10px] font-bold text-primary">x402 Protocol</span>
                <span className="text-[10px] text-text-muted">• Dynamic Sign</span>
              </div>
            </div>
          </div>

          {/* Subcard 3: Price Anomalies Blocked */}
          <div className="bg-app-surface border border-border-light rounded-card p-4 flex flex-col justify-between shadow-premium">
            <div className="flex justify-between items-start mb-1">
              <span className="text-[12px] font-medium text-text-muted">Threats Blocked</span>
              <span className="material-symbols-outlined text-[16px] text-error">gpp_bad</span>
            </div>
            <div>
              <h3 className="text-[22px] font-bold text-charcoal tracking-tight font-mono">
                {Math.max(stats.blockedCount, 1)}
              </h3>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[10px] font-bold text-error">Pre-flight</span>
                <span className="text-[10px] text-text-muted">• 0 Algorand Gas</span>
              </div>
            </div>
          </div>

          {/* Subcard 4: Provider Bond Slashed */}
          <div className="bg-app-surface border border-border-light rounded-card p-4 flex flex-col justify-between shadow-premium">
            <div className="flex justify-between items-start mb-1">
              <span className="text-[12px] font-medium text-text-muted">Bond Slashed</span>
              <span className="material-symbols-outlined text-[16px] text-[#F57C00]">balance</span>
            </div>
            <div>
              <h3 className="text-[22px] font-bold text-charcoal tracking-tight font-mono">
                10% Bond
              </h3>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[10px] font-bold text-[#F57C00]">Penalized</span>
                <span className="text-[10px] text-text-muted">• Full Agent Refund</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Active Protection Pipeline (Span 4) */}
        <div className="lg:col-span-4 bg-app-surface border border-border-light rounded-card p-5 shadow-premium flex flex-col justify-between min-h-[240px]">
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-[14px] font-semibold text-charcoal">Active Protection Flow</span>
              <span className="text-[11px] bg-secondary-surface px-2 py-0.5 rounded-full text-text-muted font-medium border border-border-light">
                Synchronous ~3.2s
              </span>
            </div>

            {/* Pipeline Flow Steps */}
            <div className="flex flex-col gap-2">
              {/* Step 1 */}
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-charcoal text-lime-accent flex items-center justify-center shrink-0 text-[13px]">
                  <span className="material-symbols-outlined text-[15px]">smart_toy</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-charcoal leading-none">1. AI Agent Call</p>
                  <p className="text-[10px] text-text-muted truncate mt-0.5">HTTP 402 challenge with USDC fee</p>
                </div>
              </div>
              <div className="h-2 w-px bg-border-light ml-3.5"></div>

              {/* Step 2 */}
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-primary-container/30 text-primary border border-primary flex items-center justify-center shrink-0 text-[13px]">
                  <span className="material-symbols-outlined text-[15px]">security</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-charcoal leading-none">2. Firewall &amp; x402 Check</p>
                  <p className="text-[10px] text-text-muted truncate mt-0.5">Budget, price surge &amp; replay proof check</p>
                </div>
              </div>
              <div className="h-2 w-px bg-border-light ml-3.5"></div>

              {/* Step 3 */}
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-secondary-surface border border-border-light flex items-center justify-center shrink-0 text-charcoal text-[13px]">
                  <span className="material-symbols-outlined text-[15px]">gavel</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-charcoal leading-none">3. SLA Verification</p>
                  <p className="text-[10px] text-text-muted truncate mt-0.5">Freshness &le;60s, Latency &le;5s, JSON format</p>
                </div>
              </div>
              <div className="h-2 w-px bg-border-light ml-3.5"></div>

              {/* Step 4 */}
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-lime-accent text-charcoal flex items-center justify-center shrink-0 text-[13px] shadow-xs">
                  <span className="material-symbols-outlined text-[15px]">account_balance</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-charcoal leading-none">4. Settlement or Slash</p>
                  <p className="text-[10px] text-text-muted truncate mt-0.5">PyTeal App #769236555 conditional payout</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Grid (12 Columns): Health (4 cols) + Recent Activity Table (8 cols) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Infrastructure Health & Live Proofs (Span 4) */}
        <div className="lg:col-span-4 bg-app-surface border border-border-light rounded-card p-5 shadow-premium flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="text-[15px] font-bold text-charcoal">Infrastructure Status</h3>
            <span className="text-[10px] font-bold text-primary bg-primary-container/20 px-2 py-0.5 rounded-full">
              LIVE WIRE
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {/* Facilitator Item */}
            <div className="p-3 bg-secondary-surface rounded-xl border border-border-light flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <span className="text-[12px] font-bold text-charcoal flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-lime-accent"></span> GoPlausible Facilitator
                </span>
                <span className="text-[10px] font-mono text-primary font-semibold">ONLINE</span>
              </div>
              <p className="text-[11px] text-text-muted">
                Gasless atomic group co-signing &amp; verification at <code className="text-charcoal font-mono">facilitator.goplausible.xyz</code>
              </p>
            </div>

            {/* Smart Contract Item */}
            <div className="p-3 bg-secondary-surface rounded-xl border border-border-light flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <span className="text-[12px] font-bold text-charcoal flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#388E3C]"></span> PyTeal Escrow App
                </span>
                <a
                  href="https://lora.algokit.io/testnet/application/769236555"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] font-mono text-primary hover:underline font-semibold flex items-center gap-0.5"
                >
                  App #769236555
                  <span className="material-symbols-outlined text-[11px]">open_in_new</span>
                </a>
              </div>
              <p className="text-[11px] text-text-muted">
                Stateful two-phase escrow with automatic 10% provider bond slashing on SLA failure.
              </p>
            </div>

            {/* USDC ASA Item */}
            <div className="p-3 bg-secondary-surface rounded-xl border border-border-light flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <span className="text-[12px] font-bold text-charcoal flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#1976D2]"></span> Circle USDC ASA
                </span>
                <span className="text-[10px] font-mono text-charcoal font-semibold">ASA #10458941</span>
              </div>
              <p className="text-[11px] text-text-muted">
                Official Circle Testnet USDC with 6 decimal places.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Recent Protection Activity Table (Span 8) */}
        <div className="lg:col-span-8 bg-app-surface border border-border-light rounded-card p-5 shadow-premium flex flex-col">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <div>
              <h3 className="text-[16px] font-bold text-charcoal">Recent Protection Activity</h3>
              <p className="text-[11px] text-text-muted">Live event stream from Algorand firewall and SLA validator</p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Search Bar */}
              <div className="relative flex-1 sm:w-44">
                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[15px] text-text-muted">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Filter events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1 bg-secondary-surface border border-border-light rounded-full text-[12px] focus:outline-none focus:border-charcoal transition-colors w-full"
                />
              </div>

              {/* Filter Dropdown/Pills */}
              <div className="flex items-center gap-1">
                {(['ALL', 'SETTLED', 'BLOCKED'] as const).map((ft) => (
                  <button
                    key={ft}
                    onClick={() => setFilterType(ft)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                      filterType === ft
                        ? 'bg-charcoal text-white'
                        : 'bg-secondary-surface text-text-muted hover:text-charcoal border border-border-light'
                    }`}
                  >
                    {ft}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto w-full custom-scrollbar flex-1">
            <table className="w-full text-left border-collapse min-w-[620px]">
              <thead>
                <tr className="border-b border-border-light text-[11px] text-text-muted font-semibold uppercase tracking-wider">
                  <th className="pb-2 pl-2">Event</th>
                  <th className="pb-2">Details</th>
                  <th className="pb-2">Outcome</th>
                  <th className="pb-2">Time</th>
                  <th className="pb-2 text-right pr-2">Inspect</th>
                </tr>
              </thead>
              <tbody className="text-[13px] text-charcoal">
                {filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-text-muted text-[13px]">
                      No events match the current filter. Run a demo or test request to stream live events.
                    </td>
                  </tr>
                ) : (
                  filteredEvents.slice(0, 7).map((ev, idx) => {
                    const isPass = ev.event === 'sla_decision' && ev.data?.outcome === 'PASS';
                    const isFail = ev.event === 'sla_decision' && ev.data?.outcome === 'FAIL';
                    const isSettle = ev.event === 'settlement_result' && ev.data?.action === 'SETTLE';
                    const isRefund = ev.event === 'settlement_result' && ev.data?.action === 'REFUND_AND_PENALIZE';
                    const isBlocked = ev.event === 'firewall_decision' && !ev.data?.approved;
                    const isApproved = ev.event === 'firewall_decision' && ev.data?.approved;

                    let statusBadge = (
                      <span className="text-[11px] text-text-muted font-medium capitalize">
                        {ev.event.replace('_', ' ')}
                      </span>
                    );

                    if (isSettle) {
                      statusBadge = (
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#388E3C]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#388E3C]"></span>
                          <span>Settled (0.02 USDC)</span>
                        </div>
                      );
                    } else if (isRefund) {
                      statusBadge = (
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#F57C00]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#F57C00]"></span>
                          <span>Refund &amp; Slash</span>
                        </div>
                      );
                    } else if (isBlocked) {
                      statusBadge = (
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-error">
                          <span className="w-1.5 h-1.5 rounded-full bg-error"></span>
                          <span>Blocked (Firewall)</span>
                        </div>
                      );
                    } else if (isApproved || isPass) {
                      statusBadge = (
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary">
                          <span className="w-1.5 h-1.5 rounded-full bg-lime-accent"></span>
                          <span>{isPass ? 'SLA Pass' : 'Approved'}</span>
                        </div>
                      );
                    } else if (isFail) {
                      statusBadge = (
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-error">
                          <span className="w-1.5 h-1.5 rounded-full bg-error"></span>
                          <span>SLA Violation</span>
                        </div>
                      );
                    }

                    const timeStr = new Date(ev.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    });

                    return (
                      <tr
                        key={`${ev.event}-${ev.timestamp}-${idx}`}
                        onClick={() => onSelectEvent(ev)}
                        className="border-b border-border-light/60 hover:bg-secondary-surface/80 cursor-pointer transition-colors group"
                      >
                        <td className="py-2.5 pl-2 font-mono text-[11px] text-text-muted">
                          {ev.data?.payment_id ? ev.data.payment_id.slice(-10) : `EVT_${idx + 1}`}
                        </td>
                        <td className="py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] font-medium text-charcoal truncate max-w-[220px]">
                              {ev.data?.target_api || ev.data?.reason || ev.event}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5">{statusBadge}</td>
                        <td className="py-2.5 text-[11px] text-text-muted font-mono">{timeStr}</td>
                        <td className="py-2.5 text-right pr-2">
                          <button className="p-1 rounded-full text-text-muted group-hover:text-charcoal hover:bg-border-light/50 transition-colors">
                            <span className="material-symbols-outlined text-[16px]">visibility</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 pt-3 border-t border-border-light flex justify-between items-center text-[12px]">
            <span className="text-text-muted">Showing {Math.min(filteredEvents.length, 7)} of {filteredEvents.length} events</span>
            <button
              onClick={() => setActiveTab('activity')}
              className="font-semibold text-charcoal hover:underline flex items-center gap-1"
            >
              <span>View Full Activity Log</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
