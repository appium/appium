const {baseConfig} = require('@appium/docutils');

const lang = process.env.APPIUM_DOCS_LANG || 'en';

const config = {...baseConfig};
config.opts.source.include = [];
config.opts.tutorials = `./docs/${lang}`;
config.opts.readme = `${config.opts.tutorials}/README.md`;

module.exports = config;
