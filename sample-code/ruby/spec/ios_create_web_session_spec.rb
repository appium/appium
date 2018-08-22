require 'spec_helper'

desired_caps = {
  caps: {
    platformName:  'iOS',
    platformVersion: ENV["IOS_PLATFORM_VERSION"] || '10.3',
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
    @driver = Appium::Driver.new(desired_caps, false).start_driver

    @driver.get 'https://www.google.com'
    expect(@driver.title).to eql 'Google'

    @driver.quit
    expect { @driver.title }.to raise_error(Selenium::WebDriver::Error::InvalidSessionIdError, 'A session is either terminated or not started')
  end
end
