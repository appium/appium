## Appium

[![NPM version](https://badge.fury.io/js/appium.svg)](https://npmjs.org/package/appium)
[![Monthly Downloads](https://img.shields.io/npm/dm/appium.svg)](https://npmjs.org/package/appium)

[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bhttps%3A%2F%2Fgithub.com%2Fappium%2Fappium.svg?type=shield)](https://app.fossa.io/projects/git%2Bhttps%3A%2F%2Fgithub.com%2Fappium%2Fappium?ref=badge_shield)

[![StandWithUkraine](https://raw.githubusercontent.com/vshymanskyy/StandWithUkraine/main/badges/StandWithUkraine.svg)](https://github.com/vshymanskyy/StandWithUkraine/)

[![Stand With Ukraine](https://raw.githubusercontent.com/vshymanskyy/StandWithUkraine/main/banner2-direct.svg)](https://vshymanskyy.github.io/StandWithUkraine/)

Appium is an open-source, cross-platform test automation tool for native,
hybrid, mobile web and desktop apps. Initially created to automate iOS and Android mobile
applications Appium has grown to a full-featured platform that provides [WebDriver](https://www.w3.org/TR/webdriver/)-based automation possibilities for the whole set of different mobile and desktop platforms.
See [Drivers Maintained By The Appium Team](#drivers-maintained-by-the-appium-team)
and [Drivers Provided By Third Parties](#drivers-provided-by-third-parties) sections below for more details.

:bangbang: Major documentation revision in progress

:bangbang: Appium core team does not maintain Appium 1.x anymore since the 1st of January 2022. All recent versions of officially supported platform drivers are not compatible to Appium 1.x anymore, and require Appium 2 to run. [Please read the migration guide from 1.x to 2.0](https://appium.github.io/appium/docs/en/latest/guides/migrating-1-to-2/) to manage the Appium server.

Appium is in the final stages of a major revision (to version 2.0). As such, the documentation
found around the web may not be correct. The current Appium 2.0 documentation is very much in
progress. Currently, it can be found [here](https://appium.github.io/appium/docs/en/latest/).

### Requirements

- macOS, Linux or Windows operating system
- Node.js 14+
- NPM (Node Package Manager) 8+

These are only server requirements. Each driver might have its own requirements. Consider checking the corresponding driver tutorial for more details.

### Server

To install Appium 2 server using Node Package Manager (npm) run the following command:

```bash
npm install -g appium@next
```

:bangbang: Running `npm install -g appium` would still install Appium 1 because version 2 is in its late beta stage.

### Drivers

Appium supports app automation across a variety of platforms, like iOS,
Android, and Windows. Each platform is supported by one or more "drivers",
which know how to automate that particular platform. Since version 2.0
all drivers have been isolated from the Appium server app and can
be managed independently using the [appium driver](https://appiumpro.com/editions/122-installing-appium-20-and-the-driver-and-plugins-cli) command line interface.

In general, the drivers management in Appium 2 is as simple as:

```bash
# To install a new driver from npm
appium driver install --source=npm appium-xcuitest-driver[@<version>]
# To install a driver from a local folder (useful for developers)
appium driver install --source=local /Users/me/sources/appium-xcuitest-driver
# To install a new driver from github (hm, maybe it's time to publish it to NPM?)
appium driver install --source=github appium/appium-xcuitest-driver

# To list already installed drivers
appium driver list --installed

# To update a driver (it must be already installed)
appium driver update xcuitest

# To uninstall a driver (it won't last forever, wouldn't it?)
appium driver uninstall xcuitest
```

You can find a full list of
[officially-supported](https://appium.github.io/appium/docs/en/latest/ecosystem/#drivers) and
[third-party](https://appium.github.io/appium/docs/en/latest/ecosystem/#other-drivers) drivers at
the current Appium 2.0 documentation.

### Plugins

The concept of plugins is something new that has been added exclusively to Appium2. Plugins allow you to extend server functionality without changing the server code. Plugins could be managed similarly to drivers:

```bash
# To install an officially supported plugin
appium plugin install images
# To install a plugin from a local folder (useful for developers)
appium plugin install --source=local /Users/me/sources/images
# To install a new plugin from npm
appium plugin install --source=npm appium-device-farm

# To list already installed plugins
appium plugin list --installed

# To update a plugins (it must be already installed)
appium plugin update appium-device-farm

# To uninstall a plugin
appium plugin uninstall appium-device-farm
```

The main difference between drivers and plugins is that the latter must be explicitly enabled on server startup after it was installed (drivers are enabled by default after installation):

```bash
appium server --use-plugins=device-farm,images
```

You can find a full list of
[officially-supported](https://appium.github.io/appium/docs/en/latest/ecosystem/#plugins) and
[third-party](https://appium.github.io/appium/docs/en/latest/ecosystem/#other-plugins) plugins at
the current Appium 2.0 documentation.


### Server Command Line Interface

In order to start sending commands to Appium over the wire it must be listening
on the URL where your client library expects it to listen.
Use the following commands to run and configure Appium server:

```bash
# Start the server on the default port and host (e.g. http://0.0.0.0:4723/)
appium server
# Start the server on the given port, host and use the base path prefix (the default prefix is /)
appium server -p 9000 -a 127.0.0.1 -pa /wd/hub

# Get the list of all supported command line parameters.
# This list would also include descriptions of driver-specific
# command line arguments for all installed drivers.
# Each driver and plugin must have their command line arguments
# exposed in a special JSON schema declared as a part of the corresponding
# package.json file.
appium server --help
```

Appium supports execution of parallel server processes as well as parallel driver sessions within
single server process. Refer the corresponding driver documentations regarding which mode is optimal
for the particular driver or whether it supports parallel sessions.

### Why Appium?

1. You usually don't have to recompile your app or modify it in any way, due
   to the use of standard automation APIs on all platforms.
2. You can write tests with your favorite dev tools using any
   [WebDriver](https://w3c.github.io/webdriver/webdriver-spec.html)-compatible
   language such as [Java](https://github.com/appium/java-client),
   [JavaScript](https://webdriver.io/), [Python](https://github.com/appium/python-client),
   [Ruby](https://github.com/appium/ruby_lib), [C#](https://github.com/appium/dotnet-client)
   with the Selenium WebDriver API. There are also various third party
   client implementations for other languages.
3. You can use any testing framework.
4. Some drivers, like xcuitest and uiautomator2 ones have built-in mobile web and
   hybrid app support. Within the same script, you can switch seamlessly between native
   app automation and webview automation, all using the WebDriver model that's already
   the standard for web automation.
5. You can run your automated tests locally and in a cloud. There are multiple
   cloud providers that support various Appium drivers (mostly
   targeting iOS and Android mobile automation).
6. [Appium Inspector](https://github.com/appium/appium-inspector) allows
   visual debugging of automated tests and could be extremely useful for
   beginners.

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
about, please read our [Introduction to Appium Concepts](/docs/en/about-appium/intro.md).

### Quickstart

Check out our [Quickstart](https://appium.github.io/appium/docs/en/latest/quickstart/) guide
to get going with Appium.

There is also a sample code that contains [many examples of tests in a variety
of different languages](https://github.com/appium/appium/tree/1.x/sample-code)!

### Documentation

For prettily-rendered docs, please visit [Appium Documentation](https://appium.github.io/appium).
You can always find the full list of Appium doc pages at [Appium's GitHub
Repo](https://github.com/appium/appium/tree/master/packages/appium/docs) as well.

### Contributing

Please take a look at our [contribution documentation](CONTRIBUTING.md)
for instructions on how to build, test, and run Appium from the source.

### Roadmap

Interested in where Appium is heading in the future? Check out the [Roadmap](ROADMAP.md)

### Project History, Credits & Inspiration

* [History](https://appium.github.io/appium/docs/en/latest/intro/history/)

### User Forums

Announcements and debates often take place on the [Discussion Group](https://discuss.appium.io),
be sure to sign up!

### Troubleshooting

We put together a [troubleshooting guide](/docs/en/writing-running-appium/other/troubleshooting.md).
Please have a look here first if you run into any problems. It contains instructions for checking
a lot of common errors and how to get in touch with the community if you're
stumped.

### License

[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bhttps%3A%2F%2Fgithub.com%2Fappium%2Fappium.svg?type=large)](https://app.fossa.io/projects/git%2Bhttps%3A%2F%2Fgithub.com%2Fappium%2Fappium?ref=badge_large)
