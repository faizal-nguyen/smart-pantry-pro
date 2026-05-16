const { accessSync, constants, existsSync } = require('node:fs');
const { spawnSync } = require('node:child_process');

const isCi = process.env.CI === 'true' || process.env.VERCEL === '1';
const hasGitCheckout = existsSync('.git');

function canWriteGitConfig() {
  try {
    accessSync('.git/config', constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

if (isCi || !hasGitCheckout || !canWriteGitConfig()) {
  console.log('[prepare] Skipping Husky install outside local git development.');
  process.exit(0);
}

const result = spawnSync('husky', {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (result.error) {
  if (result.error.code === 'ENOENT') {
    console.log('[prepare] Husky is not installed; skipping git hook setup.');
    process.exit(0);
  }

  throw result.error;
}

process.exit(result.status ?? 0);
