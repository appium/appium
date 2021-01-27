require 'spec_helper'
require 'appium_lib_core'

describe 'IOS Basic Interactions' do
  before(:all) do
    @driver = Appium::Core.for(ios_caps).start_driver
  end

  after(:all) do
    @driver&.quit
  end

  it 'should send keys to inputs' do
    text_field_el = @driver.find_element :predicate, 'label == "TextField1"'
    expect(text_field_el.attribute(:value)).to be_nil
    text_field_el.send_keys 'Hello World!'
    expect(text_field_el.attribute(:value)).to eq 'Hello World!'
  end

  it 'should click a button that opens an alert' do
    button_el_txt = 'show alert'
    button_el = @driver.find_element :accessibility_id, button_el_txt
    button_el.click
    alert_title = 'Cool title'
    alert_el = @driver.find_element :accessibility_id, alert_title
    alert_title = alert_el.attribute :name
    expect(alert_title).to eq 'Cool title'
  end
end
