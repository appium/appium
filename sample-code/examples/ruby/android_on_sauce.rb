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
#   bundle exec ruby android_on_sauce.rb
#
# Of note compared to the iOS example, here we're giving the package and
# activity, no OS and an empty browserName
#
# Of note compared to the non-sauce examples, you need to host your app
# somewhere Sauce Labs' cloud can fetch it for your test.

require 'rubygems'
require 'spec'
require 'appium_lib'
require 'sauce_whisk'

describe 'Notepad' do
  def desired_caps
    {
      caps:       {
        :'appium-version' => '1.1.0',
        platformName:     'Android',
        platformVersion:  '4.3',
        deviceName:       'Android Emulator',
        app:              'http://appium.s3.amazonaws.com/NotesList.apk',
        name:             'Ruby Appium Android example'
      },
      appium_lib: {
        wait: 60
      }
    }
  end

  before do
    Appium::Driver.new(desired_caps).start_driver
  end

  after do
    driver_quit
  end

  it 'can create and save new notes' do
    find('New note').click
    first_textfield.type 'This is a new note, from Ruby'

    find('Save').click

    note_count = ids('android:id/text1').length
    note_count.must_equal 1
    texts.last.text.must_equal 'This is a new note, from Ruby'
  end
end

passed = Minitest.run_specs({ :trace => [__FILE__] }).first

# Because WebDriver doesn't have the concept of test failure, use the Sauce
# Labs REST API to record job success or failure
user   = ENV['SAUCE_USERNAME']
key    = ENV['SAUCE_ACCESS_KEY']
if user && !user.empty? && key && !key.empty?
  passed = passed.failures == 0 && passed.errors == 0
  SauceWhisk::Jobs.change_status $driver.driver.session_id, passed
end