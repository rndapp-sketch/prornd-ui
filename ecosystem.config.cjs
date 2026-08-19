module.exports = {
  apps: [
    {
      name: "prornd-ui-mythos_fable_v0.8",
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
    }
  ]
};

// git clone -b mythos_fable_v0.8 --single-branch https://github.com/rndapp-sketch/prornd-ui.git