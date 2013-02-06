# Features describe what something should allow a user to accomplish.  They're
# high-level things, like you'd put in your manual or marketing copy.  For more
# information about features, check out the documentation at:


Feature: Addition
  In order to revolutionize maths teaching
  As an iOS developer
  I want to be able to sum two numbers

  Scenario: Add two numbers
    Given I have entered 4 into field 1 of the calculator
    And I have entered 7 into field 2 of the calculator
    When I press button 1
    Then the result should be displayed as 11
