## Appium

[![NPM version](https://badge.fury.io/js/appium.svg)](https://npmjs.org/package/appium)
[![Dependency Status](https://david-dm.org/appium/appium.svg)](https://david-dm.org/appium/appium)
[![devDependency Status](https://david-dm.org/appium/appium/dev-status.svg)](https://david-dm.org/appium/appium#info=devDependencies)

[![Monthly Downloads](https://img.shields.io/npm/dm/appium.svg)](https://npmjs.org/package/appium)
[![Pull Requests](http://issuestats.com/github/appium/appium/badge/pr?style=flat)](http://issuestats.com/github/appium/appium)
[![Issues Closed](http://issuestats.com/github/appium/appium/badge/issue?style=flat)](http://issuestats.com/github/appium/appium)

[![Build Status](https://team-appium.ci.cloudbees.com/job/Appium/badge/icon)](https://team-appium.ci.cloudbees.com/job/Appium/)
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bhttps%3A%2F%2Fgithub.com%2Fappium%2Fappium.svg?type=shield)](https://app.fossa.io/projects/git%2Bhttps%3A%2F%2Fgithub.com%2Fappium%2Fappium?ref=badge_shield)

Appium is an open source, cross-platform test automation tool for native, hybrid and mobile web and desktop apps, tested on simulators (iOS), emulators (Android), and real devices (iOS, Android, Windows, Mac).


### Supported Platforms

* iOS
* Android
* Windows
* Mac

See the [platform support doc](/docs/en/appium-setup/platform-support.md) for more detailed information.

### Why Appium?

1. You don't have to recompile your app or modify it in any way, due
   to use of standard automation APIs on all platforms.
2. You can write tests with your favorite dev tools using any [WebDriver](https://w3c.github.io/webdriver/webdriver-spec.html)-compatible
   language such as Java, [Objective-C](https://github.com/appium/selenium-objective-c),
   JavaScript with Node.js (in [promise, callback](https://github.com/admc/wd) or [generator](https://github.com/jlipps/yiewd) flavors),
   PHP, Python, [Ruby](https://github.com/appium/ruby_lib), C#, Clojure, or Perl
   with the Selenium WebDriver API and language-specific client libraries.
3. You can use any testing framework.

Investing in the [WebDriver](https://w3c.github.io/webdriver/webdriver-spec.html) protocol means you are betting on a single, free and open protocol for testing that has become a defacto standard. Don't lock yourself into a proprietary stack.

If you use Apple's UIAutomation library without Appium you can only write tests
using JavaScript and you can only run tests through the Instruments application.
Similarly, with Google's UiAutomator you can only write tests in Java. Appium
opens up the possibility of true cross-platform native mobile automation. Finally!

### I don't get it yet...

If you're new to Appium, or want a fuller description of what this is all about, please read our [Introduction to Appium Concepts](/docs/en/about-appium/intro.md).

### Requirements

Your environment needs to be setup for the particular mobile platforms that you
want to run tests on. See below for particular platform requirements.

If you want to run Appium via an `npm install`, hack with or contribute to Appium, you will need
[node.js and npm](http://nodejs.org) 4 or greater (use [n](https://github.com/visionmedia/n) or
`brew install node` to install Node.js. Make sure you have not installed Node or Appium with `sudo`,
otherwise you'll run into problems). We recommend the latest stable version.

To verify that all of Appium's dependencies are met you can use
`appium-doctor`.  Install it with `npm install -g appium-doctor` (or run it
from [source](https://github.com/appium/appium-doctor)), then run
`appium-doctor` and supply the `--ios` or `--android` flags to verify that all
of the dependencies are set up correctly.

You also need to download the Appium client for your language so you can write tests. The Appium clients are simple extensions to the WebDriver clients. You can see the list of clients and links to download instructions at the [Appium clients list](/docs/en/about-appium/appium-clients.md).

#### iOS Requirements

* Mac OS X 10.10 or higher, 10.11.1 recommended
* XCode &gt;= 6.0, 7.1.1 recommended
* Apple Developer Tools (iPhone simulator SDK, command line tools)
* [Ensure you read our documentation on setting yourself up for iOS testing!](/docs/en/appium-setup/running-on-osx.md)

#### Android Requirements

* [Android SDK](http://developer.android.com) API &gt;= 17 (Additional features require 18/19)
* Appium supports Android on OS X, Linux and Windows. Make sure you follow the
  directions for setting up your environment properly for testing on different OSes:
  * [linux](/docs/en/appium-setup/running-on-linux.md)
  * [osx](/docs/en/appium-setup/running-on-osx.md)
  * [windows](/docs/en/appium-setup/running-on-windows.md)

#### Windows Requirements

* Windows 10
* [Documentation](/docs/en/appium-setup/running-on-windows.md)

#### Mac Requirements

* Mac OS X 10.7 +
* [Documentation](https://github.com/penguinho/appium/blob/mac-driver/docs/en/appium-setup/running-on-osx.md#testing-mac-apps)

### Quick Start

Kick up an Appium server, and then run a test written in your favorite [WebDriver](https://w3c.github.io/webdriver/webdriver-spec.html)-compatible language!
You can run an Appium server using node.js or using the application, see below.

#### Using Node.js

```
$ npm install -g appium
$ appium
```

As we said above, you may want to run `appium-doctor` to ensure your system is set up properly:

```
$ npm install -g appium-doctor
$ appium-doctor
```

#### Using the Appium Desktop App

* [Download the Appium app](https://www.github.com/appium/appium-desktop/releases/latest/)
* Run it!

### Writing Tests for Appium

The main guide for getting started writing and running tests is [the running tests](/docs/en/writing-running-appium/running-tests.md) doc, which includes explanations for iOS, Android, and Android older devices. If you're interested in testing on physical hardware, you might be interested in our [real devices guide](/docs/en/appium-setup/real-devices.md).

(*Note*: If you're automating iOS 10+, be sure to check out our [XCUITest Migration Guide](/docs/en/advanced-concepts/migrating-to-xcuitest.md) since Apple's automation support has changed significantly since iOS 10, with corresponding changes in Appium).

Essentially, we support a subset of the [Selenium WebDriver JSON Wire Protocol](https://w3c.github.io/webdriver/webdriver-spec.html), and extend it so that you can specify mobile-targeted [desired capabilities](/docs/en/writing-running-appium/caps.md) to run your test through Appium.

You find elements by using a subset of WebDriver's element-finding strategies.
See [finding elements](/docs/en/writing-running-appium/finding-elements.md) for detailed information. We also have several extensions to the JSON Wire Protocol for [automating mobile gestures](/docs/en/writing-running-appium/touch-actions.md) like tap, flick, and swipe.

You can also automate web views in hybrid apps! See the [hybrid app guide](/docs/en/advanced-concepts/hybrid.md)

This repository contains [many examples of tests in a variety of different languages](https://github.com/appium/sample-code)!

For the full list of Appium doc pages, visit [this directory](/docs/en/).

### How It Works

Appium drives various native automation frameworks and provides an API based on
Selenium's [WebDriver JSON wire protocol](https://w3c.github.io/webdriver/webdriver-spec.html).

For new iOS versions (9.3 and up), Appium drives Apple's XCUITest library. Our support for XCUITest utilizes Facebook's [WebDriverAgent](https://github.com/facebook/webdriveragent) project.

For older iOS versions (9.3 and below), Appium drives Apple's UIAutomation library, using a strategy which is based on [Dan Cuellar's](http://github.com/penguinho) work on iOS Auto.

Android support uses the UiAutomator framework for newer platforms and
[Selendroid](http://github.com/DominikDary/selendroid) for older Android platforms.

Windows support uses Microsoft's [WinAppDriver](https://github.com/Microsoft/WinAppDriver)

### Contributing

Please take a look at our [contribution documentation](CONTRIBUTING.md)
for instructions on how to build, test and run Appium from source.

### Roadmap

Interested in where Appium is heading in the future? Check out the [Roadmap](ROADMAP.md)

### Project History, Credits & Inspiration

* [History](http://appium.io/history)
* [Credits](/docs/en/contributing-to-appium/credits.md)

### User Forums

Announcements and debates often take place on the [Discussion Group](https://discuss.appium.io), be sure to sign up!

### Troubleshooting

We put together a [troubleshooting guide](/docs/en/appium-setup/troubleshooting.md).
Please have a look here first if you run into any problems. It contains instructions for checking a lot
of common errors and how to get in touch with the community if you're stumped.

### Using Robots

Using Appium with [Tapster](https://github.com/hugs/tapsterbot) and other robots is possible,
check out the [Appium Robots](https://github.com/appium/robots) project!

### License

[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bhttps%3A%2F%2Fgithub.com%2Fappium%2Fappium.svg?type=large)](https://app.fossa.io/projects/git%2Bhttps%3A%2F%2Fgithub.com%2Fappium%2Fappium?ref=badge_large)
