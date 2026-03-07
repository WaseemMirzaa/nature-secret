/**
 * Wrapper that runs the Next.js standalone server and restarts it on crash.
 * Use for production when PM2 is not available (e.g. Hostinger).
 * Start with: node run-with-restart.js (after npm run build)
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const RESTART_DELAY_MS = 3000;
const MAX_RESTARTS_IN_WINDOW = 5;
const WINDOW_MS = 30000;

const standaloneDir = path.join(__dirname, '.next', 'standalone');
const serverPath = path.join(standaloneDir, 'server.js');

let restartCount = 0;
let windowStart = Date.now();

function run() {
  if (!fs.existsSync(serverPath)) {
    console.error('Standalone server not found. Run: npm run build');
    process.exit(1);
  }
  const child = spawn(process.execPath, ['server.js'], {
    stdio: 'inherit',
    cwd: standaloneDir,
    env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'production' },
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
    console.error(`Frontend exited with ${code != null ? code : signal}. Restarting in ${RESTART_DELAY_MS / 1000}s...`);
    setTimeout(run, RESTART_DELAY_MS);
  });
}

run();
