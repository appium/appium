require 'spec_helper'
require 'appium_lib'

describe 'Basic Android interactions' do

  before(:all) do
    caps = android_caps
    caps[:caps][:appActivity] = '.app.SearchInvoke'
    @driver = Appium::Driver.new(caps, false).start_driver
  end

  after(:all) do
    @driver&.quit
  end

  it 'should send keys to search box and then check the value' do
    search_box_element = @driver.find_element :id, 'txt_query_prefill'
    search_box_element.send_keys 'Hello world!'

    on_search_requested_button = @driver.find_element :id, 'btn_start_search'
    on_search_requested_button.click

    search_text = @driver.find_element :id, 'android:id/search_src_text'
    search_text_value = search_text.text
    expect(search_text_value).to eql 'Hello world!'
  end

  it 'should click a button that opens an alert and then dismisses it' do
    @driver.start_activity app_package: ANDROID_PACKAGE, app_activity: '.app.AlertDialogSamples'

    open_dialog_button = @driver.find_element :id, 'io.appium.android.apis:id/two_buttons'
    open_dialog_button.click

    alert_element = @driver.find_element :id, 'android:id/alertTitle'
    alert_text = alert_element.text
    expect(alert_text).to eql "Lorem ipsum dolor sit aie consectetur adipiscing\nPlloaso mako nuto siwuf cakso dodtos anr koop."
    close_dialog_button = @driver.find_element :id, 'android:id/button1'

    close_dialog_button.click
  end
end
