import { serve } from '@hono/node-server';
import { app } from './server.js';
import { eventBus } from './eventBus.js';

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';

const server = serve(
  {
    fetch: app.fetch,
    port: PORT,
    hostname: HOST,
  },
  (info) => {
    console.log(`🚀 SLAShield402 Firewall Server running on http://${info.address}:${info.port}`);
  }
);

eventBus.init(server as any);