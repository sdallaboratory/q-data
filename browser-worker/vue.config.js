const { defineConfig } = require('@vue/cli-service');

module.exports = defineConfig({
  transpileDependencies: true,
  // TODO: Move to global constants
  publicPath: '/browser-worker/'
});
