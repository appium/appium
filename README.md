Appium
=========

[![Build Status](https://api.travis-ci.org/appium/appium.png?branch=master)](https://travis-ci.org/appium/appium)

Appium is a test automation tool for use with native and hybrid iOS applications. It uses the webdriver JSON  wire protocol to drive Apple's UIAutomation. Appium is based on [Dan Cuellar's](http://github.com/penguinho) work on iOS Auto.

There are two big benefits to testing with Appium:

1.  Appium uses Apple's UIAutomation library under the hood to perform the automation, which means you do not have to recompile your app or modify in any way to be able to test automate it.
2.  With Appium, you are able to write your test in your choice of programming language, using the Selenium WebDriver API and language-specific client libraries. If you only used UIAutomation, you would be required to write tests in JavaScript, and only run the tests through the Instruments application. With Appium, you can test your native iOS app with any language, and with your preferred dev tools.

Prerequisite
------------
Install [node.js](http://nodejs.org/) which come with its package manager [npm](https://npmjs.org/).
Change into your local repo clone and install packages using following commands:

    > sudo npm install -g mocha
    > sudo npm install -g grunt
    > npm install

First two commands will make test and build tools available (sudo may not be necessary if you installed node.js through homebrew). The third command will install all app dependencies.

To avoid a security dialog that can appear when launching your iOS app, you need to modify your /etc/authorization file. You can do this by settings the element following &lt;allow-root&gt; under &lt;key&gt;system.privilege.taskport&lt;/key&gt; to &lt;true/&gt; or by running the supplied python script (at your own risk)

    > sudo python authorize.py

Quick Start
-----------
Download UICatalog:

    > grunt downloadApp

Build an app:

    > grunt buildApp:UICatalog
    > grunt buildApp:TestApp

Start it:

    > grunt appium:TestApp &

Run functional tests (make sure Appium server is not running as this command
runs it for the duration of the test):

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

Using with a [Bitbeambot](http://bitbeam.org)
-----------

Contributing
------------
Fork the project, make a change, and send a pull request!

Mailing List
-----------
[Discussion Group](https://groups.google.com/d/forum/appium-discuss)
