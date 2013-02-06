# These are the 'step definitions' which Cucumber uses to 
#
Given /^I have entered (\d+) into field (\d+) of the calculator$/ do |value, field|
  puts "Called: #{value}  #{field}"
  elements = selenium.find_elements(:tag_name, "textField")
  elements[field.to_i - 1].send_keys value
end

Then /^the result should be displayed as (\d+)$/ do |expected|
  result = selenium.find_element(:tag_name, "staticText")
  result.attribute("value").should eq expected
end

And /^I press button (\d+)$/ do |button_index|
  button = selenium.find_elements(:tag_name, "button")[button_index.to_i - 1]
  button.click
end
