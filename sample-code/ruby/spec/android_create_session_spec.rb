require 'spec_helper'
require 'appium_lib'

describe 'Create Android session' do
  it 'should create and destroy Android sessions' do
    @driver = Appium::Driver.new(android_caps, true).start_driver

    @activity = @driver.current_activity
    @pkg = @driver.current_package
    expect("#{@pkg}#{@activity}").to eql 'io.appium.android.apis.ApiDemos'

    @driver.quit
    expect { @driver.current_package }.to raise_error(Selenium::WebDriver::Error::InvalidSessionIdError, 'A session is either terminated or not started')
  end
end
