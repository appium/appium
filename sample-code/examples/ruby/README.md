Ruby Examples
=============

Before you test
---------------
All these commands are done from a terminal window.  If you've already done a step, you can safely ignore that command.

Open this directory:  `cd APPIUM-LOCATION/sample-code/examples/ruby`

Install Ruby:  `\curl -L https://get.rvm.io | bash -s stable --ruby`

Install Bundler:  `gem install bundle`

Install Gems:  `bundle install`

You're ready to go!

[simple_test.rb](simple_test.rb)
--------------
A sanity check and simple example of driving a calculator app.  Run this to see
the bare minimum you need to get a test running for Appium.

Run the test by making sure Appium is running in another terminal, then from
the terminal you opened above, running `rspec simple_test.rb`

For more information, check out the comments at the top of [simple_test.rb](simple_test.rb#L1)

[u\_i\_catalog.rb](u_i_catalog.rb)
--------------
A demonstration of various things you can do with Appium.  Check this if you
need a recipe for a specific task, or just to see how simple and powerful iOS
testing can be.

Run the test by making sure Appium is running in another terminal, then from the terminal you opened above, running `rspec u_i_catalog.rb`

For more information, check out the comments at the top of [u_i_catalog.rb](u_i_catalog.rb#L1)

[Cucumber](cucumber)
--------
Cucumber is a Behaviour Driven Design framework that lots of people are keen
on.

To run the Cucumber examples, you'll need to change directory to the cucumber 
directory (`cd APPIUM-LOCATION/sample-code/examples/ruby/cucumber`) and then, 
from the commandline, run `cucumber`.

For more information, check out the comments at the top of the files in the 
cucumber directory.
