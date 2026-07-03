module.exports = {
  apps: [
    {
      name: "prornd-ui-mythos_fable_v0.5",
      script: "npm",
      args: "run dev",
      cwd: "/home/prornd/Projects/mythos_fable_v0.5/prornd-ui",
      interpreter: "none",
      env: {
        NODE_ENV: "development",
        PORT: 8081
      }
    }
  ]
};

// git clone -b mythos_omni_v0.4 --single-branch https://github.com/rndapp-sketch/prornd-ui.gi