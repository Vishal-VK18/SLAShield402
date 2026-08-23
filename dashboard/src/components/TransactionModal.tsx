import React from 'react';
import { ShieldEvent } from '../types.js';

interface TransactionModalProps {
  event: ShieldEvent | null;
  onClose: () => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({ event, onClose }) => {
  if (!event) return null;

  const data = event.data || {};
  const txId = data.tx_id || data.shield_fee_tx || data.transaction;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-app-surface border border-border-light rounded-card max-w-xl w-full p-6 shadow-elevated flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-lime-accent text-charcoal flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[18px]">verified</span>
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-charcoal">Event &amp; Transaction Details</h3>
              <p className="text-[11px] text-text-muted font-mono uppercase">
                {event.event.replace('_', ' ')} • {new Date(event.timestamp).toLocaleString()}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-full text-text-muted hover:text-charcoal hover:bg-secondary-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Status Highlight */}
        <div className="p-3.5 bg-secondary-surface rounded-xl border border-border-light flex flex-col gap-1.5 text-[12px]">
          <div className="flex justify-between items-center font-semibold text-charcoal">
            <span>Decision / Outcome:</span>
            <span className="font-bold">
              {data.action || data.outcome || (data.approved ? 'APPROVED' : data.reason ? 'BLOCKED' : 'PROCESSED')}
            </span>
          </div>
          {data.reason && (
            <div className="text-[11px] text-text-muted">
              <span className="font-semibold text-charcoal">Reason:</span> {data.reason}
            </div>
          )}
          {data.payment_id && (
            <div className="text-[11px] text-text-muted font-mono">
              <span className="font-semibold text-charcoal">Payment ID:</span> {data.payment_id}
            </div>
          )}
        </div>

        {/* Transaction Links if Available */}
        {txId && (
          <div className="p-3.5 bg-primary-container/15 border border-primary-container/40 rounded-xl flex flex-col gap-2 text-[12px]">
            <div className="font-bold text-primary flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">link</span>
              <span>On-Chain Algorand Testnet Proof</span>
            </div>
            <div className="font-mono text-[11px] text-charcoal break-all bg-white p-2 rounded-lg border border-border-light">
              {txId}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <a
                href={`https://lora.algokit.io/testnet/transaction/${txId}`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1 bg-charcoal text-white hover:bg-black text-[11px] font-semibold rounded-full flex items-center gap-1 transition-colors"
              >
                <span>Lora Explorer</span>
                <span className="material-symbols-outlined text-[13px]">open_in_new</span>
              </a>
              <a
                href={`https://testnet.explorer.perawallet.app/tx/${txId}/`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1 bg-white text-charcoal hover:bg-secondary-surface border border-border-light text-[11px] font-semibold rounded-full flex items-center gap-1 transition-colors"
              >
                <span>Pera Explorer</span>
                <span className="material-symbols-outlined text-[13px]">open_in_new</span>
              </a>
            </div>
          </div>
        )}

        {/* Raw JSON Payload */}
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-text-muted uppercase">Raw Event Payload</span>
          <pre className="bg-[#1B1F19] text-[#E7E9ED] p-3.5 rounded-xl font-mono text-[11px] max-h-48 overflow-y-auto custom-scrollbar">
            {JSON.stringify(event, null, 2)}
          </pre>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-border-light">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-charcoal hover:bg-black text-white text-[12px] font-semibold rounded-full transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
