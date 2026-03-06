#!/usr/bin/env node
/**
 * Build then start the server in background and exit, so the deploy step "completes".
 * Use as Hostinger Start/Deploy command: node server.js
 */
const { execSync, spawn } = require('child_process');
const path = require('path');

console.log('Building...');
execSync('node ./node_modules/@nestjs/cli/bin/nest.js build', {
  stdio: 'inherit',
  cwd: __dirname,
});
console.log('Build done. Starting server in background...');
const child = spawn('node', [path.join(__dirname, 'dist', 'main.js')], {
  cwd: __dirname,
  detached: true,
  stdio: 'ignore',
  env: process.env,
});
child.unref();
console.log('Server started. Deployment complete.');
process.exit(0);
