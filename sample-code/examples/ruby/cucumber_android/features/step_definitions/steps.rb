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

Given /^I click about phone$/ do
  scroll_to('About phone').click
end

Given /^the Android version is a number$/ do
  android_version = 'Android version'
  scroll_to android_version

  view    = 'android.widget.TextView'
  version = xpath(%Q(//#{view}[preceding-sibling::#{view}[@text="#{android_version}"]])).text
  valid   = !version.match(/\d/).nil?

  expect(valid).to eq(true)
end