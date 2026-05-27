module.exports = {
  apps: [
    {
      name: "prornd-ui-mythos_omni_v0.3",
      script: "npm",
      args: "run dev",
      cwd: "/home/prornd/Projects/mythos_omni_v0.3/prornd-ui",
      interpreter: "none",
      env: {
        NODE_ENV: "development",
        PORT: 8081
      }
    }
  ]
};
