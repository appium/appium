## Running Appium on Mac OS X

Appium on OS X supports iOS and Android testing.

### System setup (iOS)

* Appium requires Mac OS X 10.7, but 10.8 or 10.9 is recommended.
* Make sure you have Xcode and the iOS SDK(s) installed. Xcode version 5.1 is
  recommended as earlier versions of Xcode are limited in which version of iOS
  they can test against. See the next section for more detail.
* You need to authorize use of the iOS Simulator. If you are running Appium
  from NPM, you'll do this by running `sudo authorize_ios` (`authorize_ios` is
  a binary made available by the Appium npm package). If you're running Appium
  from source, simply run `sudo grunt authorize` to do the same thing. If you
  are running [Appium.app](https://github.com/appium/appium-dot-app), you can
  authorize iOS through the GUI.

### Testing against multiple iOS SDKs

Xcode version 5.1 allows for automatic testing against iOS versions 6.0 and later.
If using version 5.1, you can ignore the rest of this section.

For Xcode 4.6.3 to 5.0, Apple's `instruments` binary, which Appium uses to launch
the iOS simulator, by default uses the currently-selected Xcode, and the highest
iOS SDK installed with that version of Xcode. This means that if you want to test
iOS 6.1, but have iOS 7.1 installed, Appium will be forced to use the 7.1 Simulator
regardless. The only way around this is to have multiple copies of Xcode
installed with different sets of SDKs. You can then switch to the particular
copy of Xcode that has the versions you want to test with before starting
Appium.

In addition, it's been discovered that testing against iOS 6.1 with Xcode
5 causes increased slowness and instability, so it's recommended that for
testing against iOS 6.1 and below we use Xcode 4.6.3, and for testing against
iOS 7.0 we use Xcode 5. We can do this by, say, having Xcode 5 at
`/Applications/Xcode.app`, and Xcode 4.6 and `/Applications/Xcode-4.6.app`.
Then we use the following command:

    sudo xcode-select -switch /Applications/Xcode-4.6.app/Contents/Developer/

To prepare for iOS 6.1 testing. We run it again with a different Xcode:

    sudo xcode-select -switch /Applications/Xcode.app/Contents/Developer/

To go back to iOS 7.1 testing.

### System setup (Android)

Instructions for setting up Android and running tests on Mac OS X are the same as
those on Linux. See the [Android setup docs](/docs/en/appium-setup/android-setup.md).
