require 'rubygems'
require 'appium_lib'

APP_PATH = '../apps/TestApp.app.zip'

desired_caps = {
  caps: {
    platformName:  'iOS',
    platformVersion: ENV["IOS_PLATFORM_VERSION"] || '11.1',
    deviceName:    ENV["IOS_DEVICE_NAME"] || 'iPhone 6s',
    app:           APP_PATH,
    automationName: 'XCUITest',
  },
  appium_lib: {
    sauce_username:   nil, # TODO: Make Sauce option
    sauce_access_key: nil,
    wait: 60
  }
}

# Start the driver
Appium::Driver.new(desired_caps, true).start_driver
