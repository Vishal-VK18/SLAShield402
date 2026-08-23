import React from 'react';

interface HelpModalProps {
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-app-surface border border-border-light rounded-card max-w-xl w-full p-6 shadow-elevated flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-charcoal text-lime-accent flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[18px]">info</span>
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-charcoal">About SLAShield402</h3>
              <p className="text-[11px] text-text-muted">Autonomous x402 AI Payment Firewall &amp; SLA Settlement Layer</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-full text-text-muted hover:text-charcoal hover:bg-secondary-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-3 text-[12px] text-text-muted leading-relaxed">
          <p>
            <strong className="text-charcoal">SLAShield402</strong> protects autonomous AI agents from rogue pricing, unexpected budget depletion, and bad or stale data when making machine-to-machine micropayments.
          </p>

          <div className="p-3 bg-secondary-surface rounded-xl border border-border-light flex flex-col gap-2">
            <div className="font-bold text-charcoal flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-primary">account_tree</span>
              <span>Key Architecture Layers:</span>
            </div>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>Pre-Flight Spend Firewall:</strong> Enforces price thresholds and budget safety before any funds are committed.</li>
              <li><strong>GoPlausible Facilitator Integration:</strong> Validates signed x402 payment groups and executes gasless atomic settlements.</li>
              <li><strong>3-Point SLA Validator:</strong> Evaluates timestamp freshness (&le;60s), network latency (&le;5s), and JSON payload schema.</li>
              <li><strong>PyTeal Escrow Smart Contract:</strong> Holds payment in conditional escrow (App #769236555) and automatically refunds the agent and slashes 10% provider bond on SLA violation.</li>
            </ul>
          </div>

          <div className="flex items-center justify-between text-[11px] pt-1">
            <span>Algorand Testnet • USDC ASA #10458941</span>
            <a
              href="https://github.com/Vishal-VK18/SLAShield402.git"
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline font-semibold flex items-center gap-0.5"
            >
              <span>GitHub Repo</span>
              <span className="material-symbols-outlined text-[12px]">open_in_new</span>
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-border-light">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-charcoal hover:bg-black text-white text-[12px] font-semibold rounded-full transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
