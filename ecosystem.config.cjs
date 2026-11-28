module.exports = {
  apps: [
    {
      name: "devmeetup-api",
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
    {
      name: "devmeetup-worker",
      script: "npm",
      args: "run worker",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
