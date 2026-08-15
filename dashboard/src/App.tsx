import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header.js';
import { StatsStrip } from './components/StatsStrip.js';
import { SendTestRequest } from './components/SendTestRequest.js';
import { LiveEventFeed } from './components/LiveEventFeed.js';
import { TransactionProofPanel } from './components/TransactionProofPanel.js';
import { ShieldEvent, DashboardStats } from './types.js';

const SERVER_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3000/ws';

export function App() {
  const [events, setEvents] = useState<ShieldEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalRequests: 4,
    approvedCount: 3,
    blockedCount: 1,
    settledAmountUsdc: 0.040,
    refundedAmountUsdc: 0.020,
  });

  const wsRef = useRef<WebSocket | null>(null);

  // Connect to WebSocket with reconnect logic
  useEffect(() => {
    let reconnectTimeout: any;

    const connectWebSocket = () => {
      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          setConnected(true);
        };

        ws.onmessage = (message) => {
          try {
            const data = JSON.parse(message.data);

            if (data.type === 'init' && Array.isArray(data.backlog)) {
              setEvents((prev) => {
                const combined = [...data.backlog, ...prev];
                // Remove duplicates based on timestamp + event
                const seen = new Set();
                return combined.filter((ev) => {
                  const key = `${ev.event}-${ev.timestamp}`;
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
                  }
                }

                return {
                  totalRequests: total,
                  approvedCount: approved,
                  blockedCount: blocked,
                  settledAmountUsdc: settled,
                  refundedAmountUsdc: refunded,
                };
              });
            }
          } catch (e) {
            console.error('Error parsing WS message:', e);
          }
        };

        ws.onclose = () => {
          setConnected(false);
          reconnectTimeout = setTimeout(connectWebSocket, 2000);
        };

        ws.onerror = () => {
          setConnected(false);
          ws.close();
        };
      } catch (err) {
        setConnected(false);
        reconnectTimeout = setTimeout(connectWebSocket, 2000);
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) wsRef.current.close();
      clearTimeout(reconnectTimeout);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col selection:bg-black/10">
      <Header connected={connected} eventCount={events.length} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        <StatsStrip stats={stats} />

        <SendTestRequest serverUrl={SERVER_URL} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <LiveEventFeed
              events={events}
              onClear={() => setEvents([])}
            />
          </div>

          <div className="lg:col-span-1">
            <TransactionProofPanel />
          </div>
        </div>
      </main>

      <footer className="w-full py-6 border-t border-black/5 text-center text-xs text-[#86868B]">
        SLAShield402 · Algorand Testnet App #769236555 · x402 AI Agent Payment Firewall
      </footer>
    </div>
  );
}

export default App;
