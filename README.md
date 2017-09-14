## Appium

[![NPM version](https://badge.fury.io/js/appium.svg)](https://npmjs.org/package/appium)
[![Dependency Status](https://david-dm.org/appium/appium.svg)](https://david-dm.org/appium/appium)
[![devDependency Status](https://david-dm.org/appium/appium/dev-status.svg)](https://david-dm.org/appium/appium#info=devDependencies)

[![Monthly Downloads](https://img.shields.io/npm/dm/appium.svg)](https://npmjs.org/package/appium)
[![Pull Requests](http://issuestats.com/github/appium/appium/badge/pr?style=flat)](http://issuestats.com/github/appium/appium)
[![Issues Closed](http://issuestats.com/github/appium/appium/badge/issue?style=flat)](http://issuestats.com/github/appium/appium)

[![Build Status](https://team-appium.ci.cloudbees.com/job/Appium/badge/icon)](https://team-appium.ci.cloudbees.com/job/Appium/)
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bhttps%3A%2F%2Fgithub.com%2Fappium%2Fappium.svg?type=shield)](https://app.fossa.io/projects/git%2Bhttps%3A%2F%2Fgithub.com%2Fappium%2Fappium?ref=badge_shield)

Appium is an open source, cross-platform test automation tool for native,
hybrid and mobile web and desktop apps. We support simulators (iOS), emulators
(Android), and real devices (iOS, Android, Windows, Mac).


### Supported Platforms

Each platform is supported by one or more "drivers", which know how to automate
that particular platform. Choose a driver below for specific information about
that driver, and how to set your system up for using it:

* iOS
    * The [XCUITest Driver](/docs/en/drivers/ios-xcuitest.md)
    * (DEPRECATED) The [UIAutomation Driver](/docs/en/drivers/ios-uiautomation.md)
* Android
    * (BETA) The [Espresso Driver](/docs/en/drivers/android-espresso.md)
    * The [UiAutomator2 Driver](/docs/en/drivers/android-uiautomator2.md)
    * (DEPRECATED) The [UiAutomator Driver](/docs/en/drivers/android-uiautomator.md)
    * (DEPRECATED) The [Selendroid Driver](/docs/en/drivers/android-selendroid.md)
* The [Windows Driver](/docs/en/drivers/windows.md) (for Windows Desktop apps)
* The [Mac Driver](/docs/en/drivers/mac.md) (for Mac Desktop apps)

### Why Appium?

1. You don't have to recompile your app or modify it in any way, due
   to use of standard automation APIs on all platforms.
2. You can write tests with your favorite dev tools using any
   [WebDriver](https://w3c.github.io/webdriver/webdriver-spec.html)-compatible
   language such as Java, Objective-C, JavaScript (Node), PHP, Python, Ruby,
   C#, Clojure, or Perl with the Selenium WebDriver API and [language-specific
   client libraries](/docs/en/about-appium/appium-clients.md).
3. You can use any testing framework.

Investing in the
[WebDriver](https://w3c.github.io/webdriver/webdriver-spec.html) protocol means
you are betting on a single, free and open protocol for testing that has become
a web standard. Don't lock yourself into a proprietary stack.

For example, if you use Apple's XCUITest library without Appium you can only
write tests using Obj-C/Swift, and you can only run tests through Xcode.
Similarly, with Google's UiAutomator or Espresso you can only write tests in
Java. Appium opens up the possibility of true cross-platform native app
automation, for mobile and beyond. Finally!

### I don't get it yet...

If you're new to Appium, or want a fuller description of what this is all
about, please read our [Introduction to Appium
Concepts](/docs/en/about-appium/intro.md).

### Requirements

Your environment needs to be set up for the particular platforms that you want
to run tests on. Each of the drivers above documents the requirements for their
particular brand of automation.

If you want to run Appium via an `npm install`, hack with or contribute to
Appium, you will need [node.js and npm](http://nodejs.org) 4 or greater (use
[n](https://github.com/visionmedia/n) or `brew install node` to install
Node.js. Make sure you have not installed Node or Appium with `sudo`, otherwise
you'll run into problems). We recommend the latest stable version.

To verify that all of Appium's dependencies are met you can use
`appium-doctor`.  Install it with `npm install -g appium-doctor` (or run it
from [source](https://github.com/appium/appium-doctor)), then run
`appium-doctor` and supply the `--ios` or `--android` flags to verify that all
of the dependencies are set up correctly.

You also need to download the Appium client for your language so you can write
tests. The Appium clients are simple extensions to the WebDriver clients. You
can see the list of clients and links to download instructions at the [Appium
clients list](/docs/en/about-appium/appium-clients.md).

### Quick Start

Kick up an Appium server, and then run a test written in your favorite
[WebDriver](https://w3c.github.io/webdriver/webdriver-spec.html)-compatible
language!  You can run an Appium server using node.js or using Appium Desktop;
see below.

#### Using Node.js

```
npm install -g appium
appium
```

As we said above, you may want to run `appium-doctor` to ensure your system is
set up properly:

```
npm install -g appium-doctor
appium-doctor
```

#### Using the Appium Desktop App

* [Download Appium Desktop](https://www.github.com/appium/appium-desktop/releases/latest/)
* Run it!

### How it Works

To see how to start session with a particular Appium driver, refer to that
driver's specific doc page.

Essentially, we support a subset of the [Selenium WebDriver JSON Wire
Protocol](https://w3c.github.io/webdriver/webdriver-spec.html), and extend it
so that you can specify mobile-targeted [desired
capabilities](/docs/en/writing-running-appium/caps.md) to run your test through
Appium.

You find elements by using a subset of WebDriver's element-finding strategies.
See [finding elements](/docs/en/writing-running-appium/finding-elements.md) for
detailed information. We also have several extensions to the JSON Wire Protocol
for [automating mobile
gestures](/docs/en/writing-running-appium/touch-actions.md) like tap, flick,
and swipe.

You can also automate webviews in hybrid apps! See the [hybrid app
guide](/docs/en/advanced-concepts/hybrid.md)

This repository contains [many examples of tests in a variety of different languages](https://github.com/appium/sample-code)!

For the full list of Appium doc pages, visit [this directory](/docs/en/).

### Contributing

Please take a look at our [contribution documentation](CONTRIBUTING.md)
for instructions on how to build, test and run Appium from source.

### Roadmap

Interested in where Appium is heading in the future? Check out the [Roadmap](ROADMAP.md)

### Project History, Credits & Inspiration

* [History](http://appium.io/history)
* [Credits](/docs/en/contributing-to-appium/credits.md)

### User Forums

Announcements and debates often take place on the [Discussion
Group](https://discuss.appium.io), be sure to sign up!

### Troubleshooting

We put together a [troubleshooting
guide](/docs/en/writing-running-appium/troubleshooting.md).  Please have a look
here first if you run into any problems. It contains instructions for checking
a lot of common errors and how to get in touch with the community if you're
stumped.

### Using Robots

Using Appium with [Tapster](https://github.com/hugs/tapsterbot) and other
robots is possible, check out the [Appium
Robots](https://github.com/appium/robots) project!

### License

[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bhttps%3A%2F%2Fgithub.com%2Fappium%2Fappium.svg?type=large)](https://app.fossa.io/projects/git%2Bhttps%3A%2F%2Fgithub.com%2Fappium%2Fappium?ref=badge_large)
