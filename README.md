Appium
=========

[![Build Status](https://api.travis-ci.org/appium/appium.png?branch=master)](https://travis-ci.org/appium/appium)

Appium is an open source test automation tool for native and hybrid
mobile apps. It supports both iOS and Android. Appium drives Apple's
UIAutomation library and Android's UiAutomator using Selenium's
WebDriver JSON wire protocol. Appium is based on
[Dan Cuellar's](http://github.com/penguinho) work on iOS Auto.

Testing with Appium has two big benefits:

1.  You don't have to recompile your app or modify it in any way, due
    to use of standard automation APIs on all platforms.

2.  You can write tests with your favorite dev tools using Java,
    Objective-C, JavaScript, PHP, Python, Ruby, C#, or Perl with the Selenium
    WebDriver API and language-specific client libraries. You can use
    any testing framework. If you use the UIAutomation library without
    Appium you can only write tests using JavaScript and you can only
    run tests through the Instruments application. Similarly, with
    UiAutomator you can only write tests in Java.

Requirements
------------

    > Mac OS X 10.6 or higher
    > XCode
    > Apple Developer Tools (iPhone simulator SDK, command line tools)
    > Android SDK API >= 17
    > Node and npm (http://www.nodejs.org) (Node must be >= v0.8)

User Quick Start
------------
Get something working with a quickness.

    > mkdir appium-test && cd appium-test
    > sudo npm install appium -g
    > npm install wd
    > curl -O https://raw.github.com/appium/appium/master/sample-code/examples/node/simplest.js
    > appium &
    > node simplest.js

Example Tests: [Node.js](https://github.com/appium/appium/tree/master/sample-code/examples/node) | [Python](https://github.com/appium/appium/tree/master/sample-code/examples/python) | [PHP](https://github.com/appium/appium/tree/master/sample-code/examples/php) | [Ruby](https://github.com/appium/appium/tree/master/sample-code/examples/ruby) | [Java](https://github.com/appium/appium/tree/master/sample-code/examples/java)

More Detailed Information
-------------------
We support a sub-set of the [Selenium WebDriver JSON Wire Protocol](https://github.com/appium/appium/wiki/JSON-Wire-Protocol:-Supported-Methods).

We also have several extensions to the JSON Wire Protocol for [automating
mobile
gestures](https://github.com/appium/appium/wiki/Automating-mobile-gestures)
like tap, flick, and swipe.

You can also automate web views in hybrid apps! See the [hybrid app
guide](https://github.com/appium/appium/wiki/Testing-Hybrid-Apps)

We support Android and iOS platforms side-by-side:

* [Set up your system for Appium iOS support](https://github.com/appium/appium/blob/master/docs/system-setup.md#ios)
* [Set up your system for Appium Android support](https://github.com/appium/appium/blob/master/docs/system-setup.md#android)
* [Prepare your app for an iOS test](https://github.com/appium/appium/blob/master/docs/running-tests.md#prep-ios)
* [Prepare your app for an Android test](https://github.com/appium/appium/blob/master/docs/running-tests.md#prep-ios)
* [Run an iOS test](https://github.com/appium/appium/blob/master/docs/running-tests.md#run-ios)
* [Run an Android test](https://github.com/appium/appium/blob/master/docs/running-tests.md#android-ios)
* [Getting started with Appium and Ruby on OS X](https://github.com/appium/ruby_console/blob/master/osx.md)

- - -

Developing on Appium
------------
Install [node.js](http://nodejs.org/) (includes npm, the node.js package manager).

Fork the Appium repo ( [https://github.com/appium/appium](https://github.com/appium/appium) ), then clone your fork.

From your local repo clone's command prompt, install these packages using the
following commands:

    > sudo npm install -g mocha
    > sudo npm install -g grunt-cli
    > ./reset.sh

The first two commands install test and build tools (sudo may not be necessary
if you installed node.js via Homebrew). The third command installs all app
dependencies, builds supporting binaries and test apps. `reset.sh` is also the
recommended command to run after pulling changes from master.

Developing on Appium (iOS)
--------------

(First, have a look at [setting up your system for Appium iOS support](https://github.com/appium/appium/blob/master/docs/system-setup.md#ios).)

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

Download the UICatalog test app:

    > grunt downloadApp

Build the test apps (if the functional tests fail, try running these grunt commands again):

    > grunt buildApp:UICatalog
    > grunt buildApp:TestApp
    > grunt buildApp:WebViewApp

Developing on Appium (Android)
----------------

(First, have a look at [setting up your system for Appium Android support](https://github.com/appium/appium/blob/master/docs/system-setup.md#android).)

Configure the and build bootstrap .jar:

    > grunt configAndroidBootstrap
    > grunt buildAndroidBootstrap

Configure and build the test app:

    > grunt configAndroidApp:ApiDemos
    > grunt buildAndroidApp:ApiDemos

Make sure you have one and only one Android emulator or device running, e.g.
by running this command in another process (assuming the `emulator` command is
on your path):

    > emulator -avd <MyAvdName>

Making sure you're up to date
-----------
Since we use dev versions of some packages, it often becomes necessary to
install new NPM packages or update various things. There's a handy shell script
to do all this:

    > ./reset.sh

Running Tests
-----------
Once, your system is set up and your code is up to date, you can run all the
functional tests:

    > grunt functional

Note: we use [wd](http://github.com/admc/wd) as the Selenium client in our
functional tests. Because of the work we are doing to extend the WebDriver
protocol, we use the development version of wd. If you've installed wd in some
other way, you might need to do this in the Appium project directory to get the
tests to run successfully:

    > rm -rf node_modules/wd
    > npm install .

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

Dig in deeper to Appium dev
-----------
### Advanced grunt
If you want to run the Appium server and have it listen indefinitely, you can
execute one of the following commands to start an Appium server with or without a specified app:

    > grunt appium           // launch Appium server without app
    > grunt appium:TestApp   // launch Appium server with the TestApp
    > grunt appium:UICatalog // launch Appium server with the UICatalog app

Like the power of automating dev tasks? Check out the [Appium grunt
tasks](https://github.com/appium/appium/blob/master/docs/grunt.md) available to
help with building apps, installing apps, generating docs, etc...

### Running individual tests

If you have an Appium server listening, you can run individual test files using
Mocha, for example:

    > mocha -t 60000 -R spec test/functional/testapp/simple.js

### Advanced Appium server flags

Do you like getting close to the metal? Or are you trying to launch an Appium
server from a script with a custom app? If so you can start Appium without
grunt from the command line with an app or without an app, among other things:

    > node server.js -V  // launch Appium server without app
    > node server.js --app /absolute/path/to/app -V  // launch Appium server with app
    > node server.js --launch // pre-launch the app when appium loads
    > node server.js --log /my/appium.log // log to file instead of stdout
    > node server.js --without-delay // (iOS) use faster instruments-without-delay
    > node server.js --fast-reset // (Android) faster resetting between tests

(See
[the server documentation](https://github.com/appium/appium/blob/master/docs/server-args.md) for
all CLI arguments.)


Using with a [Bitbeambot](http://bitbeam.org)
-----------
AWAITING THE FUTURE

Contributing
------------
Fork the project, make a change, and send a pull request!

Oh and please have a look at our [Style Guide](https://github.com/appium/appium/wiki/Style-guide-for-contributors) before getting to work.

Project Credits & Inspiration
------------
The open source community has made this project possible, please add missing projects to the list.

[All the OSS code contributing to Appium](https://github.com/appium/appium/wiki/Credits)

Mailing List
-----------
Announcements and debates often take place on the [Discussion Group](https://groups.google.com/d/forum/appium-discuss), be sure to sign up!
