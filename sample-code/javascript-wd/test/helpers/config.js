import path from 'path';


const SAUCE_TESTING = process.env.SAUCE_LABS;
const SAUCE_USERNAME = process.env.SAUCE_USERNAME;
const SAUCE_ACCESS_KEY = process.env.SAUCE_ACCESS_KEY;

const iosCaps = {
  platformName: 'iOS',
  automationName: 'XCUITest',
  deviceName: process.env.IOS_DEVICE_NAME || 'iPhone 6',
  platformVersion: process.env.IOS_PLATFORM_VERSION || '12.2',
  app: undefined, // Will be added in tests
  appiumVersion: '1.12.1',
};

// Leave the Android platformVersion blank and set deviceName to a random string
// (Android deviceName is ignored by Appium but is still required)
// If we're using SauceLabs, set the Android deviceName and platformVersion to
// the latest supported SauceLabs device and version
const DEFAULT_ANDROID_DEVICE_NAME = process.env.SAUCE_LABS ? 'Android GoogleAPI Emulator' : 'My Android Device';
const DEFAULT_ANDROID_PLATFORM_VERSION = process.env.SAUCE_LABS ? '7.1' : null;

const androidCaps = {
  platformName: 'Android',
  automationName: 'UiAutomator2',
  deviceName: process.env.ANDROID_DEVICE_NAME || DEFAULT_ANDROID_DEVICE_NAME,
  platformVersion: process.env.ANDROID_PLATFORM_VERSION || DEFAULT_ANDROID_PLATFORM_VERSION,
  app: undefined, // Will be added in tests
};

const serverConfig = process.env.SAUCE_LABS
  ? {
    host: 'ondemand.saucelabs.com',
    port: 80
  }
  : {
    host: process.env.APPIUM_HOST || 'localhost',
    port: process.env.APPIUM_PORT || 4723
  };


const GITHUB_ASSET_BASE = 'http://appium.github.io/appium/assets';
const LOCAL_ASSET_BASE = path.resolve(__dirname, '..', '..', '..', 'apps');

let iosTestApp, androidApiDemos;
if (SAUCE_TESTING) {
  // TODO: Change thes URLs to updated locations
  iosTestApp = `${GITHUB_ASSET_BASE}/TestApp7.1.app.zip`;
  androidApiDemos = `${GITHUB_ASSET_BASE}/ApiDemos-debug.apk`;
} else {
  iosTestApp = path.resolve(LOCAL_ASSET_BASE, 'TestApp.app.zip');
  androidApiDemos = path.resolve(LOCAL_ASSET_BASE, 'ApiDemos-debug.apk');
}

export {
  iosTestApp, androidApiDemos, iosCaps, androidCaps, serverConfig,
  SAUCE_TESTING, SAUCE_USERNAME, SAUCE_ACCESS_KEY,
};
