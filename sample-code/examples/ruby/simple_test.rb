# GETTING STARTED
# -----------------
# This documentation is intended to show you how to get started with a
# simple Appium & appium_lib test.  This example is written without a specific
# testing framework in mind;  You can use appium_lib on any framework you like.
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
#   "ruby simple_test.rb"
#
# It will take a while, but once it's done you should get nothing but a line
# telling you "Tests Succeeded";  You'll see the iOS Simulator cranking away
# doing actions while we're running.
require 'appium_lib'

APP_PATH = '../../apps/TestApp/build/release-iphonesimulator/TestApp.app'

def absolute_app_path
    file = File.join(File.dirname(__FILE__), APP_PATH)
    raise "App doesn't exist #{file}" unless File.exist? file
    file
end

desired_caps = {
  'platformName' => 'ios',
  'versionNumber' => '7.1',
  'app' => absolute_app_path
}

# Start the driver, then add all the Appium library methods to object to make
# calling them look nicer.  You should probably do this on your test class,
# not on Object.
Appium::Driver.new(caps: desired_caps).start_driver
Appium.promote_appium_methods Object


# Add two numbers
values = [rand(10), rand(10)]
expected_sum = values.reduce(&:+)

# Find every textfield
elements = e_textfields

elements.each_with_index do |element, index|
  element.type values[index]
end

# Get the first button
button = button(1)
button.click

# Get the first static text field, then get its text
actual_sum = first_s_text.text
raise Exception unless actual_sum == (expected_sum.to_s)


## Alerts are visible 
button('show alert').click
alert = find_element :class_name, 'UIAAlert'   # Elements can be found by :class_name

## Elements can be found by their Class and value of an attribute
cancel_button = find_ele_by_attr 'UIATableCell', :label, "Cancel"
cancel_button.click 

# Waits until no exceptions are raised
wait(10) {
  alerts = find_elements :class_name, 'UIAAlert'
  raise Exception unless alerts.length == 0
}


## Alerts can be switched into
button('show alert').click         # Get a button by its text
alert = driver.switch_to.alert     # Get the text of the current alert, using
                                   #   the Selenium::WebDriver directly
alerting_text = alert.text
raise Exception unless alerting_text.include? "Cool title" 
alert_accept                      # Accept the current alert


## Window Size is easy to get
sizes = window_size
raise Exception unless sizes.height == 568
raise Exception unless sizes.width == 320

# Quit when you're done!
driver_quit
puts "Tests Succeeded!"