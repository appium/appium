# These are the 'step definitions' which Cucumber uses to implement features.
#
# Each step starts with a regular expression matching the step you write in
# your feature description.  Any variables are parsed out and passed to the
# step block.
#
# The instructions in the step are then executed with those variables.
#
# In this example, we're using rspec's assertions to test that things are happening, but you can use any ruby code you want in the steps.
#
# The 'selenium' object is our webdriver, set up in the cucumber/support/env.rb
# file, which is a convenient place to put it as we're likely to use it often.
#
# For more on step definitions, check out the documentation at
# https://github.com/cucumber/cucumber/wiki/Step-Definitions
#
# For more on rspec assertions, check out
# https://www.relishapp.com/rspec/rspec-expectations/docs


Given /^I have entered (\d+) into field (\d+) of the calculator$/ do |value, field|
  elements = selenium.find_elements(:class_name, "UIATextField")
  elements[field.to_i - 1].send_keys value
end

And /^I press button (\d+)$/ do |button_index|
  button = selenium.find_elements(:class_name, "UIAButton")[button_index.to_i - 1    ]
  button.click
end

Then /^the result should be displayed as (\d+)$/ do |expected|
  result = selenium.find_element(:class_name, "UIAStaticText")
  result.attribute("value").should eq expected
end
