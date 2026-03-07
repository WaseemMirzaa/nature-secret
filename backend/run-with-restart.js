/**
 * Wrapper that runs dist/main.js and restarts it on crash.
 * Use for production when PM2 is not available (e.g. Hostinger managed Node).
 * Start with: node run-with-restart.js
 */
const { spawn } = require('child_process');
const path = require('path');

const RESTART_DELAY_MS = 3000;
const MAX_RESTARTS_IN_WINDOW = 5;
const WINDOW_MS = 30000;

let restartCount = 0;
let windowStart = Date.now();

function run() {
  const env = { ...process.env, NODE_ENV: process.env.NODE_ENV || 'production' };
  const child = spawn(process.execPath, [path.join(__dirname, 'dist', 'main.js')], {
    stdio: 'inherit',
    cwd: __dirname,
    env,
  });

  child.on('exit', (code, signal) => {
    const now = Date.now();
    if (now - windowStart > WINDOW_MS) {
      windowStart = now;
      restartCount = 0;
    }
    restartCount++;
    if (restartCount > MAX_RESTARTS_IN_WINDOW) {
      console.error('Too many restarts in short time. Exiting.');
      process.exit(1);
    }
    console.error(`API exited with ${code != null ? code : signal}. Restarting in ${RESTART_DELAY_MS / 1000}s...`);
    setTimeout(run, RESTART_DELAY_MS);
  });
}

run();
