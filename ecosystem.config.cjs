module.exports = {
  apps: [
    {
      name: "prod",
      script: "./deploy-prod.sh",
      // Resolved relative to this config file's own location, so it works
      // regardless of which machine/user path this repo is checked out to
      // (was previously hardcoded to a specific server's path).
      cwd: __dirname,
      interpreter: "bash",
      env: {
        NODE_ENV: "production",
        PORT: 8081
      }
    },
    {
      // Runs the Vite dev server (with HMR) under PM2. Both apps use port
      // 8081, so only run one at a time: `pm2 start ecosystem.config.cjs
      // --only dev` or `--only prod`. --mode development picks up .env
      // (VITE_BASE_PATH=/dev).
      name: "dev",
      script: "npm",
      args: "run dev -- --mode development --port 8081 --host 0.0.0.0",
      cwd: __dirname,
      env: {
        NODE_ENV: "development",
        PORT: 8081
      }
    }
  ]
};

// git clone -b pragati_v0.01 --single-branch https://github.com/rndapp-sketch/prornd-ui.git