## The Safari Driver

Safari driver has been added to Appium since version 1.20. This driver
is a wrapper over Apple's [safaridriver](https://developer.apple.com/documentation/webkit/testing_with_webdriver_in_safari?language=objc)
binary, which is included to the standard Mac OS distribution and implements communication with either
desktop or mobile Safari browser via [W3C WebDriver protocol](https://www.w3.org/TR/webdriver/).

Development of the Safari driver happens at the
[appium-safari-driver](https://github.com/appium/appium-safari-driver)
repo.

Appium also supports mobile Safari automation and Safari web views automation using the
[appium-remote-debugger](https://github.com/appium/appium-remote-debugger). This module is
used to implement context switching feature with XCUITest automation name. It is more universal
and flexible than the current Safari driver, however it is using the undocumented WebKit communication
protocol under the hood. Which means the development of it and the effort to keep it in working state
is comparably high while the list of supported features is smaller. On the other hand `safaridriver`
is maintained by Apple, which means it is always in sync with the most recent browser
and communication protocol requirements.

Long story short, it makes sense to prefer this driver if it is necessary to only automate
a web application that only works in Safari browser (either mobile or desktop). In case it is necessary to interact with native context or switch between different applications/contexts while automating your scenario
then the obvious choice would be either [XCUITest Driver](/docs/en/drivers/ios-xcuitest.md)
(for the mobile platform) or [Mac driver](/docs/en/drivers/mac.md) (for the desktop platform).

### Requirements and Support

In addition to Appium's general requirements:

* Run the `safaridriver --enable` command from the Mac OS terminal and provide your administrator password before any automated session will be executed. This only should be done once.
* In order to automate Safari on real devices it is necessary to enable Remote Automation switch in `Settings → Safari → Advanced → Remote Automation` for these particular devices and trust them on the target host. The device's screen must not be locked while starting tests.
* Only Mac OS (High Sierra or newer) is supported as the host platform.
* Only iOS 13 and newer is supported for mobile browser automation.

### Usage

The way to start a session using the Safari driver is to include the
`automationName` capability in your new session request, with
the value `Safari`. Of course, you must also include appropriate
`platformName` (`Mac` or `iOS`). Read
https://github.com/appium/appium-safari-driver/blob/master/README.md for
more details.

### Capabilities

The list of available driver capabilities could be found at
https://github.com/appium/appium-safari-driver/blob/master/README.md
