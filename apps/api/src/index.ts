/**
 * Smart Pantry API - boot script.
 *
 * PRP-220.04: imports the Express app factory from `./app.ts`, then
 * listens on PORT (4000 by default — see apps/api/.env.example).
 *
 * This file has side effects (binds a port, starts a process). For
 * tests or for embedding the app inside another runtime, import
 * `createApp` from `./app.ts` directly. On Vercel, `api/index.js` does
 * that and this file never runs: it serves local development only.
 */
import { createServer } from 'http';
import dotenv from 'dotenv';

import { createApp } from './app.js';

dotenv.config({ path: '.env' });

const app = createApp();
const PORT = Number.parseInt(process.env.PORT ?? '4000', 10);
// All IPv4 interfaces unless HOST is set.
const HOST = process.env.HOST ?? '0.0.0.0';

const httpServer = createServer(app);

httpServer.listen(PORT, HOST, () => {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 Smart Pantry API operational');
  console.log(`🌐 http://${HOST}:${PORT}`);
  console.log(`📊 Health:    http://${HOST}:${PORT}/api/health`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
});
