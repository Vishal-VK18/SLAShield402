import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { shieldCheckRoute } from './routes/shieldCheck.js';
import { slashieldX402Config } from './x402/config.js';

export const app = new Hono();

// Enable CORS for dashboard and external clients
app.use('*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization', 'X-Payment-Proof', 'x-payment-proof'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

// Mount API routes
app.route('/', shieldCheckRoute);

// Discovery metadata endpoint (x402 Bazaar compatible)
app.get('/api/discovery', (c) => {
  return c.json(slashieldX402Config);
});

// Root health & metadata endpoint
app.get('/', (c) => {
  return c.json({
    name: 'SLAShield402 Firewall & Gateway API',
    version: '1.0.0',
    network: 'algorand-testnet',
    app_id: 769236555,
    status: 'ONLINE',
    endpoints: {
      check: 'POST /shield/check',
      discovery: 'GET /api/discovery',
      events: 'GET /api/events/recent',
      ws: 'ws://localhost:3000/ws',
    },
  });
});