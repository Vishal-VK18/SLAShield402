import React from 'react';
import { ActiveTab, WalletStatusResponse } from '../types.js';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  connected: boolean;
  walletStatus: WalletStatusResponse | null;
  onOpenWalletModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  connected,
  walletStatus,
  onOpenWalletModal,
}) => {
  const tabs: { id: ActiveTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'activity', label: 'Activity' },
    { id: 'protection', label: 'Protection' },
    { id: 'payments', label: 'Payments' },
    { id: 'sla', label: 'SLA Monitor' },
    { id: 'demo', label: 'Demo Runner' },
  ];

  const primaryAddr = walletStatus?.primary?.address || 'YVEHNV3EWF4GULZHABH64QKOYLE5MO2MSBAAK7O76A2ESACA5OV2AZSOKQ';
  const shortAddr = `${primaryAddr.slice(0, 4)}...${primaryAddr.slice(-5)}`;

  return (
    <header className="bg-white flex justify-between items-center w-full px-4 md:px-8 py-4 border-b border-border-light/60">
      {/* Brand */}
      <div 
        onClick={() => setActiveTab('overview')}
        className="flex items-center gap-2 cursor-pointer select-none"
      >
        <div className="bg-lime-accent text-charcoal rounded-lg p-1.5 flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            shield
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[17px] font-bold tracking-tight text-charcoal leading-none">SLAShield</span>
          <span className="text-[10px] text-text-muted font-medium tracking-wide">x402 AVM Gateway</span>
        </div>
      </div>

      {/* Center Navigation Links (Pill Style) */}
      <nav className="hidden md:flex items-center gap-1 bg-secondary-surface rounded-full p-1 border border-border-light">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-5 py-1.5 font-semibold text-[13px] transition-all duration-200 ${
                isActive
                  ? 'bg-charcoal text-white shadow-sm'
                  : 'text-text-muted hover:text-charcoal hover:bg-black/5'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Live WebSocket Indicator */}
        <div 
          title={connected ? 'Connected to live x402 WebSocket server' : 'Reconnecting to WebSocket...'}
          className="flex items-center gap-1.5 bg-secondary-surface border border-border-light px-3 py-1.5 rounded-full text-[12px] font-medium text-charcoal cursor-default"
        >
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-[#388E3C] animate-pulse' : 'bg-error'}`}></span>
          <span className="hidden sm:inline">{connected ? 'Live Sync' : 'Connecting'}</span>
        </div>

        {/* Network Badge */}
        <div className="hidden lg:flex items-center gap-1 bg-primary-container/20 text-primary border border-primary-container/40 px-2.5 py-1 rounded-full text-[11px] font-semibold">
          <span>Testnet</span>
        </div>

        {/* Wallet Pill Button */}
        <button
          onClick={onOpenWalletModal}
          className="flex items-center gap-2 bg-secondary-surface hover:bg-border-light/40 rounded-full py-1.5 pl-2 pr-3.5 border border-border-light transition-colors text-left"
          title="Click to view full wallet details and balances"
        >
          <div className="w-5 h-5 rounded-full bg-charcoal text-lime-accent flex items-center justify-center text-[10px] font-bold">
            A
          </div>
          <div className="flex flex-col">
            <span className="text-[12px] font-bold text-charcoal font-mono leading-none">{shortAddr}</span>
            <span className="text-[10px] text-text-muted leading-tight">
              {walletStatus?.primary ? `${walletStatus.primary.usdcBalance.toFixed(2)} USDC` : '20.00 USDC'}
            </span>
          </div>
          <span className="material-symbols-outlined text-[16px] text-text-muted">expand_more</span>
        </button>
      </div>
    </header>
  );
};
