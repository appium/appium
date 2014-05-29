# These are the 'step definitions' which Cucumber uses to implement features.
#
# Each step starts with a regular expression matching the step you write in
# your feature description.  Any variables are parsed out and passed to the
# step block.
#
# The instructions in the step are then executed with those variables.
#
# In this example, we're using rspec's assertions to test that things are happening,
# but you can use any ruby code you want in the steps.
#
# The '$driver' object is the appium_lib driver, set up in the cucumber/support/env.rb
# file, which is a convenient place to put it as we're likely to use it often.
# This is a different use to most of the examples;  Cucumber steps are instances
# of `Object`, and extending Object with Appium methods (through 
# `promote_appium_methods`) is a bad idea.
#
# For more on step definitions, check out the documentation at
# https://github.com/cucumber/cucumber/wiki/Step-Definitions
#
# For more on rspec assertions, check out
# https://www.relishapp.com/rspec/rspec-expectations/docs

Given /^I have entered (\d+) into field (\d+) of the calculator$/ do |value, field|
  # Get a textfield by index
  textfield(field.to_i).type value
end

Given /^I have entered (\d+) into a field of the calculator showing (\w+)$/ do |value, field|
  # Get a textfield by string
  textfield(field).type value
end

And /^I press button (\d+)$/ do |button_index|
  # Find a button by index
  button(button_index.to_i).click
end

And /^I press a button labelled (\w+)$/ do |button_text|
  # Find a button by text
  button(button_text).click
end

Then /^the result should be displayed as (\d+)$/ do |expected|
  # You can get just the first of a class of elements
  first_text.value.should eq expected
end