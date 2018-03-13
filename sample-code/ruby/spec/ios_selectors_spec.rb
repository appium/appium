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
describe 'Basic IOS selectors' do

  before(:all) do
    @driver = Appium::Driver.new(desired_caps, true).start_driver
  end

  after(:all) do
    @driver.quit
  end

  it 'should find elements by Accessibility ID' do
    @compute_sum_buttons = @driver.find_elements(:accessibility_id, 'ComputeSumButton')
    expect(@compute_sum_buttons.length).to eql(1)
    @compute_sum_buttons[0].click()
  end

  it 'should find elements by class name' do
    @window_elements = @driver.find_elements(:class_name, 'XCUIElementTypeWindow')
    expect(@window_elements.length).to be > 1
  end

  it 'should find elements by NSPredicateString' do
    @all_visible_elements = @driver.find_elements(:predicate, 'visible = 1')
    expect(@all_visible_elements.length).to be > 1
  end

  it 'should find elements by class chain' do
    @window_element = @driver.find_elements(:class_chain, 'XCUIElementTypeWindow[1]/*[2]')
    expect(@window_element.length).to be(1)
  end

  it 'should find elements by XPath' do
    @buttons = @driver.find_elements(:xpath, '//XCUIElementTypeWindow//XCUIElementTypeButton')
    expect(@buttons.length).to be > 1
  end
end