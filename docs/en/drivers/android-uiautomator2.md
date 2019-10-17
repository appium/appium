## The UiAutomator2 Driver for Android

Appium's flagship support for automating Android apps is via the `UiAutomator2`
driver.  _(New to Appium? Read our [introduction to Appium drivers](#TODO))_.
This driver leverages Google's
[UiAutomator2](https://developer.android.com/training/testing/ui-automator.html)
technology to facilitate automation on a device or emulator.

Development of the UiAutomator2 driver happens at the
[appium-uiautomator2-driver](https://github.com/appium/appium-uiautomator2-driver)
repo.

Older Android-based drivers include:
* The [UiAutomator Driver](/docs/en/drivers/android-uiautomator.md)

### Requirements and Support

In addition to Appium's general requirements:

* Java 8 installed and configured correctly for your platform
* Mac, Windows, or Linux OS with the ability to run the Android SDK

### Usage

The way to start a session using the UiAutomator2 driver is to include the
`automationName` [capability](#TODO) in your [new session request](#TODO), with
the value `UiAutomator2`. Of course, you must also include appropriate
`platformName` (=`Android`), `platformVersion`, `deviceName`, and `app`
capabilities, at a minimum.

It is highly recommended to also set the `appPackage` and `appActivity`
capabilities in order to let Appium know exactly which package and activity
should be launched for your application. Otherwise, Appium will try to
determine these automatically from your app manifest.

### Capabilities

The UiAutomator2 driver supports a number of standard [Appium
capabilities](/docs/en/writing-running-appium/caps.md), but has an additional
set of capabilities that modulate the behavior of the driver. These can be
found currently at the [Android
section](/docs/en/writing-running-appium/caps.md#android-only) of the
aforementioned doc.

For web tests, to automate Chrome instead of your own application, leave the
`app` capability empty and instead set the `browserName` capability to
`Chrome`. Note that you are responsible for ensuring that Chrome is on the
emulator/device, and that it is of a [version compatible with
Chromedriver](/docs/en/writing-running-appium/web/chromedriver.md).


### Commands

To see the various commands Appium supports, and specifically for information
on how the commands map to behaviors for the UiAutomator2 driver, see the [API
Reference](#TODO).


### Basic Setup

1. Ensure that you have Appium's general dependencies (e.g., Node
   & NPM) installed and configured.

1. Ensure that Java (the JDK, not just the JRE) is installed and Java binaries
   are added to your path. The instructions for this step differ for Mac/Linux
   and for Windows. Please consult platform-specific documentation, as this is
   a common task. An example of how to change the PATH on Windows is
   [here](https://www.java.com/en/download/help/path.xml).

1. Ensure that the `JAVA_HOME` environment variable is also set to the JDK
   path. For Mac/Linux, for example (the specifics of this path will vary
   greatly by system), put this in your login script:

    ```
    export JAVA_HOME="/Library/Java/JavaVirtualMachines/jdk1.8.0_111.jdk/Contents/Home"
    ```

   On Windows, this will be done by setting the environment variable in the
   control panel, using the same strategy as for setting PATH above.
   [Android Studio](https://developer.android.com/studio/index.html) also has JDK
   in the path like `/Applications/Android Studio.app/Contents/jre/jdk/Contents/Home` (Mac).
   You can specify the path, too.

1. Install the [Android SDK](http://developer.android.com/sdk/index.html). The
   supported way of doing this nowadays is to use [Android
   Studio](https://developer.android.com/studio/index.html). Use the provided
   GUI to install the Android SDK to a path of your choosing.

1. Set the `ANDROID_HOME` environment variable to match this path. For example,
   if you installed the SDK to `/usr/local/adt`, then there will typically be
   a `sdk` folder inside of that which contains the SDK files. In that case, on
   Mac and Linux, add the following line to your login script (e.g.,
   `~/.bashrc`, `~/.bash_profile`, etc...):

    ```
    export ANDROID_HOME="/usr/local/adt/sdk"
    ```

   On Windows, follow the same steps as before to set the environment variable
   in the control panel.

1. Using the SDK manager, ensure you have installed the SDK for Android API
   levels you wish to automate (e.g., 24).

1. On Windows, ensure that you always run Appium in Administrator mode.

At this point, your general system setup is done. Follow the steps below based
on whether you want to automate an emulator or a real device. In addition you
will need your app's APK (preferably built in Debug mode), whose path or URL
you will use as the value of the `app` capability when running your tests.

### Emulator Setup

To run tests on emulators, use the AVD Manager included with Android Studio or
the SDK. With this tool, create the emulator that matches your needs. With the
emulator launched, Appium will automatically find and use it for its tests.
Otherwise, if you specify the `avd` capability with the value matching the name
of your emulator, then Appium will attempt to launch the emulator for you.

Additional tips for emulators:

* There exists a hardware accelerated emulator for Android, though it has its
  own limitations. It can be installed from Intel's website, or through the
  Android SDK Manager. For more information, go
  [here](https://software.intel.com/en-us/articles/intel-hardware-accelerated-execution-manager-intel-haxm).
* Make sure that `hw.battery=yes` in your AVD's `config.ini`, if you want to
  run any of the Appium tests, or use any of the power commands. (As of Android
  5.0, this is the default.)

### Real Device Setup

For Android automation, no additional setup is required for testing on real
devices, other than these simple requirements:

* Ensure that [Developer
  mode](https://developer.android.com/studio/debug/dev-options.html) is turned
  on for the device.
* Ensure that the device is connected via USB to the Appium host, and can be
  seen by [ADB](https://developer.android.com/studio/command-line/adb.html)
  (run `adb devices` to make sure).
* Ensure that "Verify Apps" in settings is disabled, to allow Appium's helper
  apps to function without manual intervention.

(For some specific commands, the device might need to be rooted, though this is
not the norm.)
