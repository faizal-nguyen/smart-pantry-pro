/**
 * Smart Pantry API - boot script.
 *
 * PRP-220.04: imports the Express app factory from `./app.ts`,
 * wires the WebSocket realtime service, then listens on PORT (4000 by
 * default — see apps/api/.env.example).
 *
 * This file has side effects (binds a port, starts a process). For
 * tests or for embedding the app inside another runtime, import
 * `createApp` from `./app.ts` directly.
 */
import { createServer } from 'http';
import dotenv from 'dotenv';

import { createApp } from './app.js';

dotenv.config({ path: '.env' });

// WebSocket realtime service is optional: load lazily so a broken
// socket.io install (transitive peer-dep mismatch) cannot prevent the
// HTTP API from starting. The /api/realtime/status endpoint reflects
// whether the realtime layer actually came up.
let realtimeReady = false;
let realtimeConnected = () => 0;

const app = createApp({
  realtimeStatus: () => ({
    enabled: realtimeReady,
    connectedClients: realtimeConnected(),
  }),
});
const PORT = Number.parseInt(process.env.PORT ?? '4000', 10);
// Render's port detector hits IPv4 0.0.0.0 — when we let Node pick the
// default it may bind to `::` (IPv6) and the scanner times out (cf.
// `==> Port scan timeout reached` on Render after 2026-05-22 Node 24
// upgrade). Force IPv4 unless explicitly overridden via HOST env var.
// See https://render.com/docs/web-services#port-binding
const HOST = process.env.HOST ?? '0.0.0.0';

const httpServer = createServer(app);

import('./services/websocket/realtimeService.js')
  .then(({ realtimeService }) => {
    realtimeService.initialize(httpServer);
    realtimeConnected = () => realtimeService.getConnectedUsersCount();
    realtimeReady = true;
    console.log('✓ WebSocket realtime service initialised');
  })
  .catch((error) => {
    console.error('✗ WebSocket realtime service failed to load:', error?.message ?? error);
    console.warn('⚠️  HTTP API continues without realtime support.');
  });

httpServer.listen(PORT, HOST, () => {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 Smart Pantry API operational');
  console.log(`🌐 http://${HOST}:${PORT}`);
  console.log(`📊 Health:    http://${HOST}:${PORT}/api/health`);
  console.log(`🔌 WebSocket: ws://${HOST}:${PORT}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
});
