## The Selendroid Driver for Android

> **Note**: This driver is _DEPRECATED_ and should not be used unless
> absolutely necessary. The information in this doc may not keep up to date
> with reality, and the driver will be removed in a future version of Appium.
> To begin Android automation with Appium today, please use the [UiAutomator2
> Driver](/docs/en/drivers/android-uiautomator2.md) instead.

Appium's support for very old versions of Android (4.1 and below) comes via
a project called [Selendroid](http://selendroid.io). Selendroid is an
Instrumentation-based automation framework.

Development of the Selendroid driver happens at the
[appium-selendroid-driver](https://github.com/appium/appium-selendroid-driver)
repo.

### Requirements and Support

In addition to Appium's general requirements:

* Java 6+ installed and configured correctly for your platform
* Mac, Windows, or Linux OS with the ability to run the Android SDK

### Usage

The way to start a session using the Selendroid driver is to include the
`automationName` [capability](#TODO) in your [new session request](#TODO), with
the value `Selendroid`. Of course, you must also include appropriate
`platformName` (=`Android`), `platformVersion`, `deviceName`, and `app`
capabilities, at a minimum.

It is highly recommended to also set the `appPackage` and `appActivity`
capabilities in order to let Appium know exactly which package and activity
should be launched for your application.

### Capabilities

The Selendroid driver supports a subset of the standard [Android
capabilities](/docs/en/writing-running-appium/caps.md#android-only).

### Commands

Selendroid's API differs from Appium's other Android drivers significantly. We
recommend you thoroughly read [Selendroid's
documentation](http://selendroid.io/native.html) before writing your scripts
for older devices or hybrid apps.

### Setup

Setup for the Selendroid driver basically entails getting the Android SDK and
build tools ready to go. You can follow the instructions at the [UiAutomator2
Driver doc](android-uiautomator2.md#basic-setup), since the steps are the same.
