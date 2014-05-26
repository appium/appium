# Appium

[![NPM version](https://badge.fury.io/js/appium.png)](https://npmjs.org/package/appium)
[![Build Status](https://api.travis-ci.org/appium/appium.png?branch=master)](https://travis-ci.org/appium/appium)
[![Dependency Status](https://gemnasium.com/appium/appium.png)](https://gemnasium.com/appium/appium)
[![Selenium Test Status](https://saucelabs.com/buildstatus/appium)](https://saucelabs.com/u/appium)

[![Selenium Test Status](https://saucelabs.com/browser-matrix/appium.svg)](https://saucelabs.com/u/appium)

Appium is an open source, cross-platform test automation tool for native, hybrid and mobile web apps, tested on simulators (iOS, FirefoxOS), emulators (Android), and real devices (iOS, Android, FirefoxOS).

**Note:** we have just recently released Appium 1.0. If you already have a bunch of Appium tests, you might want to check out the [Migrating to 1.0](docs/en/migrating-to-1-0.md) doc!

## Supported Platforms

* iOS
* Android
* FirefoxOS

See the [platform support doc](docs/en/platform-support.md) for more detailed information.

## Why Appium?

1. You don't have to recompile your app or modify it in any way, due
   to use of standard automation APIs on all platforms.
2. You can write tests with your favorite dev tools using any [WebDriver](https://code.google.com/p/selenium/wiki/JsonWireProtocol)-compatible
   language such as Java, [Objective-C](https://github.com/appium/selenium-objective-c),
   JavaScript with Node.js (in both [callback](https://github.com/admc/wd) and [yield-based](https://github.com/jlipps/yiewd) flavors),
   PHP, Python, [Ruby](https://github.com/appium/ruby_lib), C#, Clojure, or Perl
   with the Selenium WebDriver API and language-specific client libraries.
3. You can use any testing framework.

Investing in the [WebDriver](https://code.google.com/p/selenium/wiki/JsonWireProtocol) protocol means you are betting on a single, free and open protocol for testing that has become a defacto standard. Don't lock yourself into a proprietary stack.

If you use Apple's UIAutomation library without Appium you can only write tests
using JavaScript and you can only run tests through the Instruments application.
Similarly, with Google's UiAutomator you can only write tests in Java. Appium
opens up the possibility of true cross-platform native mobile automation. Finally!

## I don't get it yet...

If you're new to Appium, or want a fuller description of what this is all about, please read our [Introduction to Appium Concepts](docs/en/intro.md).

## Requirements

Your environment needs to be setup for the particular mobile platforms that you
want to run tests on. See below for particular platform requirements.

If you want to run Appium via an `npm install`, hack with or contribute to Appium, you will need
[node.js and npm](http://nodejs.org) 0.10 or greater (`brew install node`: make sure you have not installed Node or Appium with `sudo`, otherwise you'll run into problems). We recommend the latest stable version.

To verify that all of Appium's dependencies are met you can use `appium-doctor`.
Run `appium-doctor` and supply the `--ios` or `--android` flags to verify that all
of the dependencies are set up correctly. If running from source, you may have to use
`./bin/appium-doctor.js` or `node bin/appium-doctor.js`.

You also need to download the Appium client for your language so you can write tests. The Appium clients are simple extensions to the WebDriver clients. You can see the list of clients and links to download instructions at the [Appium clients list](docs/en/appium-clients.md).

### iOS Requirements

* Mac OS X 10.7 or higher, 10.9.2 recommended
* XCode &gt;= 4.6.3, 5.1.1 recommended
* Apple Developer Tools (iPhone simulator SDK, command line tools)
* [Ensure you read our documentation on setting yourself up for iOS testing!](docs/en/running-on-osx.md)

### Android Requirements

* [Android SDK](http://developer.android.com) API &gt;= 17 (Additional features require 18/19)
* Appium supports Android on OS X, Linux and Windows. Make sure you follow the
  directions for setting up your environment properly for testing on different OSes:
  * [linux](docs/en/running-on-linux.md)
  * [osx](docs/en/running-on-osx.md)
  * [windows](docs/en/running-on-windows.md)

### FirefoxOS Requirements

* [Firefox OS Simulator](https://developer.mozilla.org/en/docs/Tools/Firefox_OS_Simulator)

## Quick Start

Kick up an Appium server, and then run a test written in your favorite [WebDriver](https://code.google.com/p/selenium/wiki/JsonWireProtocol)-compatible language!
You can run an Appium server using node.js or using the application, see below.

### Using Node.js

    $ npm install -g appium
    $ appium &

### Using the App

* [Download the Appium app](https://github.com/appium/appium/releases)
* Run it!

## Writing Tests for Appium

The main guide for getting started writing and running tests is [the running tests](docs/en/running-tests.md) doc, which includes explanations for iOS, Android, and Android older devices. If you're interested in testing on physical hardware, you might be interested in our [real devices guide](docs/en/real-devices.md).

Essentially, we support a subset of the [Selenium WebDriver JSON Wire Protocol](https://code.google.com/p/selenium/wiki/JsonWireProtocol), and extend it so that you can specify mobile-targeted [desired capabilities](docs/en/caps.md) to run your test through Appium.

You find elements by using a subset of WebDriver's element-finding strategies.
See [finding elements](docs/en/finding-elements.md) for detailed information. We also have several extensions to the JSON Wire Protocol for [automating mobile gestures](docs/en/gestures.md) like tap, flick, and swipe.

You can also automate web views in hybrid apps! See the [hybrid app guide](docs/en/hybrid.md)

This repository contains [many examples of tests in a variety of different languages](sample-code/examples)!

For the full list of Appium doc pages, visit [this directory](docs/en/).

## How It Works

Appium drives various native automation frameworks and provides an API based on
Selenium's [WebDriver JSON wire protocol](https://code.google.com/p/selenium/wiki/JsonWireProtocol).

Appium drives Apple's UIAutomation library for iOS support, which is based on
[Dan Cuellar's](http://github.com/penguinho) work on iOS Auto.

Android support uses the UiAutomator framework for newer platforms and
[Selendroid](http://github.com/DominikDary/selendroid) for older Android platforms.

FirefoxOS support leverages [Marionette](https://developer.mozilla.org/en-US/docs/Marionette),
an automation driver that is compatible with WebDriver and is used to automate
Gecko-based platforms.

## Contributing

Please take a look at our [contribution documentation](CONTRIBUTING.md)
for instructions on how to build, test and run Appium from source.

## Project Credits & Inspiration

[Credits](docs/en/credits.md)

## Mailing List

Announcements and debates often take place on the [Discussion Group](https://groups.google.com/d/forum/appium-discuss), be sure to sign up!

## Troubleshooting

We put together a [troubleshooting guide](docs/en/troubleshooting.md).
Please have a look here first if you run into any problems. It contains instructions for checking a lot
of common errors and how to get in touch with the community if you're stumped.

## Using Robots

Using Appium with [Tapster](https://github.com/hugs/tapsterbot) and other robots is possible,
check out the [Appium Robots](https://github.com/appium/robots) project!
