# This file provides setup and common functionality across all features.  It's
# included first before every test run, and the methods provided here can be 
# used in any of the step definitions used in a test.  This is a great place to
# put shared data like the location of your app, the capabilities you want to
# test with, and the setup of selenium.

require 'rspec/expectations'
require 'appium_lib'
require 'cucumber/ast'

# Create a custom World class so we don't pollute `Object` with Appium methods
class AppiumWorld
end

# Load the desired configuration from appium.txt, create a driver then
# Add the methods to the world
caps = Appium.load_appium_txt file: File.expand_path('./', __FILE__), verbose: true
Appium::Driver.new(caps)
Appium.promote_appium_methods AppiumWorld

World do
  AppiumWorld.new
end

Before { $driver.start_driver }
After { $driver.driver_quit }


=begin
# If you wanted one env.rb for both android and iOS, you could use logic similar to this:

world_class = ENV['PLATFORM_NAME'] == 'iOS' ? IosWorld : AndroidWorld

# each world class defines the `caps` method specific to that platform
Appium::Driver.new world_class.caps
Appium.promote_appium_methods world_class
World { world_class.new }

Before { $driver.start_driver }
After { $driver.driver_quit }
=end
