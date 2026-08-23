import React, { useState } from 'react';
import { ShieldEvent } from '../types.js';

interface ActivityTabProps {
  events: ShieldEvent[];
  onSelectEvent: (event: ShieldEvent) => void;
  onClearEvents?: () => void;
}

export const ActivityTab: React.FC<ActivityTabProps> = ({
  events,
  onSelectEvent,
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'SETTLE' | 'REFUND' | 'FIREWALL' | 'SLA'>('ALL');

  const filtered = events.filter((e) => {
    const jsonStr = JSON.stringify(e).toLowerCase();
    if (!jsonStr.includes(search.toLowerCase())) return false;

    if (filter === 'ALL') return true;
    if (filter === 'SETTLE') return e.event === 'settlement_result' && e.data?.action === 'SETTLE';
    if (filter === 'REFUND') return e.event === 'settlement_result' && e.data?.action === 'REFUND_AND_PENALIZE';
    if (filter === 'FIREWALL') return e.event === 'firewall_decision';
    if (filter === 'SLA') return e.event === 'sla_decision';
    return true;
  });

  return (
    <div className="flex-1 flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-app-surface border border-border-light rounded-card p-5 shadow-premium">
        <div>
          <h2 className="text-[20px] font-bold text-charcoal">Real-Time Protection Activity Stream</h2>
          <p className="text-[13px] text-text-muted">
            Live cryptographic verification, firewall decisions, SLA evaluations, and on-chain settlements.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative w-full sm:w-56">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-text-muted">
              search
            </span>
            <input
              type="text"
              placeholder="Search by ID, Tx, reason..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-secondary-surface border border-border-light rounded-full text-[12px] focus:outline-none focus:border-charcoal transition-colors"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1">
            {(['ALL', 'SETTLE', 'REFUND', 'FIREWALL', 'SLA'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors ${
                  filter === f
                    ? 'bg-charcoal text-white'
                    : 'bg-secondary-surface text-text-muted hover:text-charcoal border border-border-light'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Activity Table Card */}
      <div className="bg-app-surface border border-border-light rounded-card p-5 shadow-premium flex-1 flex flex-col">
        <div className="overflow-x-auto w-full custom-scrollbar flex-1">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-border-light text-[11px] text-text-muted font-semibold uppercase tracking-wider">
                <th className="pb-3 pl-3">Payment / Event ID</th>
                <th className="pb-3">Stage / Event Type</th>
                <th className="pb-3">Summary / Details</th>
                <th className="pb-3">Decision / Action</th>
                <th className="pb-3">Timestamp</th>
                <th className="pb-3 text-right pr-3">Inspect Payload</th>
              </tr>
            </thead>
            <tbody className="text-[13px] text-charcoal">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-text-muted text-[13px]">
                    No activity logs found. Run a demo scenario or firewall check to generate events.
                  </td>
                </tr>
              ) : (
                filtered.map((ev, idx) => {
                  const paymentId = ev.data?.payment_id || `EVT-${idx + 1}`;
                  const isSettle = ev.event === 'settlement_result' && ev.data?.action === 'SETTLE';
                  const isRefund = ev.event === 'settlement_result' && ev.data?.action === 'REFUND_AND_PENALIZE';
                  const isBlocked = ev.event === 'firewall_decision' && !ev.data?.approved;
                  const isApproved = ev.event === 'firewall_decision' && ev.data?.approved;
                  const isSlaPass = ev.event === 'sla_decision' && ev.data?.outcome === 'PASS';
                  const isSlaFail = ev.event === 'sla_decision' && ev.data?.outcome === 'FAIL';

                  let badgeColor = 'bg-secondary-surface text-text-muted border-border-light';
                  let badgeText: string = ev.event;

                  if (isSettle) {
                    badgeColor = 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]';
                    badgeText = 'SETTLED (0.02 USDC)';
                  } else if (isRefund) {
                    badgeColor = 'bg-[#FFF3E0] text-[#E65100] border-[#FFE0B2]';
                    badgeText = 'REFUNDED & SLASHED';
                  } else if (isBlocked) {
                    badgeColor = 'bg-[#FFEBEE] text-[#C62828] border-[#FFCDD2]';
                    badgeText = 'FIREWALL BLOCKED';
                  } else if (isApproved) {
                    badgeColor = 'bg-[#F1F8E9] text-[#33691E] border-[#DCEDC8]';
                    badgeText = 'FIREWALL APPROVED';
                  } else if (isSlaPass) {
                    badgeColor = 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]';
                    badgeText = 'SLA PASSED';
                  } else if (isSlaFail) {
                    badgeColor = 'bg-[#FFEBEE] text-[#C62828] border-[#FFCDD2]';
                    badgeText = 'SLA VIOLATION';
                  }

                  const detailText =
                    ev.data?.reason ||
                    ev.data?.target_api ||
                    (ev.data?.tx_id ? `Tx: ${ev.data.tx_id.slice(0, 16)}...` : JSON.stringify(ev.data).slice(0, 45));

                  return (
                    <tr
                      key={`${ev.event}-${ev.timestamp}-${idx}`}
                      onClick={() => onSelectEvent(ev)}
                      className="border-b border-border-light/60 hover:bg-secondary-surface/70 cursor-pointer transition-colors"
                    >
                      <td className="py-3 pl-3 font-mono text-[12px] font-semibold text-charcoal">
                        {paymentId}
                      </td>
                      <td className="py-3">
                        <span className="text-[11px] font-mono font-medium text-text-muted uppercase">
                          {ev.event.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 max-w-[280px] truncate text-[12px] text-text-muted">
                        {detailText}
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badgeColor}`}>
                          {badgeText}
                        </span>
                      </td>
                      <td className="py-3 text-[11px] text-text-muted font-mono">
                        {new Date(ev.timestamp).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="py-3 text-right pr-3">
                        <button className="px-2.5 py-1 text-[11px] font-semibold text-charcoal bg-secondary-surface hover:bg-border-light/50 border border-border-light rounded-full transition-colors">
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
