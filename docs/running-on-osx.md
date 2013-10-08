Running Appium on Mac OS X 
=======

Appium on OS X supports iOS and Android testing.

<a name="ios"></a>System setup (iOS)
--------

* Appium requires Mac OS X 10.7, but 10.8 is recommended.
* Make sure you have XCode and the iOS SDK(s) installed. (Appium currently
  supports Xcode 4.6.3 for iOS up to 6.1 and Xcode 5 for iOS 7.0. Note that
  testing against iOS versions below 7.0 using Xcode 5 is not recommended. See
  the next section for more information.)
* You need to authorize use of the iOS Simulator. If you are running Appium
  from NPM, you'll do this by running `sudo authorize_ios` (`authorize_ios` is
  a binary made available by the Appium npm package). If you're running Appium
  from source, simply run `sudo grunt authorize` to do the same thing. If you
  are running `Appium.app`, you can authorize iOS through the GUI.

<a name="ios_multiple"></a>Testing against multiple iOS SDKs
-----------

Apple's `instruments` binary, which Appium uses to launch the iOS simulator, by
default uses the currently-selected Xcode, and the highest iOS SDK installed
with that version of Xcode. This means that if you want to test iOS 6.1, but
have iOS 7.0 installed, Appium will be forced to use the 7.0 Simulator
regardless. The only way around this is to have multiple copies of Xcode
installed with different sets of SDKs. You can then switch to the particular
copy of Xcode that has the versions you want to test with before starting
Appium.

In addition, it's been discovered that testing against iOS 6.1 with Xcode
5 causes increased slowness and instability, so it's recommended that for
testing against iOS 6.1 and below we use Xcode 4.6.3, and for testing against
iOS 7.0 we use Xcode 5.We can do this by, say, having Xcode 5 at
`/Applications/Xcode.app`, and Xcode 4.6 and `/Applications/Xcode-4.6.app`.
Then we use the following command:

    sudo xcode-select -switch /Applications/Xcode-4.6.app

To prepare for iOS 6.1 testing. We run it again with a different Xcode:

    sudo xcode-select -switch /Applications/Xcode.app

To go back to iOS 7.0 testing.

<a name="android"></a>System setup (Android)
--------

* Make sure you have the Android SDK installed
* Make sure you have Android SDK API &gt;= 17 installed. To do this, run the
  android SDK manager and select the API in the extra packages you can install.
* Make sure you have ant installed. Ant is used to build the Appium bootstrap
  jar as well as the test applications.
* Make sure you have exported `$ANDROID_HOME`, containing your android sdk
  path. If you unzipped the Android SDK to `/usr/local/adt/`, for example, you
  should add this to your shell startup:

        export ANDROID_HOME="/usr/local/adt/sdk"

* Make sure you have an AVD set to a recent Android version (one that can run
  UIAutomator. Just choose the latest Android OS). You can create an AVD by
  using the android SDK tools. Remember the name you give the AVD, so that you
  can launch an emulator with it and run tests against it.
* Make sure that `hw.battery=yes` in your AVD's `config.ini`.
* There exists a hardware accelerated emulator for android, it has its own
  limitations. For more information you can check out this
  [page](https://github.com/appium/appium/blob/master/docs/android-hax-emulator.md).
