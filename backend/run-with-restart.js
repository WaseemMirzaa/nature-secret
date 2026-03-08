/**
 * Wrapper that runs dist/main.js and restarts it on crash (no restart limit).
 * Use for production when PM2 is not available (e.g. Hostinger managed Node).
 * Start with: node run-with-restart.js
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const RESTART_DELAY_MS = 3000;
const mainPath = path.join(__dirname, 'dist', 'main.js');

if (!fs.existsSync(mainPath)) {
  console.error('[run-with-restart] dist/main.js not found. Run: npm run build');
  process.exit(0);
}

function run() {
  const env = { ...process.env, NODE_ENV: process.env.NODE_ENV || 'production' };
  const child = spawn(process.execPath, [mainPath], {
    stdio: 'inherit',
    cwd: __dirname,
    env,
  });

  child.on('exit', (code, signal) => {
    console.error(`API exited with ${code != null ? code : signal}. Restarting in ${RESTART_DELAY_MS / 1000}s...`);
    setTimeout(run, RESTART_DELAY_MS);
  });
}

run();
