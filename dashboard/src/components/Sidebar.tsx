import React from 'react';
import { ActiveTab } from '../types.js';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenHelp: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenHelp,
}) => {
  const navItems: { id: ActiveTab; icon: string; title: string }[] = [
    { id: 'overview', icon: 'dashboard', title: 'Overview' },
    { id: 'activity', icon: 'list_alt', title: 'Activity' },
    { id: 'protection', icon: 'security', title: 'Firewall Protection' },
    { id: 'payments', icon: 'payments', title: 'x402 Payments' },
    { id: 'sla', icon: 'query_stats', title: 'SLA Monitor' },
    { id: 'demo', icon: 'hub', title: 'Demo Runner' },
  ];

  return (
    <aside className="hidden lg:flex flex-col gap-4 border-r border-border-light/50 pr-4 w-14 items-center shrink-0">
      {/* Top Icons */}
      <div className="flex flex-col gap-2">
        <button 
          className="p-2 bg-secondary-surface rounded-full text-charcoal border border-border-light flex items-center justify-center cursor-default shadow-xs"
          title="Light Theme Active (Stitch Design Specification)"
        >
          <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            light_mode
          </span>
        </button>
      </div>

      <div className="h-px w-full bg-border-light/60 my-1"></div>

      {/* Navigation Icons */}
      <div className="flex flex-col gap-2.5 w-full items-center">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={item.title}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-150 ${
                isActive
                  ? 'bg-charcoal text-lime-accent shadow-sm'
                  : 'text-text-muted hover:text-charcoal hover:bg-secondary-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
            </button>
          );
        })}
      </div>

      {/* Bottom Info / Help Action */}
      <div className="mt-auto flex flex-col gap-2.5 w-full items-center pb-2">
        <button
          onClick={onOpenHelp}
          title="Architecture & Protocol Info"
          className="w-10 h-10 text-text-muted hover:text-charcoal hover:bg-secondary-surface rounded-full flex items-center justify-center transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">help_outline</span>
        </button>
        <a
          href="https://github.com/Vishal-VK18/SLAShield402.git"
          target="_blank"
          rel="noreferrer"
          title="Open GitHub Repository"
          className="w-10 h-10 text-text-muted hover:text-charcoal hover:bg-secondary-surface rounded-full flex items-center justify-center transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">open_in_new</span>
        </a>
      </div>
    </aside>
  );
};
