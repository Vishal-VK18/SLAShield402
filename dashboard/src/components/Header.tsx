import React from 'react';
import { motion } from 'framer-motion';
import { Shield, ExternalLink, Activity } from 'lucide-react';

interface HeaderProps {
  connected: boolean;
  eventCount: number;
}

export const Header: React.FC<HeaderProps> = ({ connected, eventCount }) => {
  return (
    <header className="sticky top-0 z-50 w-full glass-panel border-b border-black/5 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#1D1D1F] flex items-center justify-center text-white shadow-sm">
            <Shield className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-lg tracking-[-0.03em] text-[#1D1D1F]">
                SLAShield402
              </span>
              <span className="text-[11px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-black/5 text-[#86868B]">
                x402 Live Gate
              </span>
            </div>
            <p className="text-xs text-[#86868B] font-normal leading-none mt-0.5">
              Autonomous AI Payment Firewall & Algorand SLA Validator
            </p>
          </div>
        </div>

        {/* Right: Network & Live Connection Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 border border-black/5 shadow-sm text-xs text-[#1D1D1F]">
            <motion.div
              animate={{ opacity: connected ? [1, 0.35, 1] : 0.2 }}
              transition={{
                duration: 2.2,
                repeat: connected ? Infinity : 0,
                ease: 'easeInOut',
              }}
              className={`w-2 h-2 rounded-full ${
                connected ? 'bg-[#1D1D1F]' : 'bg-[#86868B]'
              }`}
            />
            <span className="font-medium tracking-tight">
              {connected ? 'Live Stream Active' : 'Connecting to /ws...'}
            </span>
            <span className="text-[#86868B] font-mono text-[11px] pl-1 border-l border-black/10">
              {eventCount} events
            </span>
          </div>

          <a
            href="https://testnet.explorer.perawallet.app/application/769236555"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs font-medium text-[#1D1D1F] hover:text-black px-3 py-1.5 rounded-full bg-white/60 hover:bg-white border border-black/5 transition-all shadow-sm"
          >
            <span>App #769236555</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-60" />
          </a>
        </div>
      </div>
    </header>
  );
};
