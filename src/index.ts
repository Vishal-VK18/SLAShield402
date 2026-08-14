import { serve } from '@hono/node-server';
import { app } from './server.js';

const PORT = 3000;

console.log(`🚀 SLAShield402 Firewall Server running on http://localhost:${PORT}`);

serve({
  fetch: app.fetch,
  port: PORT,
});