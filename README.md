Appium
=========

[![Build Status](https://api.travis-ci.org/appium/appium.png?branch=master)](https://travis-ci.org/appium/appium)

Appium is a test automation tool for use with native and hybrid iOS applications. It uses the webdriver JSON  wire protocol to drive Apple's UIAutomation. Appium is based on [Dan Cuellar's](http://github.com/penguinho) work on iOS Auto.

There are two big benefits to testing with Appium:

1.  Appium uses Apple's UIAutomation library under the hood to perform the automation, which means you do not have to recompile your app or modify in any way to be able to test automate it.
2.  With Appium, you are able to write your test in your choice of programming language, using the Selenium WebDriver API and language-specific client libraries. If you only used UIAutomation, you would be required to write tests in JavaScript, and only run the tests through the Instruments application. With Appium, you can test your native iOS app with any language, and with your preferred dev tools.

Requirements
------------

    > Mac OSX 10.6 +
    > XCode
    > Apple Developer Tools (iphone simulator, command line tools)

Ninja-speed Setup
------------
Install [node.js](http://nodejs.org/) which comes with its package manager [npm](https://npmjs.org/).

    > sudo npm install appium -g
    > appium &
    > node your-appium-test.js

See [the appium example tests.](https://github.com/appium/appium/tree/master/sample-code/examples)

- - -

Prerequisites
------------
Install [node.js](http://nodejs.org/) which come with its package manager [npm](https://npmjs.org/).
Change into your local repo clone and install packages using following commands:

    > sudo npm install -g mocha
    > sudo npm install -g grunt
    > npm install

First two commands will make test and build tools available (sudo may not be necessary if you installed node.js through homebrew). The third command will install all app dependencies.

To avoid a security dialog that can appear when launching your iOS app, you need to modify your /etc/authorization file. You can do this by settings the element following &lt;allow-root&gt; under &lt;key&gt;system.privilege.taskport&lt;/key&gt; to &lt;true/&gt; or by running the supplied grunt task (at your own risk)

    > sudo grunt authorize

Quick Start
-----------
Download UICatalog:

    > grunt downloadApp

Build an app (if functional test are failing please re-build apps):

    > grunt buildApp:UICatalog
    > grunt buildApp:TestApp

Run all functional tests:

    > grunt functional

Run unit tests:

    > grunt unit

Run all tests:

    > grunt test

Before commiting code please run grunt to run test and check your changes against code quality standards:

    > grunt
    Running "lint:all" (lint) task
    Lint free.

    Done, without errors.

More things, low-level things
-----------
If you want to run the appium server and have it listen indefinitely, you can
do one of the following to start an appium server with or without an app
pre-specified:

    > grunt appium
    > grunt appium:TestApp
    > grunt appium:UICatalog

Then you can, e.g., run individual testfiles using Mocha directly:

    > mocha -t 60000 -R spec test/functional/testapp/simple.js

Do you like getting close to the metal? Or are you trying to run this from
a script with a custom app? Start appium without grunt from the
command line (see parser.js for more CLI arguments):

    > node server.js -V 1
    > node server.js --app /absolute/path/to/app -V 1

In this case, the app has to be compiled for the iphone simulator, e.g., by
doing this in the Xcode project:

    > xcodebuild -sdk iphonesimulator6.0

This will create a directory called build/Release-iphonesimulator in your Xcode
project, and this dir will contain the .app package you need to send to the
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
