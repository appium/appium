require 'spec_helper'
require 'appium_lib_core'

describe 'Basic IOS selectors' do

  before(:all) do
    @driver = Appium::Core.for(ios_caps).start_driver
  end

  after(:all) do
    @driver&.quit
  end

  it 'should find elements by Accessibility ID' do
    compute_sum_buttons = @driver.find_elements :accessibility_id, 'ComputeSumButton'
    expect(compute_sum_buttons.length).to eq 1
  end

  it 'should find elements by class name' do
    window_elements = @driver.find_elements :class_name, 'XCUIElementTypeWindow'
    expect(window_elements.length).to eq 1
  end

  it 'should find elements by NSPredicateString' do
    all_visible_elements = @driver.find_elements :predicate, 'visible = 1'
    expect(all_visible_elements.last.name).to eq 'Check calendar authorized'
  end

  it 'should find elements by class chain' do
    window_elements = @driver.find_elements :class_chain, 'XCUIElementTypeWindow[1]/*[1]'
    expect(window_elements.length).to eq 1
  end

  it 'should find elements by XPath' do
    buttons = @driver.find_elements :xpath, '//XCUIElementTypeWindow//XCUIElementTypeButton'
    expect(buttons.length).to eq 8
  end
end
