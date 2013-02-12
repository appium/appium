# This is an example test for Sauce Labs and Appium.
# It expects SAUCE_USERNAME and SAUCE_ACCESS_KEY to be set in your environment.
#
# Before this test will work, you may need to do:
# 
# gem install rspec selenium-webdriver
#
# Run with:
#
# rspec sauce_example.rb

require 'rspec'
require 'selenium-webdriver'

APP_PATH = 'http://appium.s3.amazonaws.com/TestApp6.0.app.zip'
SAUCE_USERNAME = ENV['SAUCE_USERNAME']
SAUCE_ACCESS_KEY = ENV['SAUCE_ACCESS_KEY']

def capabilities
  {
      'browserName' => 'iOS 6.0',
      'platform' => 'Mac 10.8',
      'device' => 'iPhone Simulator',
      'app' => APP_PATH,
      'name' => 'Ruby Example for Appium',
  }
end

def server_url
  "http://#{SAUCE_USERNAME}:#{SAUCE_ACCESS_KEY}@ondemand.saucelabs.com:80/wd/hub"
end

describe "Computation" do
  before(:each) do
    @driver = Selenium::WebDriver.for(:remote, :desired_capabilities => capabilities, :url => server_url)
   end

  after(:each) do
    @driver.quit
  end

    it "should add two numbers" do
      values = [rand(10), rand(10)]
      expected_sum = values.reduce(&:+)
      elements = @driver.find_elements(:tag_name, 'textField')

      elements.each_with_index do |element, index|
        element.send_keys values[index]
      end

      button = @driver.find_elements(:tag_name, 'button')[0]
      button.click
     
      @driver.find_elements(:tag_name, 'staticText')[0].text.should eq expected_sum.to_s
    end
  end
