require 'spec_helper'

desired_caps = {
  caps: {
    platformName:  'iOS',
    platformVersion: ENV["IOS_PLATFORM_VERSION"] || '14.2',
    deviceName:    ENV["IOS_DEVICE_NAME"] || 'iPhone 12',
    automationName: 'XCUITest',
    browserName: 'Safari',
  },
  appium_lib: {
    wait: 60
  }
}

describe 'Create Safari session' do
  it 'should create and destroy IOS Safari session' do
    @driver = Appium::Core.for(desired_caps).start_driver

    @driver.get 'https://www.google.com'
    expect(@driver.title).to eq 'Google'

    @driver.quit
    expect {
      @driver.title
    }.to raise_error(Selenium::WebDriver::Error::InvalidSessionIdError,
                     'A session is either terminated or not started')
  end
end
