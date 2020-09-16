module.exports = {
  presets: [
    ['@babel/preset-env', {
      targets: {
        node: 10
      }
    }]
  ],
  plugins: [],
  env: {
    development: {
      sourceMaps: 'inline',
      plugins: ['source-map-support'],
      comments: true
    }
  },
  comments: false
};
