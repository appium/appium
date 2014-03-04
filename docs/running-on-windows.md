Running Appium on Windows
=======================

# Limitations

If you are running Appium on Windows, you cannot use the prebuilt '.app', which is built for OS X only. Additionally, you will not be able to test iOS apps because Appium relies on OS X-only libraries to support iOS testing.

# Setup

To get started:

1. Install [node.js](http://nodejs.org/download/) (v.0.8 or greater). Use the installer from nodejs.org.
2. Install the [Android SDK](http://developer.android.com/sdk/index.html). You will need to run the 'android' tool (included in the SDK) and make sure you have an API Level 17 or greater API installed. Set `ANDROID_HOME` to be your Android SDK path and add the tools and platform-tools folders to your PATH variable.
3. Install the Java JDK and set `JAVA_HOME` to your JDK folder.
4. Install [Apache Ant](http://ant.apache.org/bindownload.cgi) or use the one that comes with the Android Windows SDK in the eclipse\plugins folder. Be sure to add the folder containing ant to your PATH variable.
5. Install [Apache Maven](http://maven.apache.org/download.cgi) and set the M2HOME and M2 environment variables. Set M2HOME to the directory maven is installed in, and set M2 to %M2HOME\bin. Add the path you used for M2 to your PATH.
6. Install [Git](http://git-scm.com/download/win) Be sure to install Git for windows to run in the regular command prompt.
7. Instal [cURL](http://curl.haxx.se/download.html)

Now that you've downloaded everything, run:

    reset.bat

# Running Appium

To run tests on Windows, you will need to have the Android Emulator booted or an Android Device connected that is running an AVD with API Level 17 or greater. Then run Appium on the command line using node.js:

    node .

See the [server documentation](https://github.com/appium/appium/blob/master/docs/server-args.md) for all the command line arguments.

# Notes
* you must supply the --no-reset and --full-reset flags currently for android to work on Windows.
* There exists a hardware accelerated emulator for android, it has it's own
  limitations. For more information you can check out this
  [page](https://github.com/appium/appium/blob/master/docs/android-hax-emulator.md).
* Make sure that `hw.battery=yes` in your AVD's `config.ini`.
