Running Appium on Windows
=======================

# Limitations

If you are running Appium on Windows, you cannot use the prebuilt '.app', which is built for OS X only. Additionally, you will not be able to test iOS apps because Appium relies on OS X-only libraries to support iOS testing.

# Setup

To get started, you'll need to install node.js (v.0.8 or greater). Just download the installer from nodejs.org.

Once you've got node.js installed, install the [Android SDK](http://developer.android.com/sdk/index.html). You will need to run the 'android' tool (included in the SDK) and make sure you have an API Level 17 or greater API installed. You will also need Ant to build the bootstrap jar that Appium uses for testing Android. Ant comes with the Android Windows SDK in the eclipse\plugins folder.

Set `ANDROID_HOME` to be your Android SDK path. If you unzipped the Android SDK to C:\android. You can do the by editting your PATH variable.

Install the Java JDK and set JAVA_HOME to your JDK folder.

Now that you're setup to run Appium, run `npm install .` from your Appium checkout to install all the dependencies.
Then run:

    reset.bat

-or-

    grunt configAndroidBootstrap
    grunt buildAndroidBootstrap
    grunt setConfigVer:android

# Running Appium

To run tests on Windows, you will need to have the Android Emulator booted or an Android Device connected that is running an AVD with API Level 17 or greater. Then run Appium on the command line using node.js:

    node server.js

See the [server documentation](https://github.com/appium/appium/blob/master/docs/server-args.md) for all the command line arguments.

# Notes
* you must supply the --no-reset and --full-reset flags currently for android to work on Windows.
* There exists a hardware accelerated emulator for android, it has it's own
  limitations. For more information you can check out this
  [page](https://github.com/appium/appium/blob/master/docs/android-hax-emulator.md).
* Make sure that `hw.battery=yes` in your AVD's `config.ini`.
