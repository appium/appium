require 'spec_helper'
require 'appium_lib'

describe 'Create Chrome web session' do
  it 'should create and destroy Android browser session' do
    caps = android_caps
    caps[:caps][:browserName] = :chrome
    @driver = Appium::Driver.new(caps, true).start_driver

    @driver.get('https://www.google.com')

    @page_title = @driver.title
    expect(@page_title).to eql 'Google'

    @driver.quit
    expect {
      @driver.title
    }.to raise_error(Selenium::WebDriver::Error::InvalidSessionIdError,
                     'A session is either terminated or not started')
  end
end
