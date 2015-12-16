## Running Appium on Mac OS X

Appium on OS X supports iOS and Android testing.

### System setup (iOS)

* Appium requires Mac OS X 10.7 or greater. We recommend OS X 10.10.
* Make sure you have Xcode and the iOS SDK(s) installed. Xcode version 7.1 is
  recommended as earlier versions of Xcode are limited in which versions of iOS
  they can test against. See the next section for more detail.
* You need to authorize use of the iOS Simulator by running `sudo authorize_ios`
  (`authorize_ios` is a binary made available by the Appium npm package). If you
  are running [Appium.app](https://github.com/appium/appium-dot-app), you can
  authorize iOS through the GUI.
* If you're on Xcode 7.x, Instruments Without Delay (IWD) does not work. You can
  enable IWD (which will significantly speed up your tests) using
  [this method](/docs/en/advanced-concepts/iwd_xcode7.md)
* If you're on Xcode 6, you need to launch each simulator you intend to use
  with appium in advance, and change the default to actually show the soft
  keyboard if you want sendKeys to work. You can do this by clicking on any
  textfield and hitting command-K until you notice the soft keyboard show up.
* If you're on Xcode 6, you have a feature in Xcode called Devices
  (command-shift-2). You need to make sure that whichever deviceName you choose
  to use with Appium in your capabilities, there is only one of those per sdk
  version. In other words, if you send in a deviceName cap of "iPhone 5s" and
  a platformVersion cap of "8.0", you need to make sure that there is exactly
  one device with the name "iPhone 5s" and the 8.0 sdk in your devices list.
  Otherwise, Appium won't know which one to use.
* In iOS8, devices each have their own setting which enables or disables
  UIAutomation. It lives in a "Developer" view in the Settings app. You need to
  verify that UIAutomaion is enabled in this view before the simulator or
  device can be automated.

### Testing against multiple iOS SDKs

Xcode version 7.1 allows for automatic testing against iOS versions 7.1 and later.

If you're using multiple Xcode versions, you can switch between them using:

    sudo xcode-select --switch &lt;path to required xcode&gt;

### System setup (Android)

Instructions for setting up Android and running tests on Mac OS X are the same as
those on Linux. See the [Android setup docs](/docs/en/appium-setup/android-setup.md).
