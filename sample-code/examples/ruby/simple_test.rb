# GETTING STARTED
# -----------------
# This documentation is intended to show you how to get started with a
# simple Appium & appium_lib test.  This example is written without a specific
# testing framework in mind;  You can use appium_lib on any framework you like.
#
# INSTALLING RVM
# --------------
# If you don't have rvm installed, run the following terminal command
#
# \curl -L https://get.rvm.io | bash -s stable --ruby
#
# INSTALLING GEMS
# ---------------
# Then, change to the example directory:
#   cd appium-location/sample-code/examples/ruby
#
# and install the required gems with bundler by doing:
#   bundle install
#
# RUNNING THE TESTS
# -----------------
# To run the tests, make sure appium is running in another terminal
# window, then from the same window you used for the above commands, type
#
# bundle exec ruby simple_test.rb
#
# It will take a while, but once it's done you should get nothing but a line
# telling you "Tests Succeeded";  You'll see the iOS Simulator cranking away
# doing actions while we're running.
require 'rubygems'
require 'appium_lib'

APP_PATH = '../../apps/TestApp/build/release-iphonesimulator/TestApp.app'

desired_caps = {
  caps:       {
    platformName:  'iOS',
    versionNumber: '7.1',
    app:           APP_PATH,
  },
  appium_lib: {
    sauce_username:   nil, # don't run on Sauce
    sauce_access_key: nil
  }
}

# Start the driver
Appium::Driver.new(desired_caps).start_driver

module Calculator
  module IOS
    # Add all the Appium library methods to Test to make
    # calling them look nicer.
    Appium.promote_singleton_appium_methods Calculator

    # Add two numbers
    values       = [rand(10), rand(10)]
    expected_sum = values.reduce(&:+)

    # Find every textfield.
    elements     = textfields

    elements.each_with_index do |element, index|
      element.type values[index]
    end

    # Click the first button
    button(1).click

    # Get the first static text field, then get its text
    actual_sum = first_text.text
    raise unless actual_sum == (expected_sum.to_s)

    # Alerts are visible
    button('show alert').click
    find_element :class_name, 'UIAAlert' # Elements can be found by :class_name

    # wait for alert to show
    wait { text 'this alert is so cool' }

    # Or by find
    find('Cancel').click

    # Waits until alert doesn't exist
    wait_true { !exists { tag('UIAAlert') } }

    # Alerts can be switched into
    button('show alert').click # Get a button by its text
    alert         = driver.switch_to.alert # Get the text of the current alert, using
    # the Selenium::WebDriver directly
    alerting_text = alert.text
    raise Exception unless alerting_text.include? 'Cool title'
    alert_accept # Accept the current alert

    # Window Size is easy to get
    sizes = window_size
    raise Exception unless sizes.height == 568
    raise Exception unless sizes.width == 320

    # Quit when you're done!
    driver_quit
    puts 'Tests Succeeded!'
  end
end