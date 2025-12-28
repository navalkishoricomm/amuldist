module.exports = {
  apps: [
    {
      name: 'amul-dist-server',
      script: 'server/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 4000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 80, // Running on port 80 requires sudo/authbind, otherwise use 4000 and nginx
        MONGODB_URI: process.env.MONGODB_URI,
        JWT_SECRET: process.env.JWT_SECRET
      }
    }
  ]
};
