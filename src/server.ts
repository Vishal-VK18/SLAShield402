import { Hono } from 'hono';
import { shieldCheckRoute } from './routes/shieldCheck.js';

export const app = new Hono();

// Healthcheck route
app.get('/', (c) => c.text('SLAShield402 Person 1 Firewall API Active 🛡️'));

// Mount routes
app.route('/', shieldCheckRoute);