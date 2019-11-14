## The Espresso Driver for Android

Appium currently has support for the
[Espresso](https://developer.android.com/training/testing/espresso/index.html)
automation technology via its own Espresso driver. This driver works by kicking
off an Espresso run on a device, with our own automation server as part of the
Espresso test APK.  Appium can then communicate with this automation server and
trigger Espresso commands as the result of Appium client calls.

Development of the Espresso driver happens at the
[appium-espresso-driver](https://github.com/appium/appium-espresso-driver)
repo.

Appium also supports Android automation using the
[UiAutomator2 Driver](/docs/en/drivers/android-uiautomator2.md).)

### Requirements and Support

In addition to Appium's general requirements:

* Java 7 installed and configured correctly for your platform
* Mac, Windows, or Linux OS with the ability to run the Android SDK

### Usage

The way to start a session using the Espresso driver is to include the
`automationName` [capability](#TODO) in your [new session request](#TODO), with
the value `Espresso`. Of course, you must also include appropriate
`platformName` (=`Android`), `platformVersion`, `deviceName`, and `app`
capabilities, at a minimum.

### Capabilities

The Espresso driver currently supports a subset of the standard [Android
capabilities](/docs/en/writing-running-appium/caps.md#android-only).

### Setup

Setup for the Espresso driver basically entails getting the Android SDK and
build tools ready to go. You can follow the instructions at the [UiAutomator2
Driver doc](android-uiautomator2.md#basic-setup), since the steps are the same.
