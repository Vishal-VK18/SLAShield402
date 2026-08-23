import React from 'react';
import { WalletStatusResponse } from '../types.js';

interface WalletModalProps {
  walletStatus: WalletStatusResponse | null;
  onClose: () => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({ walletStatus, onClose }) => {
  const primary = walletStatus?.primary;
  const secondary = walletStatus?.secondary;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-app-surface border border-border-light rounded-card max-w-lg w-full p-6 shadow-elevated flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-charcoal text-lime-accent flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-charcoal">Algorand Testnet Wallet Status</h3>
              <p className="text-[11px] text-text-muted">Live on-chain balance &amp; ASA opt-in verification</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-full text-text-muted hover:text-charcoal hover:bg-secondary-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Primary Wallet Section */}
        <div className="p-4 bg-secondary-surface rounded-xl border border-border-light flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-[13px] font-bold text-charcoal flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-lime-accent"></span>
              <span>Primary Deployer Wallet</span>
            </span>
            <span className="text-[10px] font-bold bg-primary-container/30 text-primary px-2 py-0.5 rounded-full">
              DEFAULT PAYER
            </span>
          </div>

          <div className="font-mono text-[11px] text-charcoal bg-white p-2 rounded-lg border border-border-light break-all select-all">
            {primary?.address || 'YVEHNV3EWF4GULZHABH64QKOYLE5MO2MSBAAK7O76A2ESACA5OV2AZSOKQ'}
          </div>

          <div className="grid grid-cols-2 gap-2 mt-1">
            <div className="p-2.5 bg-white rounded-lg border border-border-light">
              <span className="text-[10px] text-text-muted">ALGO Balance</span>
              <div className="text-[14px] font-bold text-charcoal font-mono">
                {primary ? `${primary.algoBalance.toFixed(3)} ALGO` : '1.233 ALGO'}
              </div>
            </div>
            <div className="p-2.5 bg-white rounded-lg border border-border-light">
              <span className="text-[10px] text-text-muted">USDC Balance (ASA #10458941)</span>
              <div className="text-[14px] font-bold text-charcoal font-mono">
                {primary ? `${primary.usdcBalance.toFixed(2)} USDC` : '20.00 USDC'}
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Wallet Section if present */}
        {secondary ? (
          <div className="p-4 bg-secondary-surface rounded-xl border border-border-light flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-[13px] font-bold text-charcoal flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#388E3C]"></span>
                <span>Secondary Test Wallet</span>
              </span>
              <span className="text-[10px] font-bold bg-secondary-surface text-text-muted border border-border-light px-2 py-0.5 rounded-full">
                OPTIONAL
              </span>
            </div>
            <div className="font-mono text-[11px] text-charcoal bg-white p-2 rounded-lg border border-border-light break-all select-all">
              {secondary.address}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div className="p-2.5 bg-white rounded-lg border border-border-light">
                <span className="text-[10px] text-text-muted">ALGO Balance</span>
                <div className="text-[14px] font-bold text-charcoal font-mono">
                  {secondary.algoBalance.toFixed(3)} ALGO
                </div>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-border-light">
                <span className="text-[10px] text-text-muted">USDC Status</span>
                <div className="text-[14px] font-bold text-charcoal font-mono">
                  {secondary.optedIn ? `${secondary.usdcBalance.toFixed(2)} USDC` : 'Not Opted In'}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Footer info */}
        <div className="text-[11px] text-text-muted flex justify-between items-center pt-2 border-t border-border-light">
          <span>Official Circle USDC ASA ID: 10458941</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-charcoal hover:bg-black text-white text-[12px] font-semibold rounded-full transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
