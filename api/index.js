// Vercel Function: the Express API (apps/api, built to apps/api/dist by the
// buildCommand) answers every /api/* path, routed here by vercel.json.
// apps/api/src/index.ts stays the entry for local dev and jest (listen + socket.io).
import { createApp } from '../apps/api/dist/app.js';

export default createApp();
