## Appium

[![NPM version](https://badge.fury.io/js/appium.svg)](https://npmjs.org/package/appium)
[![Dependency Status](https://david-dm.org/appium/appium.svg)](https://david-dm.org/appium/appium)
[![devDependency Status](https://david-dm.org/appium/appium/dev-status.svg)](https://david-dm.org/appium/appium#info=devDependencies)

[![Monthly Downloads](https://img.shields.io/npm/dm/appium.svg)](https://npmjs.org/package/appium)

[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bhttps%3A%2F%2Fgithub.com%2Fappium%2Fappium.svg?type=shield)](https://app.fossa.io/projects/git%2Bhttps%3A%2F%2Fgithub.com%2Fappium%2Fappium?ref=badge_shield)

Appium is an open-source, cross-platform test automation tool for native,
hybrid, and mobile web and desktop apps. We support simulators (iOS), emulators
(Android), and real devices (iOS, Android, Windows, Mac).

Want to skip straight to the action? Check out our [getting
started](/docs/en/about-appium/getting-started.md) doc.

### Supported Platforms

Appium supports app automation across a variety of platforms, like iOS,
Android, and Windows. Each platform is supported by one or more "drivers",
which know how to automate that particular platform.

Please refer to [Appium Platform Support](/docs/en/about-appium/platform-support.md) for more details.

### Why Appium?

1. You don't have to recompile your app or modify it in any way, due
   to the use of standard automation APIs on all platforms.
2. You can write tests with your favorite dev tools using any
   [WebDriver](https://w3c.github.io/webdriver/webdriver-spec.html)-compatible
   language such as Java, Objective-C, JavaScript (Node), PHP, Python, Ruby,
   C#, Clojure, or Perl with the Selenium WebDriver API and [language-specific
   client libraries](/docs/en/about-appium/appium-clients.md).
3. You can use any testing framework.
4. Appium has built-in mobile web and hybrid app support. Within the same
   script, you can switch seamlessly between native app automation and webview
   automation, all using the WebDriver model that's already the standard for
   web automation.

Investing in the
[WebDriver](https://w3c.github.io/webdriver/webdriver-spec.html) protocol means
you are betting on a single, free, and open protocol for testing that has become
a web standard. Don't lock yourself into a proprietary stack.

For example, if you use Apple's XCUITest library without Appium you can only
write tests using Obj-C/Swift, and you can only run tests through Xcode.
Similarly, with Google's UiAutomator or Espresso, you can only write tests in
Java/Kotlin. Appium opens up the possibility of true cross-platform native app
automation, for mobile and beyond. Finally!

If you're new to Appium or want a more comprehensive description of what this is all
about, please read our [Introduction to Appium
Concepts](/docs/en/about-appium/intro.md).

### Requirements

Your environment needs to be set up for the particular platforms that you want
to run tests on. Each of the drivers above documents the requirements for their
particular brand of automation. At a minimum, you will need to be able to run
Node.js 10+.

### Get Started

Check out our [Getting Started](/docs/en/about-appium/getting-started.md) guide
to get going with Appium.

There is also a sample code that contains [many examples of tests in a variety
of different languages](https://github.com/appium/appium/tree/master/sample-code)!

### Documentation

For prettily-rendered docs, please visit [appium.io](http://appium.io). You can
always find the full list of Appium doc pages at [Appium's GitHub
Repo](https://github.com/appium/appium/tree/master/docs/en/) as well.

[update-appium-io.yml](https://github.com/appium/appium/blob/master/ci-jobs/update-appium-io.yml) creates a PR
by [CI job](https://dev.azure.com/AppiumCI/Appium%20CI/_build?definitionId=37).
in the appium.io repository with the documentation update.

Once the PR has been merged, the latest documentation will be in [appium.io](http://appium.io)

### Contributing

Please take a look at our [contribution documentation](CONTRIBUTING.md)
for instructions on how to build, test, and run Appium from the source.

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
guide](/docs/en/writing-running-appium/other/troubleshooting.md).  Please have a look
here first if you run into any problems. It contains instructions for checking
a lot of common errors and how to get in touch with the community if you're
stumped.

### License

[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bhttps%3A%2F%2Fgithub.com%2Fappium%2Fappium.svg?type=large)](https://app.fossa.io/projects/git%2Bhttps%3A%2F%2Fgithub.com%2Fappium%2Fappium?ref=badge_large)
