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
require 'net/http'
require 'uri'

APP_PATH = 'http://appium.s3.amazonaws.com/TestApp6.0.app.zip'
SAUCE_USERNAME = ENV['SAUCE_USERNAME']
SAUCE_ACCESS_KEY = ENV['SAUCE_ACCESS_KEY']

# This is the test itself
describe "Computation" do
  before(:each) do
    @driver = Selenium::WebDriver.for(:remote, :desired_capabilities => capabilities, :url => server_url)
   end

  after(:each) do
    # Get the success by checking for assertion exceptions,
    # and log them against the job, which is exposed by the session_id
    job_id = @driver.send(:bridge).session_id
    update_job_success(job_id, example.exception.nil?)
    @driver.quit
  end

  it "should add two numbers" do
    values = [rand(10), rand(10)]
    expected_sum = values.reduce(&:+)
    elements = @driver.find_elements(:tag_name, 'textField')

    elements.each_with_index do |element, index|
      element.send_keys values[index]
    end

    @driver.find_elements(:tag_name, 'button')[0].click
    @driver.find_elements(:tag_name, 'staticText')[0].text.should eq expected_sum.to_s
  end
end

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

# Because WebDriver doesn't have the concept of test failure, use the Sauce
# Labs REST API to record job success or failure
def update_job_success(job_id, success)
  sauce_api.request update_request(job_id, success)
end

# Creates the RESTful job update indicating passing or failure
def update_request(job_id, success)
  request = Net::HTTP::Put.new("/rest/v1/#{SAUCE_USERNAME}/jobs/#{job_id}")
  request.basic_auth(SAUCE_USERNAME, SAUCE_ACCESS_KEY)
  request.content_type= "application/json"
  request.body = "{\"passed\":#{success}}"
  request
end

def sauce_api
  sauce_api = Net::HTTP.new("saucelabs.com", 443)
  sauce_api.use_ssl= true
  sauce_api
end

