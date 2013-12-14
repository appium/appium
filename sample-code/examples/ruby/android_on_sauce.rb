# This example automates a test of the Android example notepad app.
#
# To run this example, make sure you've run:
#   $ bundle install
#
# And set the environment variables:
#   SAUCE_USERNAME = your-sauce-username
#   SAUCE_ACCESS_KEY = your-sauce-key
#
# Then just:
#   $ rspec android_on_sauce.rb 
#
# Of note compared to the iOS example, here we're giving the package and
# activity, no OS and an empty browserName
#
# Of note compared to the non-sauce examples, you need to host your app
# somewhere Sauce Labs' cloud can fetch it for your test.

require "selenium-webdriver"
require 'selenium/webdriver/remote/http/persistent'
require "rspec"
require "rest_client"

SAUCE_USERNAME = ENV['SAUCE_USERNAME']
SAUCE_ACCESS_KEY = ENV['SAUCE_ACCESS_KEY']

def desired_capabilites
  {
    "device" => "Android",
    "browserName" => "",
    "version" => "4.2",
    "app" => "http://appium.s3.amazonaws.com/NotesList.apk",
    "app-package" => "com.example.android.notepad",
    "app-activity" => ".NotesList"
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
  return "http://#{auth_details}@ondemand.saucelabs.com:80/wd/hub"
end

def rest_jobs_url
  "https://#{auth_details}@saucelabs.com/rest/v1/#{SAUCE_USERNAME}/jobs"
end

# Because WebDriver doesn't have the concept of test failure, use the Sauce
# Labs REST API to record job success or failure
def update_job_success(job_id, success)
    RestClient.put "#{rest_jobs_url}/#{job_id}", {"passed" => success}.to_json, :content_type => :json
end

describe "Notepad" do
  before :all do
    http_client = ::Selenium::WebDriver::Remote::Http::Persistent.new
    http_client.timeout = 300 # Allow for slow network or boot time
    
    @driver ||= Selenium::WebDriver.for(
      :remote, 
      :desired_capabilities => desired_capabilites,
      :url => server_url,
      :http_client => http_client
    )
    
    http_client.timeout = 90
  end

  after(:each) do
    # Get the success by checking for assertion exceptions,
    # and log them against the job, which is exposed by the session_id
    job_id = @driver.send(:bridge).session_id
    update_job_success(job_id, example.exception.nil?)
    @driver.quit
  end

  it "can create and save new notes" do
    new_button = @driver.find_element(:name, "New note")
    new_button.click

    text_field = @driver.find_element(:tag_name, "textfield")
    text_field.send_keys "This is a new note, from Ruby"

    save_button = @driver.find_element(:name, "Save")
    save_button.click

    notes = @driver.find_elements(:tag_name, "text")
    puts "The number of notes is: #{notes.length}"
    notes[2].text.should eq "This is a new note, from Ruby"
  end
end
