Appium
=========

[![NPM version](https://badge.fury.io/js/appium.png)](https://npmjs.org/package/appium)
[![Build Status](https://api.travis-ci.org/appium/appium.png?branch=master)](https://travis-ci.org/appium/appium)

Appium is an open source, cross-platform test automation tool for native and
hybrid mobile apps. It supports iOS, Android, and FirefoxOS platforms. Appium
drives Apple's UIAutomation library and Android's UiAutomator framework (for
newer platforms) using Selenium's WebDriver JSON wire protocol. Appium's iOS
support is based on [Dan Cuellar's](http://github.com/penguinho) work on iOS
Auto. Appium also comes bundled with
[Selendroid](http://github.com/DominikDary/selendroid) for testing older
Android platforms.

Testing with Appium has two big benefits:

1.  You don't have to recompile your app or modify it in any way, due
    to use of standard automation APIs on all platforms.

2.  You can write tests with your favorite dev tools using Java,
    Objective-C, JavaScript, PHP, Python, Ruby, C#, Clojure, or Perl with the
    Selenium WebDriver API and language-specific client libraries. You can use
    any testing framework. If you use Apple's UIAutomation library without Appium
    you can only write tests using JavaScript and you can only run tests
    through the Instruments application. Similarly, with Google's UiAutomator
    you can only write tests in Java. Appium opens up the possibility of true
    cross-platform native mobile automation. Finally!

Requirements
------------

General:

* OS X is required for iOS automation
  * Mac OS X 10.7 or higher, 10.8.4 recommended
* Android works on OS X and Linux. Support for Windows is in "beta"
* Node and npm (brew install node) (Node must be &gt;= v0.8)

For iOS automation:

* XCode
* Apple Developer Tools (iPhone simulator SDK, command line tools)

For Android automation:

* Android SDK API &gt;= 17

User Quick Start
------------
Option 1: Use Appium.app:

* Download the Appium.app [dmg](https://bitbucket.org/appium/appium.app/downloads/appium.dmg)
* Run Appium.app then run a test using your favorite language / framework

Option 2: Run Appium from the command line using Node:

    mkdir appium-test && cd appium-test
    npm install -g appium  # might have to do this with sudo
    sudo authorize_ios # enable developer use of iOS sim
    npm install wd
    curl -O https://raw.github.com/appium/appium/master/sample-code/examples/node/simplest.js
    appium &
    node simplest.js

See the next section for links on how to make sure your system is set up to run Appium tests.

Example Tests: [Node.js](https://github.com/appium/appium/tree/master/sample-code/examples/node) | [Python](https://github.com/appium/appium/tree/master/sample-code/examples/python) | [PHP](https://github.com/appium/appium/tree/master/sample-code/examples/php) | [Ruby](https://github.com/appium/appium/tree/master/sample-code/examples/ruby) | [Java](https://github.com/appium/appium/tree/master/sample-code/examples/java)

Troubleshooting
---------------

We put together a [troubleshooting guide](https://github.com/appium/appium/blob/master/docs/troubleshooting.md). Please have a look here first if you run into any problems. It contains instructions for checking a lot of common errors and how to get in touch with the community if you're stumped.

Write Tests for Your Apps with Appium
-------------------
We support a sub-set of the [Selenium WebDriver JSON Wire Protocol](https://github.com/appium/appium/wiki/JSON-Wire-Protocol:-Supported-Methods).

You find elements by using a sub-set of WebDriver's element-finding strategies. See [finding elements](https://github.com/appium/appium/blob/master/docs/finding-elements.md) for detailed information.

We also have several extensions to the JSON Wire Protocol for [automating
mobile gestures](https://github.com/appium/appium/blob/master/docs/gestures.md)
like tap, flick, and swipe.

You can also automate web views in hybrid apps! See the [hybrid app
guide](https://github.com/appium/appium/blob/master/docs/hybrid.md)

We support Android and iOS platforms side-by-side:

* [Set up your system for Appium iOS support](https://github.com/appium/appium/blob/master/docs/running-on-osx.md#ios)
* [Set up your system for Appium Android support](https://github.com/appium/appium/blob/master/docs/running-on-osx.md#android)
* [Set up your system for Android support on linux](https://github.com/appium/appium/blob/master/docs/running-on-linux.md#android)
* [Prepare your app for an iOS test](https://github.com/appium/appium/blob/master/docs/running-tests.md#prep-ios)
* [Prepare your app for an Android test](https://github.com/appium/appium/blob/master/docs/running-tests.md#preparing-your-app-for-test-android)
* [Run an iOS test](https://github.com/appium/appium/blob/master/docs/running-tests.md#run-ios)
* [Run an Android test](https://github.com/appium/appium/blob/master/docs/running-tests.md#android-ios)
* [Getting started with Appium and Ruby on OS X](https://github.com/appium/ruby_console/blob/master/osx.md)

For the full list of Appium doc pages, visit [this directory](https://github.com/appium/appium/blob/master/docs/).

- - -

Hacking with Appium
------------
Install [node.js](http://nodejs.org/) (includes npm, the node.js package manager).
The recommended way to install node is `brew install node`. Node [installed by
brew](http://mxcl.github.io/homebrew/) will not require sudo for npm commands.

Fork the Appium repo ( [https://github.com/appium/appium](https://github.com/appium/appium) ), then clone your fork.

From your local repo's command prompt, install these packages using the
following commands (if you didn't install node using homebrew, you might have
to run npm with sudo privileges):

    npm install -g mocha
    npm install -g grunt-cli
    ./reset.sh --dev

The first two commands install test and build tools (sudo may not be necessary
if you installed node.js via Homebrew). The third command installs all app
dependencies, builds supporting binaries and test apps. `reset.sh` is also the
recommended command to run after pulling changes from master. At this point,
you're able to star the Appium server (see below for examples of various flags
you can pass in):

    node server.js

Hacking with Appium (iOS)
--------------

(First, have a look at [setting up your system for Appium iOS support](docs/running-on-osx.md#ios).)

To avoid a security dialog that may appear when launching your iOS apps you'll
have to modify your `/etc/authorization` file in one of two ways:

1.  Manually modify the element following &lt;allow-root&gt; under
    &lt;key&gt;system.privilege.taskport&lt;/key&gt; in your
    `/etc/authorization` file to &lt;true/&gt;.

2.  Run the following grunt command which automatically modifies your
    `/etc/authorization` file for you:

        sudo grunt authorize

At this point, you can simply run:

    ./reset.sh --ios --dev

Hacking with Appium (Android)
----------------

(First, have a look at setting up your system for Appium Android support ([linux](docs/running-on-linux.md), [osx](docs/running-on-osx.md#android) or [windows](docs/running-on-windows.md)).)

Now, you can simply run:

    ./reset.sh --android --dev

If you want to use [Selendroid](http://github.com/DominikDary/selendroid) for older apps:

    ./reset.sh --selendroid --dev

Make sure you have one and only one Android emulator or device running, e.g.
by running this command in another process (assuming the `emulator` command is
on your path):

    emulator -avd <MyAvdName>

Making sure you're up to date
-----------
Since we use dev versions of some packages, it often becomes necessary to
install new NPM packages or update various things. There's a handy shell script
to do all this for all platforms (the `--dev` flag gets dev npm dependencies
and test applications used in the Appium test suite):

    ./reset.sh --dev

Or you can run reset for individual platforms only:

    ./reset.sh --ios --dev
    ./reset.sh --android --dev
    ./reset.sh --selendroid --dev

Running Tests
-----------
Once, your system is set up and your code is up to date, you can run various
kinds of tests:

    grunt android
    grunt ios
    grunt selendroid
    grunt firefoxos
    grunt unit

Or you can run all tests:

    grunt test

Before committing code, please run grunt to execute some basic tests and check
your changes against code quality standards:

    grunt
    > Running "lint:all" (lint) task
    > Lint free.
    > Done, without errors.

Dig in deeper to Appium dev
-----------
### Advanced grunt
Like the power of automating dev tasks? Check out the [Appium grunt
tasks](https://github.com/appium/appium/blob/master/docs/grunt.md) available to
help with building apps, installing apps, generating docs, etc...

### Running individual tests

If you have an Appium server listening, you can run individual test files using
Mocha, for example:

    mocha -t 60000 -R spec test/functional/testapp/simple.js

Or individual tests (e.g., a test with the word "alert" in the name):

    mocha -t 60000 -R spec --grep "alert" test/functional/apidemos

You can also run all of appium's tests this way. In one window, `node
server.js` In another window, sequentially (waiting for each to pass, making
sure emulator is up, etc...):

`alias mm="mocha -t 60000 -R spec"`

```
mm test/functional/apidemos
mm test/functional/prefs
mm test/functional/safari
mm test/functional/selendroid
mm test/functional/testapp
mm test/functional/uicatalog
mm test/functional/webview
```

For convenience, there's a `test.sh` script which runs just these tests which
it is important to pass before publishing appium.

### Advanced Appium server flags

Do you like getting close to the metal? Or are you trying to launch an Appium
server from a script with a custom app? If so you can start Appium without
grunt from the command line with an app or without an app, among other things:

    node server.js // launch Appium server without app
    node server.js --app /absolute/path/to/app  // launch Appium server with app
    node server.js --launch // pre-launch the app when appium loads
    node server.js --log /my/appium.log // log to file instead of stdout
    node server.js --quiet // don't log verbose output

(See
[the server documentation](https://github.com/appium/appium/blob/master/docs/server-args.md) for
all CLI arguments.)


Using with a [Tapster](https://github.com/hugs/tapsterbot) and other robots
-----------

Check out the [Appium Robots](https://github.com/appium/robots) project

Contributing
------------
Fork the project, make a change, and send a pull request!

Oh and please have a look at our [Style Guide](https://github.com/appium/appium/blob/master/docs/style-guide.md) before getting to work.

Project Credits & Inspiration
------------
The open source community has made this project possible, please add missing projects to the list.

[All the OSS code contributing to Appium](https://github.com/appium/appium/blob/master/docs/credits.md)

Mailing List
-----------
Announcements and debates often take place on the [Discussion Group](https://groups.google.com/d/forum/appium-discuss), be sure to sign up!
