/**
 * FORGE Signaling Server — PM2 Production Process Configuration
 * Usage:
 *   pm2 start deploy/ecosystem.config.cjs
 *   pm2 save
 *   pm2 startup
 */
module.exports = {
  apps: [
    {
      name: 'forge-signaling',
      script: 'packages/collaboration/bin/signaling-server.cjs',
      instances: 1, // Full-mesh WebRTC signaling uses in-memory topic routing; keep 1 instance or use sticky sessions
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '350M',
      env_production: {
        NODE_ENV: 'production',
        PORT: 4444,
        HOST: '127.0.0.1', // Bind to localhost; Nginx/Caddy proxies public traffic with SSL termination
      },
      restart_delay: 2000,
      min_uptime: '5s',
      max_restarts: 10,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/forge/signaling-error.log',
      out_file: '/var/log/forge/signaling-out.log',
      merge_logs: true,
    },
  ],
};

