/**
 * PM2 ecosystem file for Nature Secret.
 * Use from repo root: pm2 start ecosystem.config.cjs
 *
 * On Hostinger: run only the app(s) you host on that server.
 * - API server (shifaefitrat.com): pm2 start ecosystem.config.cjs --only nature-secret-api
 * - Frontend (naturesecret.pk):     pm2 start ecosystem.config.cjs --only nature-secret-web
 */

const path = require('path');

const repoRoot = path.resolve(__dirname);
const backendDir = path.join(repoRoot, 'backend');

module.exports = {
  apps: [
    {
      name: 'nature-secret-api',
      cwd: backendDir,
      script: 'dist/main.js',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.API_PORT || 4000,
      },
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '500M',
    },
    {
      name: 'nature-secret-web',
      cwd: repoRoot,
      script: './node_modules/next/dist/bin/next',
      args: ['start', '-p', process.env.WEB_PORT || 3000],
      interpreter: 'node',
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '500M',
    },
  ],
};
