---
title: Install the UiAutomator2 Driver
---

You can't do much with Appium unless you have a [driver](../intro/drivers.md), which is an
interface that allows Appium to automate a particular platform.

!!! info

    For this quickstart guide, we're going to be automating an app on the Android platform, because
    the system requirements for Android automation via Appium are the same as for Appium itself
    (whereas the iOS driver, for example, requires you to be using macOS).

The driver we're going to use is called the [UiAutomator2
Driver](https://github.com/appium/appium-uiautomator2-driver). It's worth visiting that driver's
documentation and bookmarking it, because it will be an invaluable reference down the line.

## Set up Android automation requirements

According to the driver, in addition to a working Appium server, we also need to do the following:

- Download [Android SDK platform tools](https://developer.android.com/studio/releases/platform-tools). You will probably want to download [Android Studio](https://developer.android.com/studio) and manage the SDK tools from within it for the easiest experience.
- Set an environment variable pointing to the directory on disk where the Android tools are
installed. You can usually find the path to this directory in the Android Studio SDK manager. It
will contain the `platform-tools` and other directories. We need to define and persist the
environment variable as `ANDROID_HOME` (or alternatively `ANDROID_SDK_ROOT`).
- Use the Android SDK manager to download whichever Android platform we want to automate (for
example, API level 30)
- Install the Java JDK (for the most recent Android API levels, JDK 9 is required, otherwise JDK
8 is required). It's easiest to use the [OpenJDK packages](https://openjdk.java.net/install/). Make
sure you get the JDK and not the JRE.
- When the JDK is installed, you'll need to find the path to the JDK home directory as it was
installed on your system. This will be the directory that *contains* the `bin`, `include`, and
other directories. The path must be persisted as an environment variable named `JAVA_HOME`, so that
Appium can find the appropriate Java tooling that is required to work with the Android platform.
- Use Android Studio to create and launch an Android Virtual Device (an AVD, otherwise known as an
emulator). You may need to download the system images for the API level of the emulator you want to
create. Using the AVD creation wizard in Android Studio is generally the easiest way to do all of
this.

    !!! note

        You can also use a physical Android device, so long as it is configured for debugging and
        development

- With the emulator or device connected, you can run `adb devices` (via the binary located at
`$ANDROID_HOME/platform-tools/adb`) to verify that your device shows up as connected.

Once your device shows up as connected in ADB, and you've verified that the environment variables
are set up correctly in the terminal context where you are going to run Appium, you should be good
to go! If you ran into problems with any of these steps, refer to the driver documentation, or the
various Android or Java documentation sites as necessary.

Also, congratulations: whether or not you intended to, you now have the Android developer toolchain
set up on your system, so you can get busy making Android apps if you want!

## Install the driver itself

Since the UiAutomator2 driver is maintained by the core Appium team, it has an 'official' driver
name that you can use to install it easily via the [Appium Extension CLI](../cli/extensions.md):

```bash
appium driver install uiautomator2
```

It should produce output that looks something like:

```
Attempting to find and install driver 'uiautomator2'
✔ Installing 'uiautomator2' using NPM install spec 'appium-uiautomator2-driver'
Driver uiautomator2@2.0.5 successfully installed
- automationName: UiAutomator2
- platformNames: ["Android"]
```

Running this command will locate and install the latest version of the UiAutomator2 driver, making
it available for automation. Note that when it is installed it tells you what platforms it is valid
for (in this case, `Android`), and what automation name (the `appium:automationName`
[capability](../guides/caps.md)) must be used to select this driver for use during an Appium
session (in this case, `UiAutomator2`).

!!! note

    In this quickstart we have used the Extension CLI to install the UiAutomator2 driver, but if you
    are incorporating Appium into a Node.js project, you might prefer to use NPM to manage Appium
    and its connected drivers. To learn more about this technique, visit the guide on [managing
    Appium extensions](../guides/managing-exts.md).

Now, start the Appium server again (run `appium`), and you should see that the newly-installed
driver is listed as available:

```
[Appium] Available drivers:
[Appium]   - uiautomator2@2.0.5 (automationName 'UiAutomator2')
```

With the Android setup complete and the UiAutomator2 driver installed, you're ready to write your
first test! So pick the language you're most comfortable with under the quickstart menu and give it
a shot.
