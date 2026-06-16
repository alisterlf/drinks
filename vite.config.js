const { resolve } = require('node:path');

module.exports = {
  base: '/drinks/',
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        drink: resolve(__dirname, 'drink.html'),
        ingredients: resolve(__dirname, 'ingredients.html'),
      },
    },
  },
};
