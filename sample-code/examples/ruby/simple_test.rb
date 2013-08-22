# GETTING STARTED
# -----------------
# This documentation is intended to show you how to get started with a
# simple Selenium-Webdriver test.  This test is written with RSpec but the
# webdriver commands (everything called after @driver) will work with any
# testing framework.
#
# INSTALLING RVM
# --------------
# We're assuming you've got rvm installed, but if not, from a terminal
# run the following line (removing the ""'s):
#
# "\curl -L https://get.rvm.io | bash -s stable --ruby"
#
# INSTALLING GEMS
# ---------------
# Then, change to the example directory:
#   "cd appium-location/sample-code/examples/ruby"
#
# and install the required gems with bundler by doing:
#   "bundle install"
#
# RUNNING THE TESTS
# -----------------
# To actually run the tests, make sure appium is running in another terminal
# window, then from the same window you used for the above commands, type
#   "rspec simple_test.rb"
#
# It will take a while, but once it's done you should get nothing but a line telling you "1 example, 0 failures".

require 'rspec'
require 'selenium-webdriver'

APP_PATH = '../../apps/TestApp/build/release-iphonesimulator/TestApp.app'


def absolute_app_path
    file = File.join(File.dirname(__FILE__), APP_PATH)
    raise "App doesn't exist #{file}" unless File.exist? file
    file
end

capabilities = {
  'browserName' => 'iOS',
  'platform' => 'Mac',
  'version' => '6.0',
  'app' => absolute_app_path
}

server_url = "http://127.0.0.1:4723/wd/hub"

describe "Computation" do
  before :all do
    @driver = Selenium::WebDriver.for(:remote, :desired_capabilities => capabilities, :url => server_url)
    @driver.manage.timeouts.implicit_wait = 10 # seconds
   end

  after :all do
    @driver.quit
  end

  it "should add two numbers" do
    values = [rand(10), rand(10)]
    expected_sum = values.reduce(&:+)
    elements = @driver.find_elements(:tag_name, 'textField')

    elements.each_with_index do |element, index|
      element.send_keys values[index]
    end

    button = @driver.find_element(:tag_name, 'button')
    button.click

    actual_sum = @driver.find_elements(:tag_name, 'staticText')[0].text
    actual_sum.should eq(expected_sum.to_s)
  end

  it "should handle alerts" do
    els = @driver.find_elements(:tag_name, 'button')
    els[1].click
    a = @driver.switch_to.alert
    a.text.should eq("Cool title")
    a.accept
  end

  it "should find alerts" do
    els = @driver.find_elements(:tag_name, 'button')
    els[1].click
    alert = @driver.find_element(:tag_name, 'alert')
    buttons = alert.find_elements(:tag_name, 'button')
    buttons[0].text.should eq("Cancel")
    buttons[0].click
    wait = Selenium::WebDriver::Wait.new(:timeout => 30) # seconds
    wait.until {
      alerts = @driver.find_elements(:tag_name, 'alert')
      alerts.should be_empty
    }
  end

  it "should get window size" do
    size = @driver.manage.window.size
    size.width.should eq(320)
    size.height.should eq(480)
  end

end
