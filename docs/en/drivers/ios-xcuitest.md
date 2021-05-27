## The XCUITest Driver for iOS

Appium's primary support for automating iOS apps is via the `XCUITest` driver.
_(New to Appium? Read our [introduction to Appium drivers](#TODO))_. This driver
leverages Apple's
[XCUITest](https://developer.apple.com/library/content/documentation/DeveloperTools/Conceptual/testing_with_xcode/chapters/09-ui_testing.html)
libraries under the hood in order to facilitate automation of your app . This
access to XCUITest is mediated by the
[WebDriverAgent](https://github.com/facebook/webdriveragent) server.
WebDriverAgent (also referred to as "WDA") is a project managed by Facebook, to
which the Appium core team contributes heavily. WDA is a WebDriver-compatible
server that runs in the context of an iOS simulator or device and exposes the
XCUITest API. Appium's XCUITest driver manages WDA as a subprocess opaque to
the Appium user, proxies commands to/from WDA, and provides a host of
additional functionality (like simulator management and other methods, for
example).

Development of the XCUITest driver happens at the
[appium-xcuitest-driver](https://github.com/appium/appium-xcuitest-driver)
repo.

### Requirements and Support

In addition to Appium's general requirements:

* Apple's XCUITest library is only available on iOS simulators and devices that
  are running iOS 9.3 or higher.
* A Mac computer with macOS 10.11 or 10.12 is required.
* Xcode 7 or higher is required.
* The XCUITest driver was available in Appium starting with Appium 1.6.
* For correct functioning of the driver, additional system libraries are
  required (see the Setup sections below).

### Migrating from the UIAutomation Driver

If you are migrating to the XCUITest driver from Appium's old
[UIAutomation-based driver](/docs/en/drivers/ios-uiautomation.md), you may wish
to consult this [migration
guide](/docs/en/advanced-concepts/migrating-to-xcuitest.md).

### Usage

The way to start a session using the XCUITest driver is to include the
`automationName` [capability](#TODO) in your [new session request](#TODO), with
the value `XCUITest`. Of course, you must also include appropriate
`platformName`, `platformVersion`, `deviceName`, and `app` capabilities, at
a minimum.

The `platformName` should be `iOS` for iPhone or iPad. tvOS devices are available if the `platformName` is `tvOS`.

- iOS
   ```json
   {
      "automationName": "XCUITest",
      "platformName": "iOS",
      "platformVersion": "12.2",
      "deviceName": "iPhone 8",
      ...
   }
   ```
- tvOS
   ```json
   {
      "automationName": "XCUITest",
      "platformName": "tvOS",
      "platformVersion": "12.2",
      "deviceName": "Apple TV",
      ...
   }
   ```

### Capabilities

The XCUITest driver supports a number of standard [Appium
capabilities](/docs/en/writing-running-appium/caps.md), but has an additional
set of capabilities that modulate the behavior of the driver. These can be
found currently at the [appium-xcuitest-driver
README](https://github.com/appium/appium-xcuitest-driver#desired-capabilities).

To automate Safari instead of your own application, leave the `app` capability
empty and instead set the `browserName` capability to `Safari`.


### Commands

To see the various commands Appium supports, and specifically for information
on how the commands map to behaviors for the XCUITest driver, see the [API
Reference](#TODO).


### Basic Setup

_(We recommend the use of [Homebrew](https://brew.sh) for installing system
dependencies)_

1. Ensure that you have Appium's general dependencies (e.g., Node
   & NPM) installed and configured.

If you don't need to automate real devices, you're done! To automate an app on
the simulator, the `app` capability should be set to an absolute path or url
pointing to your `.app` or `.app.zip` file, built for the sim.

### Real Device Setup

Automating a real device with XCUITest is considerably more complicated, due to
Apple's restrictions around running apps on real devices. Please refer to the
[XCUITest real device setup doc](ios-xcuitest-real-devices.md) for
instructions.

Once set up, running a session on a real device is achieved by using the
following desired capabilities:

* `app` or `bundleId` - specifies the application (local path or url referencing
   your signed `.ipa` file) , or, if it is already installed, simply the bundle
   identifier of the app so that Appium can launch it.
* `udid` - the specific id of the device to test on. This can also be set to
   `auto` if there is only a single device, in which case Appium will determine
   the device id and use it.

### Optional Setup

* Install idb for better handling of various iOS Simulator operations,
such as: biometrics, geolocation setting and window focussing.
    * Read https://github.com/appium/appium-idb#installation to install necessary libraries (since Appium 1.14.0)

* Install [AppleSimulatorUtils](https://github.com/wix/AppleSimulatorUtils)
to use the [permissions capability](https://github.com/appium/appium-xcuitest-driver#desired-capabilities)

### Files generated by test runs

Testing on iOS generates files that can sometimes get large. These include
logs, temporary files, and derived data from Xcode runs. Generally the
following locations are where they are found, should they need to be deleted:

```
$HOME/Library/Logs/CoreSimulator/*
$HOME/Library/Developer/Xcode/DerivedData/*
```

### Configure keyboards
Over Appium 1.14.0, Appium configures keyboard preferences by default to make test running more stable. You can change sone of them via settings API.

- Turn `Auto-Correction` in _Keyboards_ off
- Turn `Predictive` in _Keyboards_ off
- Mark keyboard tutorial as complete
- (Only for Simulator) Toggle software keyboard on


### Server Arguments

Usage: `node . --driver-args='{"xcuitest": {[argNames]: [argValues]}}'`

'webkitDebugProxyPort': {
    default: 27753,
    type: 'int',
  },
  'wdaLocalPort': {
    default: 8100,
    type: 'int',
  }

<expand_table>

|Argument|Default|Description|Example|
|----|-------|-----------|-------|

|`"webkitDebugProxyPort"`|27753|Local port used for communication with ios-webkit-debug-proxy|`--driver-args='{"xcuitest": {"webkitDebugProxyPort": 27753}}'`|
|`"wdaLocalPort"`|8100| Local port used for communication with ios-web-driver-agent|`--driver-args='{"xcuitest": {"wdaLocalPort": 8100}}'`|