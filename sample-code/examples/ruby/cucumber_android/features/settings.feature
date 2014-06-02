# WHAT ARE FEATURES?
# ------------------
# Features describe what something should allow a user to accomplish.  They're
# high-level things, like you'd put in your manual or marketing copy.  Each
# line describes a "step" which should pass for the feature to be 
# implemented.  They're usually written with non-developers in mind, so should
# be nice, plain and English like.
#
# WHAT ARE THE OTHER FILES?
# -------------------------
# The 'steps' are implemented in a step definition file, which is created by 
# developers.  Ideally, once steps have been created, anyone can write a
# feature by using step definitions to do so.  The step definitions for this 
# example can be found in the cucumber/features/step_definitions/steps.rb file.
#
# RUNNING THE TEST:
# -----------------
# Assuming you've (successfully) run the examples in the simple_test.rb file,
# all you should need for Cucumber is:
#
# 1.  Start Appium in a terminal window
# 2.  From another terminal window, open the cucumber example directory at 
#     appium/sample-code/examples/ruby/cucumber_android/
# 3.  type 'cucumber' and hit enter
# 4.  If you see '1 scenario (1 passed)' and some other stuff, SUCCESS! The
#     test passed.  If you didn't, BOOOO, that's not right.  Make sure you've
#     followed all the instructions for setup in the simple_test.rb file and
#     give it another shot.  If that doesn't work, log a support ticket on
#     Github at https://github.com/appium/appium/issues/new
#
# ADDITIONAL INFORMATION:
# -----------------------
# 
# For more information about features, check out the documentation at:
# https://github.com/cucumber/cucumber/wiki/Feature-Introduction


Feature: Version check
  Settings must display the Android version

  Scenario: Settings
    Given I click about phone
    Then the Android version is a number
