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
    app:           APP_PATH,
    automationName: 'XCUITest',
  },
  appium_lib: {
    sauce_username:   ENV['SAUCE_LABS'] ? ENV['SAUCE_USERNAME'] : nil,
    sauce_access_key: ENV['SAUCE_LABS'] ? ENV['SAUCE_ACCESS_KEY'] : nil,
    wait: 60
  }
}

describe 'Create session' do
  it 'should create and destroy IOS sessions' do
    @driver = Appium::Driver.new(desired_caps, true).start_driver

    @application_element = @driver.find_element(:class_name, 'XCUIElementTypeApplication')
    @application_name = @application_element.attribute(:name)
    expect(@application_name).to eq('TestApp')

    @driver.quit
  end
end