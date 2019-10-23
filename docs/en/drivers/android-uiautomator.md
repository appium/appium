## The UiAutomator Driver for Android

Appium's older support for automating Android apps is via the `UiAutomator`
driver.  _(New to Appium? Read our [introduction to Appium drivers](#TODO))_.
This driver leverages Google's
[UiAutomator](https://developer.android.com/training/testing/ui-automator.html)
technology to launch automation sessions on a device.

Development of the UiAutomator driver happens at the
[appium-android-driver](https://github.com/appium/appium-android-driver)
repo.

We recommend you upgrade to the [UiAutomator2 Driver](android-uiautomator2.md)
and use that driver instead, since this driver will not be supported moving
forward.

### Requirements and Support

In addition to Appium's general requirements:

* Java 7 installed and configured correctly for your platform
* Mac, Windows, or Linux OS with the ability to run the Android SDK

### Usage

The way to start a session using the UiAutomator driver is to include the
`platformName` [capability](#TODO) in your [new session request](#TODO), with
the value `Android`. Of course, you must also include appropriate
`platformVersion`, `deviceName`, and `app` capabilities, at a minimum. In the
case of this driver, for Appium versions below `1.14.0` no `automationName`
capability should be used, while for version `1.14.0` and above the `automationName`
should be set to `UiAutomator1`.

It is highly recommended to also set the `appPackage` and `appActivity`
capabilities in order to let Appium know exactly which package and activity
should be launched for your application. Otherwise, Appium will try to
determine these automatically from your app manifest.

### Capabilities

The UiAutomator driver supports a number of standard [Appium
capabilities](/docs/en/writing-running-appium/caps.md), but has an additional
set of capabilities that modulate the behavior of the driver. These can be
found currently at the [Android
section](/docs/en/writing-running-appium/caps.md#android-only) of the
aforementioned doc.

For web tests, to automate Chrome instead of your own application, leave the
`app` capability empty and instead set the `browserName` capability to
`Chrome`. Note that you are responsible for ensuring that Chrome is on the
emulator/device, and that it is of a version compatible with Chromedriver.


### Commands

To see the various commands Appium supports, and specifically for information
on how the commands map to behaviors for the UiAutomator driver, see the [API
Reference](#TODO).


### Setup

Given that the setup instructions for this driver and the newer UiAutomator2
Driver are identical, please refer to the system, emulator, and device setup
instructions on the [UiAutomator2
Driver](/docs/en/drivers/android-uiautomator2.md) doc.
