Appium
=========

[![Build Status](https://api.travis-ci.org/appium/appium.png?branch=master)](https://travis-ci.org/appium/appium)

Appium is a test automation tool for native and hybrid iOS applications. Appium drives Apple's UIAutomation using Selenium's WebDriver JSON wire protocol. Appium is based on [Dan Cuellar's](http://github.com/penguinho) work on iOS Auto.

Testing with Appium has two big benefits:

1.  You don't have to recompile your app or modify it in any way because Appium's automation functionality is based on Apple's UIAutomation library.

2.  You can write each test in your favorite programming language using the Selenium WebDriver API and language-specific client libraries. If you used UIAutomation without Appium you could only write tests using JavaScript and you could only run tests through the Instruments application. With Appium you can use your favorite dev tools and you can test your iOS apps using any language.

Requirements
------------

    > Mac OS X 10.6 or higher
    > XCode
    > Apple Developer Tools (iPhone simulator, command line tools)

Ninja-Speed Setup for Expert Users
------------
Install [node.js](http://nodejs.org/) (includes npm, the node.js package manager).

    > sudo npm install appium -g
    > appium &
    > node your-appium-test.js

See [the Appium example tests](https://github.com/appium/appium/tree/master/sample-code/examples).

- - -

Prerequisites
------------
Install [node.js](http://nodejs.org/) (includes npm, the node.js package manager). 

From your local repo clone's command prompt, install these packages using the following commands:

    > sudo npm install -g mocha
    > sudo npm install -g grunt
    > npm install

The first two commands install the test and build tools (sudo may not be necessary if you installed node.js via Homebrew). The third command installs all app dependencies.

To avoid a security dialog that may appear when launching your iOS apps, modify your `/etc/authorization` file by setting the element following &lt;allow-root&gt; under &lt;key&gt;system.privilege.taskport&lt;/key&gt; to &lt;true/&gt;, or run the following supplied grunt command (at your own risk):

    > sudo grunt authorize

Quick Start
-----------
Download UICatalog:

    > grunt downloadApp

Build an app (if the functional tests fail, try running these grunt commands again):

    > grunt buildApp:UICatalog
    > grunt buildApp:TestApp

Run all functional tests:

    > grunt functional

Run unit tests:

    > grunt unit

Run all tests:

    > grunt test

Before commiting code, please run grunt to execute some basic tests and check your changes against code quality standards:

    > grunt
    Running "lint:all" (lint) task
    Lint free.

    Done, without errors.

More Stuff and Some Low-Level Tips
-----------
If you want to run the Appium server and have it listen indefinitely, you can
do one of the following to start an Appium server with or without an app
pre-specified:

    > grunt appium
    > grunt appium:TestApp
    > grunt appium:UICatalog

Then you can run individual test files using Mocha, for example:

    > mocha -t 60000 -R spec test/functional/testapp/simple.js

Do you like getting close to the metal? Or are you trying to run this from
a script with a custom app? You can start Appium without grunt from the
command line (see parser.js for more CLI arguments):

    > node server.js -V 1
    > node server.js --app /absolute/path/to/app -V 1

In this case, the app has to be compiled for the iPhone simulator, for example by
executing the following command in the Xcode project:

    > xcodebuild -sdk iphonesimulator6.0

This creates a `build/Release-iphonesimulator` directory in your Xcode
project that contains the `.app` package that you'll need to communicate with the Appium 
server.

You can also run against an app on an actual device by plugging the device in
and passing the udid argument to server.js in the command above.

Using with a [Bitbeambot](http://bitbeam.org)
-----------
AWAITING THE FUTURE

Contributing
------------
Fork the project, make a change, and send a pull request!

Mailing List
-----------
[Discussion Group](https://groups.google.com/d/forum/appium-discuss)
