import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header.js';
import { Sidebar } from './components/Sidebar.js';
import { OverviewTab } from './components/OverviewTab.js';
import { ActivityTab } from './components/ActivityTab.js';
import { ProtectionTab } from './components/ProtectionTab.js';
import { PaymentsTab } from './components/PaymentsTab.js';
import { SlaMonitorTab } from './components/SlaMonitorTab.js';
import { DemoRunnerTab } from './components/DemoRunnerTab.js';
import { TransactionModal } from './components/TransactionModal.js';
import { WalletModal } from './components/WalletModal.js';
import { HelpModal } from './components/HelpModal.js';
import { ShieldEvent, DashboardStats, WalletStatusResponse, ActiveTab } from './types.js';

const SERVER_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3000/ws';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [events, setEvents] = useState<ShieldEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalRequests: 4,
    approvedCount: 3,
    blockedCount: 1,
    settledAmountUsdc: 0.040,
    refundedAmountUsdc: 0.020,
    slashedAmountUsdc: 1.000,
  });
  const [walletStatus, setWalletStatus] = useState<WalletStatusResponse | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ShieldEvent | null>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [runningQuickCheck, setRunningQuickCheck] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);

  // 1. Fetch live wallet balance
  const fetchWalletStatus = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/api/wallet/status`);
      if (res.ok) {
        const data = await res.json();
        setWalletStatus(data);
      }
    } catch (err) {
      console.warn('Could not fetch wallet status:', err);
    }
  };

  // 2. Fetch recent events backlog
  const fetchRecentEvents = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/api/events/recent`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.events)) {
          setEvents(data.events.reverse());
        }
      }
    } catch (err) {
      console.warn('Could not fetch recent events backlog:', err);
    }
  };

  // 3. Connect to WebSocket with auto-reconnect
  useEffect(() => {
    fetchWalletStatus();
    fetchRecentEvents();

    let reconnectTimer: any;

    const connectWebSocket = () => {
      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          setConnected(true);
          fetchWalletStatus();
        };

        ws.onmessage = (message) => {
          try {
            const data = JSON.parse(message.data);

            if (data.type === 'init' && Array.isArray(data.backlog)) {
              setEvents((prev) => {
                const combined = [...data.backlog.reverse(), ...prev];
                const seen = new Set();
                return combined.filter((ev) => {
                  const key = `${ev.event}-${ev.timestamp}-${ev.data?.payment_id || ''}`;
                  if (seen.has(key)) return false;
                  seen.add(key);
                  return true;
                });
              });
              return;
            }

            if (data.event) {
              const newEvent = data as ShieldEvent;
              setEvents((prev) => [newEvent, ...prev]);

              // Update stats dynamically
              setStats((prev) => {
                let total = prev.totalRequests;
                let approved = prev.approvedCount;
                let blocked = prev.blockedCount;
                let settled = prev.settledAmountUsdc;
                let refunded = prev.refundedAmountUsdc;
                let slashed = prev.slashedAmountUsdc;

                if (newEvent.event === 'request_received') {
                  total += 1;
                } else if (newEvent.event === 'firewall_decision') {
                  if (newEvent.data?.approved) {
                    approved += 1;
                  } else {
                    blocked += 1;
                  }
                } else if (newEvent.event === 'settlement_result') {
                  if (newEvent.data?.action === 'SETTLE') {
                    settled += (newEvent.data?.amount || 20000) / 1e6;
                  } else if (newEvent.data?.action === 'REFUND_AND_PENALIZE') {
                    refunded += (newEvent.data?.amount || 20000) / 1e6;
                    slashed += (newEvent.data?.slashed_amount || 1000000) / 1e6;
                  }
                }

                return {
                  totalRequests: total,
                  approvedCount: approved,
                  blockedCount: blocked,
                  settledAmountUsdc: settled,
                  refundedAmountUsdc: refunded,
                  slashedAmountUsdc: slashed,
                };
              });

              fetchWalletStatus();
            }
          } catch (e) {
            console.error('Error parsing WS message:', e);
          }
        };

        ws.onclose = () => {
          setConnected(false);
          reconnectTimer = setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = () => {
          setConnected(false);
          ws.close();
        };
      } catch (err) {
        console.error('WebSocket connection error:', err);
        reconnectTimer = setTimeout(connectWebSocket, 3000);
      }
    };

    connectWebSocket();

    return () => {
      clearTimeout(reconnectTimer);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  // Quick Protection Check handler
  const handleRunQuickCheck = async () => {
    setRunningQuickCheck(true);
    try {
      const payload = {
        target_api: 'https://api.weather-provider-alpha.algo/v1/current?city=Bengaluru',
        offer_price: 0.02,
        agent_budget_left: 1.0,
      };

      const res = await fetch(`${SERVER_URL}/shield/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.status === 402) {
        setSelectedEvent({
          event: 'challenge_issued',
          timestamp: new Date().toISOString(),
          data: {
            ...data,
            message: 'x402 Verification Challenge issued by SLAShield402',
          },
        });
      }
    } catch (err: any) {
      console.error('Quick check error:', err);
    } finally {
      setRunningQuickCheck(false);
    }
  };

  return (
    <div className="bg-app-surface w-full max-w-[1440px] rounded-app shadow-premium overflow-hidden flex flex-col min-h-[90vh] md:h-[92vh] border border-border-light/40">
      {/* Top Navigation Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        connected={connected}
        walletStatus={walletStatus}
        onOpenWalletModal={() => setShowWalletModal(true)}
      />

      {/* Main Content Area with Sidebar */}
      <div className="flex-1 overflow-hidden flex p-4 md:p-6 gap-6">
        {/* Minimal Left Icon Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenHelp={() => setShowHelpModal(true)}
        />

        {/* Dynamic Tab Body (Scrollable) */}
        <main className="flex-1 overflow-y-auto custom-scrollbar pr-1">
          {activeTab === 'overview' && (
            <OverviewTab
              events={events}
              stats={stats}
              walletStatus={walletStatus}
              setActiveTab={setActiveTab}
              onSelectEvent={(ev) => setSelectedEvent(ev)}
              onRunQuickCheck={handleRunQuickCheck}
              runningCheck={runningQuickCheck}
            />
          )}

          {activeTab === 'activity' && (
            <ActivityTab
              events={events}
              onSelectEvent={(ev) => setSelectedEvent(ev)}
            />
          )}

          {activeTab === 'protection' && (
            <ProtectionTab serverUrl={SERVER_URL} />
          )}

          {activeTab === 'payments' && (
            <PaymentsTab />
          )}

          {activeTab === 'sla' && (
            <SlaMonitorTab />
          )}

          {activeTab === 'demo' && (
            <DemoRunnerTab serverUrl={SERVER_URL} />
          )}
        </main>
      </div>

      {/* Modals */}
      {selectedEvent && (
        <TransactionModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}

      {showWalletModal && (
        <WalletModal
          walletStatus={walletStatus}
          onClose={() => setShowWalletModal(false)}
        />
      )}

      {showHelpModal && (
        <HelpModal onClose={() => setShowHelpModal(false)} />
      )}
    </div>
  );
}

export default App;
