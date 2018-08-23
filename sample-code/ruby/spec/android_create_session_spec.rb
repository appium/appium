require 'spec_helper'

desired_caps = {
  caps: {
    platformName:  'Android',
    platformVersion: ENV['SAUCE_LABS'] ? (ENV["ANDROID_PLATFORM_VERSION"] || '7.1') : ENV["ANDROID_PLATFORM_VERSION"],
    deviceName:    ENV["ANDROID_DEVICE_VERSION"] || 'Android',
    app:           ANDROID_APP,
    automationName: 'UIAutomator2',
  },
  appium_lib: {
    sauce_username:   ENV['SAUCE_LABS'] ? ENV['SAUCE_USERNAME'] : nil,
    sauce_access_key: ENV['SAUCE_LABS'] ? ENV['SAUCE_ACCESS_KEY'] : nil,
    wait: 60
  }
}

describe 'Create Android session' do
  it 'should create and destroy Android sessions' do
    @driver = Appium::Driver.new(desired_caps, true).start_driver

    @activity = @driver.current_activity
    @pkg = @driver.current_package
    expect("#{@pkg}#{@activity}").to eql 'io.appium.android.apis.ApiDemos'

    @driver.quit
    expect { @driver.current_package }.to raise_error(Selenium::WebDriver::Error::InvalidSessionIdError, 'A session is either terminated or not started')
  end
end
