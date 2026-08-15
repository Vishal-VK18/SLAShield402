import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'node:http';

export type ShieldEventType =
  | 'request_received'
  | 'challenge_issued'
  | 'payment_verified'
  | 'firewall_decision'
  | 'target_api_response'
  | 'sla_decision'
  | 'settlement_result';

export interface ShieldEvent {
  event: ShieldEventType;
  timestamp: string;
  data: any;
}

class EventBus {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private recentEvents: ShieldEvent[] = [];

  public init(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws) => {
      this.clients.add(ws);

      // Send recent events backlog on connection
      ws.send(
        JSON.stringify({
          type: 'init',
          connected: true,
          backlog: this.recentEvents.slice(-20),
        })
      );

      ws.on('close', () => {
        this.clients.delete(ws);
      });

      ws.on('error', () => {
        this.clients.delete(ws);
      });
    });

    console.log('📡 Real-Time WebSocket Event Bus initialized on /ws');
  }

  public emit(eventType: ShieldEventType, data: any) {
    const payload: ShieldEvent = {
      event: eventType,
      timestamp: new Date().toISOString(),
      data,
    };

    // Keep rolling backlog of 50 events
    this.recentEvents.push(payload);
    if (this.recentEvents.length > 50) {
      this.recentEvents.shift();
    }

    const json = JSON.stringify(payload);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(json);
      }
    }
  }

  public getRecentEvents(): ShieldEvent[] {
    return this.recentEvents;
  }
}

export const eventBus = new EventBus();
