require 'rubygems'
require 'appium_lib'
require 'test/unit'
extend Test::Unit::Assertions

APP_PATH = ENV['SAUCE_LABS'] ? 'http://appium.github.io/appium/assets/TestApp7.1.app.zip' : '../apps/TestApp.app.zip'

desired_caps = {
  caps: {
    platformName:  'iOS',
    platformVersion: ENV["IOS_PLATFORM_VERSION"] || '11.1',
    deviceName:    ENV["IOS_DEVICE_NAME"] || 'iPhone 6s',
    automationName: 'XCUITest',
    browserName: 'Safari',
  },
  appium_lib: {
    sauce_username:   ENV['SAUCE_LABS'] ? ENV['SAUCE_USERNAME'] : nil,
    sauce_access_key: ENV['SAUCE_LABS'] ? ENV['SAUCE_ACCESS_KEY'] : nil,
    wait: 60
  }
}

describe 'Create Safari session' do
  it 'should create and destroy IOS Safari session' do
    @driver = Appium::Driver.new(desired_caps, true).start_driver

    @driver.get('https://www.google.com')
    expect(@driver.title).to eql('Google')

    @driver.quit
  end
end