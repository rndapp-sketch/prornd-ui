module.exports = {
  apps: [
    {
      name: "prornd-ui",
      script: "npm",
      args: "run dev",
      cwd: "/home/prornd/prornd-ui/prornd-ui",
      interpreter: "none",
      env: {
        NODE_ENV: "development",
        PORT: 8081
      }
    }
  ]
};
