module.exports = {
  apps: [
    {
      name: 'nepse-api',
      script: 'src/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: 'false',
        PUPPETEER_EXECUTABLE_PATH: '/usr/bin/google-chrome-stable'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: 'false',
        PUPPETEER_EXECUTABLE_PATH: '/usr/bin/google-chrome-stable'
      },
      error_file: './logs/api-err.log',
      out_file: './logs/api-out.log',
      log_file: './logs/api-combined.log',
      time: true,
      watch: false,
      max_memory_restart: '512M',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      kill_timeout: 5000,
      exp_backoff_restart_delay: 100,
      // Limit memory usage
      node_args: '--max-old-space-size=384'
    }
    // Note: Scheduler is now integrated into the server and auto-starts on boot
    // No separate scheduler process needed
  ]
};