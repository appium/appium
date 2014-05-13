# THIS TEST
# ---------
# This test demonstrates the many, many things you can do with Appium.
#
# It relies on the setup in simple_test.rb, which is also a good starting 
# point to make sure you can run any tests at all.

require 'rspec'
require 'appium_lib'
require 'net/http'

include Selenium::WebDriver::DriverExtensions::HasInputDevices
include Selenium::WebDriver::DriverExtensions::HasTouchScreen


APP_PATH = '../../apps/UICatalog/build/Release-iphonesimulator/UICatalog.app'

def desired_caps
  {
      'platformName' => 'iOS',
      'deviceName' => 'iPhone Simulator',
      'versionNumber' => '7.1',
      'app' => absolute_app_path
  }
end

def absolute_app_path
    File.join(File.dirname(__FILE__), APP_PATH)
end

def server_url
  "http://127.0.0.1:4723/wd/hub"
end

describe "UI Catalog" do
  before(:all) do
    Appium::Driver.new(caps: desired_caps).start_driver
    Appium.promote_appium_methods RSpec::Core::ExampleGroup
  end

  after(:all) do
    driver_quit
  end

  describe "An Element" do
    subject { find_elements(:class_name, "UIATableView")[0] }
    
    it {should_not be nil}

    context "when used as a selection context" do

      it "Can be a selection context" do
        rows = subject.find_elements(:class_name, "UIATableCell")
        rows.size.should eq 12
      end
    
      it "does not return elements it does not contain" do
        nav_bar = subject.find_elements(:class_name, "UIANavigationBar")
        nav_bar.length.should be 0
      end
    end

    it "returns its text" do
      rows = subject.find_elements(:class_name, "UIATableCell")
      rows[0].attribute(:name).should eq "Buttons, Various uses of UIButton"
    end
  
  end

  describe "position" do
    it "is returned by the driver" do
      third_row = find_elements(:class_name, "UIATableCell")[2]
      third_row.location.x.should be 0
      third_row.location.y.should be 152
    end
  end

  describe "Screenshots" do
    it "can be made in base 64" do
      # screenshot for Appium saves to disk, to get base64 you need
      # to use the underlying Selenium WebDriver
      screenshot = driver.screenshot_as :base64
      screenshot.should_not be_nil
    end

    it "can be saved to the filesystem" do
      screenshot("./pretty_app.png")
    end
  end

  describe "attributes" do

    before :all do
      find_elements(:class_name, "UIATableCell")[9].click
      @switch = find_element(:class_name, "UIASwitch")
    end

    # Go back to the menu when you're done
    after :all do
      back
    end

    it "can be tested for visibility" do
      @switch.displayed?.should be_true
    end

    # TODO: Text checking still seems... Not good.
    it "can have text checked" do
      @switch.attribute("name").should eq "Image"
    end

    it "can have values checked" do
      # Check if this switch is off
      @switch.attribute("value").should be 0
    end

    it "reflect changes in their values" do
        @switch.click
        @switch.attribute("value").should be 1
    end
  end

  describe "text fields" do

    before :all do
      find_elements(:class_name, "UIATableCell")[2].click
      @text_field = first_textfield
    end

    after :all do
      back
    end

    it "can accept key presses" do
      @text_field.type("discombobulate")
    end

    it "can be checked for text" do
      @text_field.attribute("value").should eq "discombobulate"
    end

    it "can be cleared" do
      @text_field.clear
      @text_field.attribute("value").should eq "<enter text>"
    end
  end

  describe "alerts" do
    before :all do
      find_elements(:class_name, "UIATableCell")[10].click
    end

    after :all do
      back
    end

    it "can be clicked" do
      s_text("Show OK-Cancel").click
      b = button("OK")
      b.click
    end

    it "can be accepted" do
      s_text("Show OK-Cancel").click
      alert_accept
    end

    it "can be dismissed" do
      s_text("Show OK-Cancel").click
      alert_dismiss
    end

    it "can be Custom" do
      s_text("Show Custom").click
      button_1 = button("Button1")
      button_2 = button("Button2")
      button_2.click
    end
  end

  describe "scrolling" do

    # Does not work on iOS 7 yet
    it "can be done with co-ordinates"
  end

  describe "sliders" do
    before :all do
      find_elements(:class_name, "UIATableCell")[1].click
      @slider = find_element(:class_name, "UIASlider")
    end

    after :all do
      back
    end

    it "can have their values read" do
      # .value is a patched method to return the value attribute
      @slider.value.should eq "50%"
    end

    it "can be changed" do
      @slider.value.should eq "50%"
      actions = Appium::TouchAction.new
      actions.press element: @slider, x: 60, y: 3
      actions.move_to element: @slider, x: 120, y: 3
      actions.release
      actions.perform 
      @slider.value.should eq "100%"
    end
  end

  describe "sessions" do
    it "can be obtained from the simulator or driver" do
      data = JSON.parse(Net::HTTP.get(URI "#{server_url}/sessions"))
      data.should_not be_nil

      # Convenience method to get the session ID
      session_id.should eq (data["value"][0]["id"])
    end
  end

  describe "sizes" do
    it "can be obtained from elements" do
      table_dimensions = find_element(:class_name, "UIATableView").size
      row_dimensions = find_elements(:class_name, "UIATableCell")[0].size

      table_dimensions["width"].should eq row_dimensions["width"]
      table_dimensions["height"].should_not eq row_dimensions["height"]
    end
  end

  describe "page source" do
    before :all do
      # get_source returns the source, source prints it directly
      @main_source = get_source
      find_elements(:class_name, "UIATableCell")[2].click
      @text_source = get_source
    end

    after :all do
      back
    end

    it "can be obtained" do
      @main_source.should include "UIATableView"
      @main_source.should include "TextFields"
    end

    it "changes when the page does" do
      @text_source.should_not eq @main_source 
    end
  end
end