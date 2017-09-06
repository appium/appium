## Running Appium on Mac OS X

Appium on OS X supports iOS and Android testing.

### Testing iOS Apps

Instructions for gettting going with one of our iOS drivers are included here:

* The [XCUITest Driver](/docs/en/drivers/ios-xcuitest.md)
* The (deprecated) [UIAutomation Driver](/docs/en/drivers/ios-uiautomation.md)

### Testing Mac apps

Currently, the Mac app driver for appium does not ship with the AppiumForMac binary, which means, in order to automate Mac apps you must manually install the AppiumForMac application and grant it the appropriate OS X Accessibility permissions.

To Install Appium for Mac:
1. [Download a release](https://github.com/appium/appium-for-mac/releases/tag/0.2.0) and unzip the application into your `/Applications` folder
2. Follow the [brief supplemental installation instructions](https://github.com/appium/appium-for-mac#installation) to enable appium to have access to OS X's Accessibility APIs

For more information on using Appium for mac, checkout the [docs](https://github.com/appium/appium-for-mac#appium-for-mac).

### Testing Android App

Instructions for setting up Android and running tests on Mac OS X are the same as
those on Linux. See the [Android setup docs](/docs/en/appium-setup/android-setup.md).

