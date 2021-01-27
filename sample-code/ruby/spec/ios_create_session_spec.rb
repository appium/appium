require 'spec_helper'
require 'appium_lib_core'

describe 'Create session' do
  it 'should create and destroy IOS sessions' do
    @driver = Appium::Core.for(ios_caps).start_driver

    application_element = @driver.find_element :class_name, 'XCUIElementTypeApplication'
    application_name = application_element.attribute :name
    expect(application_name).to eq 'TestApp'

    @driver.quit
    expect {
      application_element.attribute :name
    }.to raise_error(Selenium::WebDriver::Error::InvalidSessionIdError,
                     'A session is either terminated or not started')
  end
end
