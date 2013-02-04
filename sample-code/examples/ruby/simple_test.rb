# RSpec is delightful, but the gist should be the same for test::unit
#
# Before this test will work, you may need to do:
# 
# gem install rspec webdriver

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
      elements = @driver.find_elements(:name, 'textField')

      elements.each_with_index do |element, index|
        element.send_keys values[index]
      end

      button = @driver.find_elements(:name, 'button')[0]
      button.click
     
      @driver.find_elements(:name, 'staticText')[0].should eq expected_sum
    end
  end
