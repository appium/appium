Appium
=========

[![Build Status](https://api.travis-ci.org/appium/appium.png?branch=master)](https://travis-ci.org/appium/appium)

Appium is a test automation tool for use with native and hybrid iOS applications. It uses the webdriver JSON  wire protocol to drive Apple's UIAutomation. Appium is based on [Dan Cuellar's](http://github.com/penguinho) work on iOS Auto.

There are two big benefits to testing with Appium:

1.  Appium uses Apple's UIAutomation library under the hood to perform the automation, which means you do not have to recompile your app or modify in any way to be able to test automate it.
2.  With Appium, you are able to write your test in your choice of programming language, using the Selenium WebDriver API and language-specific client libraries. If you only used UIAutomation, you would be required to write tests in JavaScript, and only run the tests through the Instruments application. With Appium, you can test your native iOS app with any language, and with your preferred dev tools.

Quick Start
-----------
Download UICatalog:

    > grunt downloadApp

Build an app:

    > grunt buildApp:UICatalog
    > grunt buildApp:TestApp

Start it (can be brought back to foreground with 'fg' command):

    > grunt appium:TestApp &

Run functional tests (make sure Appium server is running as per command line above):

    > grunt functional

Run unit tests:

    > grunt unit

Run all tests:

    > grunt test

Before commiting code please run grunt to run test and check your changes against code quality standards:

    $ grunt
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
