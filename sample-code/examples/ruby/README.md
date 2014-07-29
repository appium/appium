# Ruby Examples

## Before you test

All these commands are done from a terminal window.  If you've already done
a step, you can safely ignore that command.

Open this directory:  `cd APPIUM-LOCATION/sample-code/examples/ruby`

Install Ruby:  `\curl -L https://get.rvm.io | bash -s stable --ruby`

Install Bundler:  `gem install bundle`

Install Gems:  `bundle update`

You're ready to go!

## [simple_test.rb](simple_test.rb)

A sanity check and simple example of driving a calculator app.  Run this to see
the bare minimum you need to get a test running for Appium.

Run the test by making sure Appium is running in another terminal, then from
the terminal you opened above, running `rspec simple_test.rb`

For more information, check out the comments at the top of
[simple_test.rb](simple_test.rb#L1)

## [u\_i\_catalog.rb](u_i_catalog.rb)

(NB: This example is not yet 1.0 Compliant)
A demonstration of various things you can do with Appium.  Check this if you
need a recipe for a specific task, or just to see how simple and powerful iOS
testing can be.

Run the test by making sure Appium is running in another terminal, then from
the terminal you opened above, running `rspec u_i_catalog.rb`

For more information, check out the comments at the top of [u_i_catalog.rb](u_i_catalog.rb#L1)

## [Cucumber](cucumber_ios)

Cucumber is a Behaviour Driven Design framework that lots of people are keen on.
It lets you describe test actions in a clean, concise, English-like manner.

This example also demonstrates the use of appium.txt, appium_lib's file-based
configuration option.

To run the Cucumber examples, you'll need to change directory to the cucumber 
directory (`cd APPIUM-LOCATION/sample-code/examples/ruby/cucumber`) and then, 
from the commandline, run `cucumber`.

For more information, check out the comments at the top of the files in the 
cucumber directory.

## [Sauce Example](sauce_example.rb)

Shows how to run Appium on Sauce Labs. [Sauce Labs](http://www.saucelabs.com)
is a Selenium Platform as a Service company which helps you scale your web and
mobile test automation.

This example demonstrates how to request an Appium session using a publicly
accessible test application, as well as how to inform Sauce Labs of test
success or failure.

## [XUnit Android](xunit_android.rb)

A test unit example that uses advanced xpath to launch the system's settings
app and extract the current version of Android.
