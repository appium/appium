## The Mac Driver for OS X

Appium has beta support for automation of OS X desktop applications.
Development of this driver happens at the
[appium-mac-driver](https://github.com/appium/appium-mac-driver), and relies on
a native OS X binary called
[AppiumForMac](https://github.com/appium/appium-for-mac).

### Requirements and Support

(In addition to Appium's general requirements)

* Mac OS X 10.7
* The AppiumForMac helper application downloaded and installed (see below)

### Usage

The way to start a session using the Mac driver is to include the
`platformName` [capability](#TODO) in your [new session request](#TODO), with
the value `Mac`. Also, ensure that you set the `deviceName` capability to `Mac`
as well.  Of course, you must also include appropriate `platformVersion` and
`app` capabilities, at a minimum.

### Getting AppiumForMac

Currently, this driver does not ship with the AppiumForMac binary, which means,
in order to automate Mac apps you must manually install the AppiumForMac
application and grant it the appropriate OS X Accessibility permissions.

To Install Appium for Mac:
1. [Download
   a release](https://github.com/appium/appium-for-mac/releases/latest) and
   unzip the application into your `/Applications` folder
2. Follow the [brief supplemental installation
   instructions](https://github.com/appium/appium-for-mac#installation) to
   enable Appium to have access to OS X's Accessibility APIs

(For more information on using AppiumForMac, check out the
[docs](https://github.com/appium/appium-for-mac))

