require 'rubygems'
require 'appium_lib'
require 'test/unit'
extend Test::Unit::Assertions

PACKAGE = 'io.appium.android.apis'
SEARCH_ACTIVITY = '.app.SearchInvoke'
ALERT_DIALOG_ACTIVITY = '.app.AlertDialogSamples'

APP_PATH = ENV['SAUCE_LABS'] ? 'http://appium.github.io/appium/assets/ApiDemos-debug.apk' : '../apps/ApiDemos-debug.apk'

desired_caps = {
  caps: {
    platformName:  'Android',
    platformVersion: ENV['SAUCE_LABS'] ? (ENV["ANDROID_PLATFORM_VERSION"] || '7.1') : ENV["ANDROID_PLATFORM_VERSION"],
    deviceName:    ENV["ANDROID_DEVICE_VERSION"] || 'Android',
    app:           APP_PATH,
    automationName: 'UIAutomator2'
  },
  appium_lib: {
    sauce_username:   ENV['SAUCE_LABS'] ? ENV['SAUCE_USERNAME'] : nil,
    sauce_access_key: ENV['SAUCE_LABS'] ? ENV['SAUCE_ACCESS_KEY'] : nil,
    wait: 60
  }
}

describe 'Basic Android selectors' do

  before(:all) do
    @driver = Appium::Driver.new(desired_caps, true).start_driver
  end

  after(:all) do
    @driver.quit
  end

  it 'should find elements by Accessibility ID' do
    @search_parameters_element = @driver.find_elements(:accessibility_id, 'Content')
    expect(@search_parameters_element.length).to eql 1
  end

  it 'should find elements by ID' do
    @action_bar_container_elements = @driver.find_elements(:id, 'android:id/action_bar_container')
    expect(@action_bar_container_elements.length).to eql 1
  end

  it 'should find elements by class name' do
    @linear_layout_elements = @driver.find_elements(:class_name, 'android.widget.FrameLayout')
    expect(@linear_layout_elements.length).to be > 1
  end

  it 'should find elements by XPath' do
    @linear_layout_elements = @driver.find_elements(:xpath, "//*[@class='android.widget.FrameLayout']")
    expect(@linear_layout_elements.length).to be > 1
  end
end