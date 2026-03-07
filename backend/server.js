/**
 * Single-file start entry for Hostinger or hosts that expect "node server.js".
 * Ensures dist/main.js exists, then runs it. No auto-restart (use npm start for that).
 * Run from backend repo root.
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const mainPath = path.join(__dirname, 'dist', 'main.js');
if (!fs.existsSync(mainPath)) {
  console.error('[server.js] dist/main.js not found. Run: npm run build');
  console.error('[server.js] cwd=', __dirname);
  process.exit(1);
}

const env = { ...process.env, NODE_ENV: process.env.NODE_ENV || 'production' };
const child = spawn(process.execPath, [mainPath], {
  stdio: 'inherit',
  cwd: __dirname,
  env,
});
child.on('exit', (code, signal) => {
  process.exit(code != null ? code : signal ? 1 : 0);
});
