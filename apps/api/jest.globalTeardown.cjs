const fs = require('fs');
const path = require('path');

module.exports = async () => {
  try {
    const pidFile = path.join(__dirname, '.jest-api.pid');
    if (fs.existsSync(pidFile)) {
      const pid = Number(fs.readFileSync(pidFile, 'utf-8'));
      if (pid) {
        try { process.kill(pid); } catch {}
      }
      fs.rmSync(pidFile, { force: true });
    }
  } catch {}
};

