import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowDownLeft,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { ShieldEvent } from '../types.js';

interface LiveEventFeedProps {
  events: ShieldEvent[];
  onClear?: () => void;
}

export const LiveEventFeed: React.FC<LiveEventFeedProps> = ({ events, onClear }) => {
  const getStageMeta = (event: ShieldEvent) => {
    switch (event.event) {
      case 'request_received':
        return {
          title: 'Request Received',
          icon: ArrowDownLeft,
          summary: `Target API: ${event.data.target_api || 'N/A'} · Offer: $${event.data.offer_price} USDC`,
        };
      case 'challenge_issued':
        return {
          title: 'x402 Challenge Issued (HTTP 402)',
          icon: KeyRound,
          summary: `Verification Fee: ${event.data.amount_usdc} USDC · Nonce: ${event.data.nonce}`,
        };
      case 'payment_verified':
        return {
          title: event.data.rejected ? 'Payment Proof Rejected' : 'On-Chain Payment Verified',
          icon: event.data.rejected ? XCircle : CheckCircle2,
          summary: event.data.rejected
            ? `Rejection Reason: ${event.data.reason}`
            : `Tx: ${event.data.tx_id} (Round #${event.data.confirmed_round})`,
        };
      case 'firewall_decision':
        return {
          title: event.data.approved ? 'Firewall Check Passed' : 'Firewall Intercepted (Blocked)',
          icon: ShieldCheck,
          summary: event.data.approved
            ? `Budget & Price Guardrails Verified`
            : `Reason: ${event.data.reason}`,
        };
      case 'target_api_response':
        return {
          title: 'Target API Response Received',
          icon: Layers,
          summary: `Status: HTTP ${event.data.status} · Network Latency: ${event.data.latency_sec}s`,
        };
      case 'sla_decision':
        return {
          title: event.data.outcome === 'PASS' ? 'SLA Outcome Verified (PASS)' : 'SLA Outcome Violated (FAIL)',
          icon: event.data.outcome === 'PASS' ? CheckCircle2 : XCircle,
          summary: event.data.reason || `Outcome: ${event.data.outcome}`,
        };
      case 'settlement_result':
        return {
          title: event.data.action === 'SETTLE' ? 'Algorand Settlement Executed' : 'Algorand Refund & Bond Slash Executed',
          icon: Sparkles,
          summary: `Tx: ${event.data.tx_id} (${event.data.action})`,
        };
      default:
        return {
          title: event.event,
          icon: Clock,
          summary: JSON.stringify(event.data),
        };
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-5 mb-6">
      <div className="flex items-center justify-between pb-4 border-b border-black/5 mb-4">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-base tracking-tight text-[#1D1D1F]">
            Live Event Stream
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-black/5 text-[#86868B] font-mono">
            WebSocket /ws
          </span>
        </div>
        {onClear && (
          <button
            onClick={onClear}
            className="text-xs font-medium text-[#86868B] hover:text-[#1D1D1F] transition-colors"
          >
            Clear Feed
          </button>
        )}
      </div>

      {events.length === 0 ? (
        <div className="py-16 text-center text-[#86868B]">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-40 stroke-1" />
          <p className="text-sm font-medium">Waiting for incoming x402 requests...</p>
          <p className="text-xs text-[#A1A1A6] mt-1">
            Click "Send Test Request" above or send a request from your AI Agent.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {events.map((ev, idx) => {
              const meta = getStageMeta(ev);
              const Icon = meta.icon;
              const timeFormatted = new Date(ev.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });

              return (
                <motion.div
                  key={`${ev.event}-${ev.timestamp}-${idx}`}
                  layout
                  initial={{ opacity: 0, y: -16, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{
                    type: 'spring',
                    damping: 25,
                    stiffness: 200,
                    mass: 0.8,
                  }}
                  className="glass-card rounded-xl p-3.5 flex items-start justify-between gap-3 border border-black/5 hover:border-black/10 transition-all"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-black/5 flex items-center justify-center text-[#1D1D1F] shrink-0 mt-0.5">
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-xs text-[#1D1D1F] tracking-tight">
                          {meta.title}
                        </span>
                        {ev.data?.payment_id && (
                          <span className="text-[10.5px] font-mono px-1.5 py-0.5 rounded bg-black/5 text-[#86868B]">
                            {ev.data.payment_id}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-[#86868B] font-mono mt-0.5 truncate max-w-xl">
                        {meta.summary}
                      </p>

                      {/* Explorer Link Chip if Settlement Result */}
                      {ev.data?.explorer_url && (
                        <div className="mt-2">
                          <a
                            href={ev.data.explorer_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-[11px] font-medium font-mono px-2.5 py-1 rounded-full bg-[#1D1D1F] text-white hover:bg-black transition-all shadow-sm"
                          >
                            <span>Verify On-Chain Tx</span>
                            <ExternalLink className="w-3 h-3 opacity-70" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  <span className="text-[11px] font-mono text-[#86868B] shrink-0 tabular-nums">
                    {timeFormatted}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
