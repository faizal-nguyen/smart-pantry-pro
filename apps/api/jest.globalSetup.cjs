const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

module.exports = async () => {
  const baseDir = __dirname; // apps/api
  const apiPath = path.join(baseDir, 'dist', 'index.js');
  const pidFile = path.join(baseDir, '.jest-api.pid');
  const logFile = path.join(baseDir, '.jest-api.log');

  if (!fs.existsSync(apiPath)) {
    throw new Error(
      `[jest globalSetup] API bundle not found at ${apiPath}. Run \`npm run api:build:ts\` first.`
    );
  }

  // PRP-220.05: pipe stdio to a log file so a silently-failing boot
  // surfaces as test failures instead of a 5s hang. pino-pretty is
  // currently broken on Node 24, so we force LOG_PRETTY_PRINT=false to
  // avoid the silent hang it causes.
  const out = fs.openSync(logFile, 'w');
  const proc = spawn('node', [apiPath], {
    stdio: ['ignore', out, out],
    env: {
      ...process.env,
      PORT: process.env.PORT || '4000',
      LOG_PRETTY_PRINT: 'false',
      NODE_ENV: process.env.NODE_ENV || 'test',
    },
    detached: false,
  });
  fs.writeFileSync(pidFile, String(proc.pid));

  // Wait for /api/health to respond (max 8s)
  const deadline = Date.now() + 8000;
  let ready = false;
  await new Promise((resolve) => {
    const tick = () => {
      if (Date.now() > deadline) return resolve();
      const req = http.get('http://localhost:4000/api/health', (res) => {
        if (res.statusCode === 200) {
          ready = true;
          return resolve();
        }
        setTimeout(tick, 150);
      });
      req.on('error', () => setTimeout(tick, 150));
    };
    tick();
  });

  if (!ready) {
    const log = fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8') : '(no log)';
    throw new Error(
      `[jest globalSetup] API did not become ready on :4000 within 8s.\n` +
      `Last server output:\n${log}`
    );
  }
};

