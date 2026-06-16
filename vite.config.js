const { resolve } = require('node:path');

module.exports = {
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        drink: resolve(__dirname, 'drink.html'),
      },
    },
  },
};
