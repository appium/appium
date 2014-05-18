# GETTING STARTED
# -----------------
# This documentation is intended to show you how to get started with a
# simple Appium & Sauce Labs test.  This example is written with rspec and
# appium_lib, but you can use any Selenium client and test framework you like.
#
# This example expects SAUCE_USERNAME and SAUCE_ACCESS_KEY to be set in your
# environment.
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
# RUNNING TESTS
# -------------
# Run with:
#
# bundle exec rspec sauce_example.rb
require 'rspec'
require 'appium_lib'
require 'json'
require 'rest_client'

SAUCE_USERNAME = ENV['SAUCE_USERNAME']
SAUCE_ACCESS_KEY = ENV['SAUCE_ACCESS_KEY']

# This is the test itself
describe "Computation" do
  before(:each) do
    Appium::Driver.new(caps: desired_caps).start_driver
    Appium.promote_appium_methods RSpec::Core::ExampleGroup
  end

  after(:each) do
    # Get the success by checking for assertion exceptions,
    # and log them against the job, which is exposed by the session_id
    job_id = driver.send(:bridge).session_id
    update_job_success(job_id, example.exception.nil?)
    driver_quit
  end

  it "should add two numbers" do
    values = [rand(10), rand(10)]
    expected_sum = values.reduce(&:+)
    # Standard selectors work to find elements
    elements = find_elements :class_name, 'UIATextField'

    elements.each_with_index do |element, index|
      element.send_keys values[index]
    end

    # You can find buttons by text or, here, index
    button(1).click

    # You can find the first static text element
    first_text.text.should eq expected_sum.to_s
  end
end

def desired_caps
  {
    'appium-version' => '1.0.0-beta.2',
    'platformName' => 'iOS',
    'platformVersion' => '7.1',
    'deviceName' => 'iPhone Simulator',
    'app' => 'http://appium.s3.amazonaws.com/TestApp6.0.app.zip',
    'name' => 'Ruby Example for Appium'
  }
end

def auth_details
  un = SAUCE_USERNAME
  pw = SAUCE_ACCESS_KEY

  unless un && pw
    STDERR.puts <<-EOF
      Your SAUCE_USERNAME or SAUCE_ACCESS_KEY environment variables
      are empty or missing.

      You need to set these values to your Sauce Labs username and access
      key, respectively.

      If you don't have a Sauce Labs account, you can get one for free at
      http://www.saucelabs.com/signup
    EOF

    exit
  end

  return "#{un}:#{pw}"
end

def server_url
  "http://#{auth_details}@ondemand.saucelabs.com:80/wd/hub"
end

def rest_jobs_url
  "https://#{auth_details}@saucelabs.com/rest/v1/#{SAUCE_USERNAME}/jobs"
end

# Because WebDriver doesn't have the concept of test failure, use the Sauce
# Labs REST API to record job success or failure
def update_job_success(job_id, success)
    RestClient.put "#{rest_jobs_url}/#{job_id}", {"passed" => success}.to_json, :content_type => :json
end
