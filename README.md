Appium
=========

Appium is a test automation tool for use with native and hybrid iOS applications. It uses the webdriver JSON  wire protocol to drive Apple's UIAutomation. Appium is based on [Dan Cuellar's](http://github.com/penguinho) work on iOS Auto.

Appium uses the [Bottle micro web-framework](http://www.bottlepy.org), and has the goal of working with all off the shelf Selenium client libraries.

There are two big benefits to testing with Appium:

1: Appium uses Apple's UIAutomation library under the hood to perform the automation, which means you do not have to recompile your app or modify in any way to be able to test automate it.

2: With Appium, you are able to write your test in your choice of programming language, using the Selenium WebDriver API and language-specific client libraries. If you only used UIAutomation, you would be required to write tests in JavaScript, and only run the tests through the Instruments application. With Appium, you can test your native iOS app with any language, and with your preferred dev tools.

Quick Start
-----------

To get started, clone the repo:<br />
`git clone git://github.com/hugs/appium`

Next, change into the 'appium' directory, and install dependencies:<br />
`pip install -r requirements.txt`

To avoid a security dialog that can appear when launching your iOS app, you need to modify your /etc/authorization file. You can do this by settings the element following &lt;allow-root&gt; under &lt;key&gt;system.privilege.taskport&lt;/key&gt; to &lt;true/&gt; or by running the supplied python script (at your own risk)<br />
`sudo python authorize.py`<br />

To launch an interpreter for sending raw UIAutomation javascript commands run:<br />
For the Simulator:<br />
`python appium.py "path_to_your_ios_.app"` <br />
For a Device:<br />
`python appium.py com.yourApps.BundleID -U <DEVICE_UDID>` <br />

To launch a webdriver-compatible server, run:<br />
For the Simulator:<br />
`python server.py "path_to_your_ios_.app"` <br />
For a Device:<br />
`python server.py com.yourApps.BundleID -U <DEVICE_UDID>` <br />

Tests can be written using raw javascript or webdriver.

An example of the raw javascript approach lives in `sample-code/js-test.py`
To run the test you must build the sample app (`sample-code/apps/TestApp/TestApp.xcodeproj`) in Xcode.
You can find the compiled app using spotlight from the command line. `mdfind -name TestApp.app`
Use that path to run the sample test `python js-test.py "/path/to/sample.app"`

An example of the webdriver approach lives in `sample-code/webdriver-test.py`
Compile and find the app as you did in the previous example and then launch the webdriver server. `python server.py "/path/to/sample.app"`
Now you can run a test against that server. `python webdriver-test.py`

Using with a <a href="http://bitbeam.org">Bitbeambot</a>
-----------

1. Connect the bitbeambot and place a connected iPad beneath it
2. Build and install the calibration app in appium/robot/RobotCalibration/RobotCalibration/xcodeproj to the iPad
2. Run the calibration script `python appium/robot/bitbeambot-d2/calibrate.py UDID /dev/tty.robot_usb_handle`
3. Launch a webdriver server with the -b an d-c flags set <br />`python server.py -u UDID -b /dev/tty.robot_usb_handle -c /path/to/appium/robot/bitbeambot-d2/calibration.pickle Your.Bundle.Identifier`
4. Now Appium will send tap actions to the bitbeambot instead of through UIAutomation

Contributing
------------

Fork the project, make a change, and send a pull request! 

Mailing List
-----------

<a href="https://groups.google.com/d/forum/appium-discuss">Discussion Group</a>
