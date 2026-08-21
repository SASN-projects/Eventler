module.exports = {
  apps: [
    {
      name: 'backend',
      script: 'dist/main.js',
      cwd: __dirname + '/backend',
    },
    {
      name: 'frontend',
      script: 'node_modules/vite/bin/vite.js',
      args: 'preview',
      cwd: __dirname + '/frontend',
    },
  ],
};
