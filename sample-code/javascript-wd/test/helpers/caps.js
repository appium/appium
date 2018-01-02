import path from 'path';

const iosCaps = {
  platformName: 'iOS',
  deviceName: 'iPhone SE' || process.env.IOS_DEVICE_NAME,
  platformVersion: '11.2' || process.env.IOS_PLATFORM_VERSION,
  app: undefined, // Will be added in tests
};

const serverConfig = {
  host: process.env.APPIUM_HOST || 'localhost',
  port: process.env.APPIUM_PORT || 4723
};

export { iosCaps, serverConfig };