/**
 * Smart Pantry API - boot script.
 *
 * PRP-220.04: imports the Express app factory from `./app.ts`, then
 * listens on PORT (4000 by default — see apps/api/.env.example).
 *
 * This file has side effects (binds a port, starts a process). For
 * tests or for embedding the app inside another runtime, import
 * `createApp` from `./app.ts` directly.
 */
import { createServer } from 'http';
import dotenv from 'dotenv';

import { createApp } from './app.js';

dotenv.config({ path: '.env' });

const app = createApp();
const PORT = Number.parseInt(process.env.PORT ?? '4000', 10);
// Render's port detector hits IPv4 0.0.0.0 — when we let Node pick the
// default it may bind to `::` (IPv6) and the scanner times out (cf.
// `==> Port scan timeout reached` on Render after 2026-05-22 Node 24
// upgrade). Force IPv4 unless explicitly overridden via HOST env var.
// See https://render.com/docs/web-services#port-binding
const HOST = process.env.HOST ?? '0.0.0.0';

const httpServer = createServer(app);

httpServer.listen(PORT, HOST, () => {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 Smart Pantry API operational');
  console.log(`🌐 http://${HOST}:${PORT}`);
  console.log(`📊 Health:    http://${HOST}:${PORT}/api/health`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
});
