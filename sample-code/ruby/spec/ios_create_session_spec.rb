require 'spec_helper'

desired_caps = {
  caps: {
    platformName:  'iOS',
    platformVersion: ENV["IOS_PLATFORM_VERSION"] || '11.4',
    deviceName:    ENV["IOS_DEVICE_NAME"] || 'iPhone 6s',
    app:           IOS_APP,
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
    @driver = Appium::Driver.new(desired_caps, false).start_driver

    application_element = @driver.find_element :class_name, 'XCUIElementTypeApplication'
    application_name = application_element.attribute :name
    expect(application_name).to eq 'TestApp'

    @driver.quit
    expect { application_element.attribute :name }.to raise_error(Selenium::WebDriver::Error::InvalidSessionIdError, 'A session is either terminated or not started')
  end
end
