Appium
=========

[![Build Status](https://api.travis-ci.org/appium/appium.png?branch=master)](https://travis-ci.org/appium/appium)

Appium is a test automation tool for native and hybrid mobile apps. It supports
iOS today and Android support is in the works. Appium drives Apple's
UIAutomation library using Selenium's WebDriver JSON wire protocol. Appium is
based on [Dan Cuellar's](http://github.com/penguinho) work on iOS Auto.

Testing with Appium has two big benefits:

1.  You don't have to recompile your app or modify it in any way because
    Appium's automation is based on Apple's UIAutomation library.

2.  You can write tests with your favorite dev tools using Java, JavaScript,
    PHP, Python, Ruby, C#, or Perl with the Selenium WebDriver API and
    language-specific client libraries. If you use the UIAutomation library
    without Appium you can only write tests using JavaScript and you can only
    run tests through the Instruments application.

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

From your local repo clone's command prompt, install these packages using the
following commands:

    > sudo npm install -g mocha
    > sudo npm install -g grunt
    > npm install

The first two commands install test and build tools (sudo may not be necessary
if you installed node.js via Homebrew). The third command installs all app
dependencies.

To avoid a security dialog that may appear when launching your iOS apps you'll
have to modify your `/etc/authorization` file in one of two ways:

1.  Manually modify the element following &lt;allow-root&gt; under
    &lt;key&gt;system.privilege.taskport&lt;/key&gt; in your
    `/etc/authorization` file to &lt;true/&gt;.

2.  Run the following grunt command which automatically modifies your
    `/etc/authorization` file for you:

    > sudo grunt authorize

**Important Note:** Making this modification to your `/etc/authorization` file
grants access privileges to all members belonging to your `_developer` group.

Quick Start
-----------
Download UICatalog:

    > grunt downloadApp

Build an app (if the functional tests fail, try running these grunt commands
again):

    > grunt buildApp:UICatalog
    > grunt buildApp:TestApp

Run all functional tests:

    > grunt functional

Run unit tests:

    > grunt unit

Run all tests:

    > grunt test

Before committing code, please run grunt to execute some basic tests and check
your changes against code quality standards:

    > grunt
    Running "lint:all" (lint) task
    Lint free.

    Done, without errors.

More Stuff and Some Low-Level Tips
-----------
By default, `grunt buildApp` builds apps using the iPhone 6.1 simulator SDK.
You can overwrite the simulator by passing another SDK to grunt (to figure out
which SDKs you have available, try `xcodebuild -showsdks`:

    > grunt buildApp:UICatalog:iphonesimulator6.0

If you want to run the Appium server and have it listen indefinitely, you can
execute one of the following commands to start an Appium server with or without a specified app:

    > grunt appium           // launch Appium server without app
    > grunt appium:TestApp   // launch Appium server with the TestApp
    > grunt appium:UICatalog // launch Appium server with the UICatalog app

Then you can run individual test files using Mocha, for example:

    > mocha -t 60000 -R spec test/functional/testapp/simple.js

Do you like getting close to the metal? Or are you trying to launch an Appium
server from a script with a custom app? If so you can start Appium without
grunt from the command line with an app or without an app. (See
[parser.js](https://github.com/appium/appium/blob/master/app/parser.js) for
more CLI arguments.)

    > node server.js -V 1  // launch Appium server without app
    > node server.js --app /absolute/path/to/app -V 1  // launch Appium server with app
    > node server.js --launch 1 // pre-launch the app when appium loads
    > node server.js --log /my/appium.log // log to file instead of stdout
    > node server.js --warp 1 // use unsupported system-crashing speedup tech

In this case, the app has to be compiled for the iPhone simulator, for example
by executing the following command in the Xcode project:

    > xcodebuild -sdk iphonesimulator6.0

This creates a `build/Release-iphonesimulator` directory in your Xcode project
that contains the `.app` package that you'll need to communicate with the
Appium server.

Using with a [Bitbeambot](http://bitbeam.org)
-----------
AWAITING THE FUTURE

Contributing
------------
Fork the project, make a change, and send a pull request!

Mailing List
-----------
[Discussion Group](https://groups.google.com/d/forum/appium-discuss)
