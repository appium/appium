Preparing your system to run Appium tests
=======

<a name="ios"></a>System setup (iOS)
--------

* Make sure you have XCode and the iOS SDK(s) installed.
* You might also want to install additional versions of the iOS SDKs if you
  want to test on older or multiple versions.

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
