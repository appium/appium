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

# Start the driver
describe "IOS Basic Interactions" do
  before(:all) do
    @driver = Appium::Driver.new(desired_caps, true).start_driver
  end

  after(:all) do
    @driver.quit
  end

  it "should send keys to inputs" do
    @textFieldEl = @driver.find_element(:id, "TextField1")
    expect(@textFieldEl.attribute(:value)).to be_nil
    @textFieldEl.send_keys("Hello World!")
    expect(@textFieldEl.attribute(:value)).to eq("Hello World!")
  end

  it "should click a button that opens an alert" do
    @buttonElementId = "show alert"
    @buttonElement = @driver.find_element(:accessibility_id, @buttonElementId)
    @buttonElement.click()
    @alertTitleId = "Cool title"
    @alertTitleElement = @driver.find_element(:accessibility_id, @alertTitleId)
    @alertTitle = @alertTitleElement.attribute(:value)
    expect(@alertTitle.attribute(:value)).to eq("Cool title")
  end
end
