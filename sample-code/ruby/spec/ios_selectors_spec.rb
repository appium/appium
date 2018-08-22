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
describe 'Basic IOS selectors' do

  before(:all) do
    @driver = Appium::Driver.new(desired_caps, true).start_driver
  end

  after(:all) do
    @driver.quit
  end

  it 'should find elements by Accessibility ID' do
    compute_sum_buttons = @driver.find_elements :accessibility_id, 'ComputeSumButton'
    expect(compute_sum_buttons.length).to eql 1
  end

  it 'should find elements by class name' do
    window_elements = @driver.find_elements :class_name, 'XCUIElementTypeWindow'
    expect(window_elements.length).to eql 2
  end

  it 'should find elements by NSPredicateString' do
    all_visible_elements = @driver.find_elements :predicate, 'visible = 1'
    expect(all_visible_elements.length).to eql 27
  end

  it 'should find elements by class chain' do
    window_element = @driver.find_elements :class_chain, 'XCUIElementTypeWindow[1]/*[2]'
    expect(window_element.length).to eql 1
  end

  it 'should find elements by XPath' do
    buttons = @driver.find_elements :xpath, '//XCUIElementTypeWindow//XCUIElementTypeButton'
    expect(buttons.length).to eql 8
  end
end
