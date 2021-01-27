require 'spec_helper'
require 'appium_lib'

describe 'Basic Android selectors' do

  before(:all) do
    @driver = Appium::Driver.new(android_caps, true).start_driver
  end

  after(:all) do
    @driver&.quit
  end

  it 'should find elements by Accessibility ID' do
    search_parameters_element = @driver.find_elements :accessibility_id, 'Content'
    expect(search_parameters_element.length).to eql 1
  end

  it 'should find elements by ID' do
    action_bar_container_elements = @driver.find_elements :id, 'android:id/action_bar_container'
    expect(action_bar_container_elements.length).to eql 1
  end

  it 'should find elements by class name' do
    linear_layout_elements = @driver.find_elements :class_name, 'android.widget.FrameLayout'
    expect(linear_layout_elements.length).to eql 3
  end

  it 'should find elements by XPath' do
    linear_layout_elements = @driver.find_elements :xpath, "//*[@class='android.widget.FrameLayout']"
    expect(linear_layout_elements.length).to eql 3
  end
end
