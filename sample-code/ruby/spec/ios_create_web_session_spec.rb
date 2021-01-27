require 'spec_helper'
require 'appium_lib_core'

describe 'Create Safari session' do
  it 'should create and destroy IOS Safari session' do
    caps = ios_caps
    caps[:caps][:browserName] = :safari
    @driver = Appium::Core.for(caps).start_driver

    @driver.get 'https://www.google.com'
    expect(@driver.title).to eq 'Google'

    @driver.quit
    expect {
      @driver.title
    }.to raise_error(Selenium::WebDriver::Error::InvalidSessionIdError,
                     'A session is either terminated or not started')
  end
end
