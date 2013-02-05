# This documentation is intended to show you how to get started with a
# simple Selenium-Webdriver test.  This test is written with RSpec but the
# webdriver commands (everything called after @driver) will work with any
# testing framework.
#
# We're assuming you've got rvm installed, but if not, from a terminal
# run the following line (removing the ""'s):
#
# "\curl -L https://get.rvm.io | bash -s stable --ruby"
#
# Then, change to the example directory:
#   "cd appium-location/sample-code/examples/ruby"
#
# and install the required gems with bundler by doing:
#   "bundle install"
#
# To actually run the tests, make sure appium is running in another terminal 
# window, then from the same window you used for the above commands, type
#   "rspec simple_test.rb"
#
# It will take a while, but once it's done you should get nothing but a line telling you "1 example, 0 failures".

require 'rspec'
require 'selenium-webdriver'

APP_PATH = '../../apps/TestApp/build/release-iphonesimulator/TestApp.app'

def capabilities
  {
      'browserName' => 'iOS',
      'platform' => 'Mac',
      'version' => '6.0',
      'app' => absolute_app_path
  }
end

def absolute_app_path
    File.join(File.dirname(__FILE__), APP_PATH)
end

def server_url
  "http://127.0.0.1:4723/wd/hub"
end

describe "Computation" do
  before(:each) do
    @driver = Selenium::WebDriver.for(:remote, :desired_capabilities => capabilities, :url => server_url)
    
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
  end
