const appiumConfig = require('eslint-config-appium');
Object.assign(appiumConfig.parserOptions, {
  babelOptions: {
    plugins: [
      '@babel/plugin-proposal-class-properties'
    ]
  }
});

module.exports = Object.assign({}, appiumConfig, {
  root: true,
  ignorePatterns: ['node_modules', 'packages/*/node_modules', 'packages/*/build']
});
