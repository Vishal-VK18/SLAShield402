import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { shieldCheckRoute } from './routes/shieldCheck.js';
import { slashieldX402Config } from './x402/config.js';

export const app = new Hono();

// Production-aware self URL for root info endpoint
const SELF_BASE_URL = process.env.SELF_BASE_URL
  || process.env.RENDER_SERVICE_URL
  || (process.env.NODE_ENV === 'production'
      ? 'https://slashield402-api.onrender.com'
      : `http://localhost:${process.env.PORT || 3000}`);

const SELF_WS_URL = SELF_BASE_URL.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:') + '/ws';

// Enable CORS for dashboard and external clients
app.use('*', cors({
  origin: ['https://slashield402-dashboard.onrender.com', 'http://localhost:5173', '*'],
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
      ws: SELF_WS_URL,
    },
  });
});

// Explicit health check endpoint for cloud orchestrators (Render / Railway / k8s)
app.get('/health', (c) => {
  return c.json({
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});