var path = require('path');

var iosCaps = {
  platformName: 'iOS',
  automationName: 'XCUITest',
  deviceName:  process.env.IOS_DEVICE_NAME || 'iPhone 6s',
  platformVersion: process.env.IOS_PLATFORM_VERSION || '11.1',
  app: undefined, // Will be added in tests
};

// Leave the Android platformVersion blank and set deviceName to a random string (Android deviceName is ignored by Appium but is still required)
// If we're using SauceLabs, set the Android deviceName and platformVersion to the latest supported SauceLabs device and version
var DEFAULT_ANDROID_DEVICE_NAME = process.env.SAUCE ? 'Android GoogleAPI Emulator' : 'My Android Device';
var DEFAULT_ANDROID_PLATFORM_VERSION = process.env.SAUCE ? '7.1' : null;

var androidCaps = {
  platformName: 'Android',
  automationName: 'UiAutomator2',
  deviceName: process.env.ANDROID_DEVICE_NAME || DEFAULT_ANDROID_DEVICE_NAME,
  platformVersion: process.env.ANDROID_PLATFORM_VERSION || DEFAULT_ANDROID_PLATFORM_VERSION,
  app: undefined, // Will be added in tests
};

var serverConfig = {
  host: process.env.APPIUM_HOST || 'localhost',
  port: process.env.APPIUM_PORT || 4723,
  logLevel: 'verbose'
};

var androidOptions = Object.assign({
  desiredCapabilities: androidCaps
}, serverConfig);

var iosOptions = Object.assign({
  desiredCapabilities: iosCaps
}, serverConfig);

module.exports = { androidOptions, iosOptions };