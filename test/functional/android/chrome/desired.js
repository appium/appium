module.exports = {
  browserName: process.env.BROWSER_NAME || 'chrome',
  enablePerformanceLogging: true,
  chromeOptions: {args: ['--disable-translate']}
};
