# THIS TEST
# ---------
# This test demonstrates the many, many things you can do with Appium.
#
# It relies on the setup in simple_test.rb, which is also a good starting 
# point to make sure you can run any tests at all.

require 'rspec'
require 'selenium-webdriver'
require 'net/http'

include Selenium::WebDriver::DriverExtensions::HasInputDevices
include Selenium::WebDriver::DriverExtensions::HasTouchScreen


APP_PATH = '../../apps/UICatalog/build/Release-iphonesimulator/UICatalog.app'

def desired_caps
  {
      'browserName' => '',
      'platform' => 'Mac',
      'device' => 'iPhone Simulator',
      'version' => '7.1',
      'app' => absolute_app_path
  }
end

def absolute_app_path
    File.join(File.dirname(__FILE__), APP_PATH)
end

def server_url
  "http://127.0.0.1:4723/wd/hub"
end

def go_back
  @driver.find_element(:name, "Back").click
end

describe "UI Catalog" do
  before(:all) do
    @driver = Selenium::WebDriver.for(:remote, :desired_capabilities => desired_caps, :url => server_url)
    
   end

  after(:all) do
    @driver.quit
  end

  describe "An Element" do

    subject { @driver.find_elements(:class_name, "UIATableView")[0]}
    
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
      third_row = @driver.find_elements(:class_name, "UIATableCell")[2]
      third_row.location.x.should be 0
      third_row.location.y.should be 152
    end
  end

  describe "Screenshots" do
    it "can be made in base 64" do
      screenshot = @driver.screenshot_as :base64
      screenshot.should_not be_nil
    end

    it "can be saved to the filesystem" do
      @driver.save_screenshot("./pretty_app.png")
    end
  end

  describe "attributes" do

    before :all do
      @driver.find_elements(:class_name, "UIATableCell")[9].click
      @switch = @driver.find_element(:class_name, "UIASwitch")
    end

    # Go back to the menu when you're done
    after :all do
      go_back
    end

    it "can be tested for visibility" do
      @switch.displayed?.should be_true
    end
    
    it "can be tested for usability"

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
      @driver.find_elements(:class_name, "UIATableCell")[2].click
      @text_field = @driver.find_element(:class_name, "UIATextField")
    end

    after :all do
      go_back
    end

    it "can accept key presses" do
      @text_field.send_keys("discombobulate")
    end

    it "can be checked for text" do
      @text_field.attribute("value").should eq "discombobulate"
    end

    it "can accept key presses as an ActionChain" do
      @driver.action.send_keys(Selenium::WebDriver::Keys[:backspace])
                    .send_keys('te')
                    .perform
      @text_field.attribute("value").should eq "discombobulatte"
    end

    it "can be cleared" do
      @text_field.clear
      @text_field.attribute("value").should eq "<enter text>"
    end
  end

  describe "alerts" do
    before :all do
      @driver.find_elements(:class_name, "UIATableCell")[10].click
      @elements = @driver.find_elements(:class_name, "UIATableCell")
    end

    after :all do
      go_back
    end

    it "can be clicked"

    it "can be interacted with"

    it "can be dismissed"

    it "can be modal & have buttons" do
      modal = @driver.find_elements(:class_name, "UIAStaticText")
    end
  end

  describe "scrolling" do

    # Does not work on iOS 7 yet
    it "can be done with co-ordinates"
  end

  describe "sliders" do
    before :all do
      @driver.find_elements(:class_name, "UIATableCell")[1].click
      @slider = @driver.find_element(:class_name, "UIASlider")
    end

    after :all do
      go_back
    end

    it "can have their values read" do
      @slider.attribute("value").should eq "50%"
    end

    it "can be changed" do
      actions = @slider.touch.flick(@slider, -1.0, 0, :normal)
      actions.perform
      @slider.attribute("value").should eq "0%"
    end

  end

  describe "sessions" do
    it "can be obtained from the simulator or driver" do
      data = JSON.parse(Net::HTTP.get(URI "#{server_url}/sessions"))
      data.should_not be_nil

      session_id = @driver.instance_variable_get("@bridge").instance_variable_get("@session_id")

      session_id.should eq (data["value"][0]["id"])
    end
  end

  describe "sizes" do
    it "can be obtained from elements" do
      table_dimensions = @driver.find_element(:class_name, "UIATableView").size
      row_dimensions = @driver.find_elements(:class_name, "UIATableCell")[0].size

      table_dimensions["width"].should eq row_dimensions["width"]
      table_dimensions["height"].should_not eq row_dimensions["height"]
    end
  end

  describe "page source" do
    before :all do
      @main_source = @driver.page_source
      @driver.find_elements(:class_name, "UIATableCell")[2].click
      @text_source = @driver.page_source
    end

    after :all do
      go_back
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
