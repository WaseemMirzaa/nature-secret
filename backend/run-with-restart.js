/**
 * Wrapper that runs dist/main.js and restarts it on crash (no restart limit).
 * Use for production when PM2 is not available (e.g. Hostinger managed Node).
 * Start with: node run-with-restart.js
 */
const { spawn } = require('child_process');
const path = require('path');

const RESTART_DELAY_MS = 3000;

function run() {
  const env = { ...process.env, NODE_ENV: process.env.NODE_ENV || 'production' };
  const child = spawn(process.execPath, [path.join(__dirname, 'dist', 'main.js')], {
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
