const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

module.exports = async () => {
  const baseDir = __dirname; // apps/api
  const apiPath = path.join(baseDir, 'dist', 'index.js');
  const pidFile = path.join(baseDir, '.jest-api.pid');

  const proc = spawn('node', [apiPath], { stdio: 'ignore' });
  fs.writeFileSync(pidFile, String(proc.pid));

  // Wait for /api/health to respond (max 5s)
  const deadline = Date.now() + 5000;
  await new Promise((resolve) => {
    const tick = () => {
      if (Date.now() > deadline) return resolve();
      const req = http.get('http://localhost:4000/api/health', (res) => {
        if (res.statusCode === 200) return resolve();
        setTimeout(tick, 150);
      });
      req.on('error', () => setTimeout(tick, 150));
    };
    tick();
  });
};

