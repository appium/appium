require 'rubygems'
require 'appium_lib'
require 'test/unit'
extend Test::Unit::Assertions

APP_PATH = '../apps/TestApp.app.zip'

desired_caps = {
  caps: {
    platformName:  'iOS',
    platformVersion: ENV["IOS_PLATFORM_VERSION"] || '11.1',
    deviceName:    ENV["IOS_DEVICE_NAME"] || 'iPhone 6s',
    app:           APP_PATH,
    automationName: 'XCUITest',
  },
  appium_lib: {
    sauce_username:   nil, # TODO: Make Sauce option
    sauce_access_key: nil,
    wait: 60
  }
}

# Start the driver
describe "IOS Basic Interactions" do
  before do
    @driver = Appium::Driver.new(desired_caps, true).start_driver
  end

  it "should send keys to inputs" do
    @textFieldEl = @driver.find_element(:id, "TextField1")
    expect(@textFieldEl.attribute(:value)).to be_nil
    @textFieldEl.send_keys("Hello World!")
    expect(@textFieldEl.attribute(:value)).to eq("Hello World!")
  end
end
