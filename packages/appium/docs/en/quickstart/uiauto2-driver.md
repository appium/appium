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

According to the driver, in addition to a working Appium server, we also need to set up the following:

### Android SDK

- The easiest way to set up the Android SDK requirements is by downloading [Android Studio](https://developer.android.com/studio).
We need to use its SDK manager (_Settings -> Languages & Frameworks -> Android SDK_)
to download the following items:
    - Android SDK Platform (select whichever Android platform we want to automate, for example, API level 30)
    - Android SDK Platform-Tools
- If you wish, you can also download these items without Android Studio:
    - Android SDK Platform can be downloaded using `sdkmanager` included in [Android command-line tools](https://developer.android.com/studio#command-line-tools-only)
    - [Android SDK Platform-Tools](https://developer.android.com/tools/releases/platform-tools)
- Set up the `ANDROID_HOME` environment variable to point to the directory where the Android SDK is
installed. You can usually find the path to this directory in the Android Studio SDK manager. It
will contain the `platform-tools` and other directories.

### Java JDK

- Install the Java JDK (for the most recent Android API levels, JDK 9 is required, otherwise JDK
8 is required). You can download this from [Oracle](https://jdk.java.net/) or [Adoptium](https://adoptium.net/en-GB/temurin/releases/).
Make sure you get the JDK and not the JRE.
- Set up the `JAVA_HOME` environment variable to point to the JDK home directory. It will contain
the `bin`, `include`, and other directories.

### Prepare the Device

- If using an emulator, use Android Studio to create and launch an Android Virtual Device (AVD).
You may need to download the system images for the API level of the emulator you want to
create. Using the AVD creation wizard in Android Studio is generally the easiest way to do all of
this.
- If using a real device, you should [set it up for development and enable USB Debugging](https://developer.android.com/studio/debug/dev-options).
- With the emulator or device connected, you can run `adb devices` (via the binary located at
`$ANDROID_HOME/platform-tools/adb`) to verify that your device shows up as connected.

Once your device shows up as connected in `adb`, and you've verified that the environment variables
are set up correctly, you should be good to go! If you ran into problems with any of these steps,
refer to the driver documentation, or the various Android or Java documentation sites as necessary.

Also, congratulations: whether or not you intended to, you now have the Android developer toolchain
set up on your system, so you can get busy making Android apps if you want!

## Install the driver itself

### Standard Install

Like all Appium drivers, the UiAutomator2 driver is installed via the [Appium Extension CLI](../cli/extensions.md).
Since UiAutomator2 is maintained by the core Appium team, it has an 'official' driver name
(`uiautomator2`), which makes the installation simpler.

Before installing, make sure your Appium server is _not_ running (if it is, quit it with _Ctrl-C_).
Then run the following command:

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

Note how the installation process specifies what platforms is the driver valid for (in this case,
`Android`), and what automation name (the `appium:automationName` [capability](../guides/caps.md))
must be used to select this driver for use during an Appium session (in this case, `UiAutomator2`).

!!! note

    In this quickstart we have used the [Extension CLI](../cli/extensions.md) to install the
    UiAutomator2 driver, but if you are incorporating Appium into a Node.js project, you might
    prefer to use `npm` to manage Appium and its connected drivers. To learn more about this
    technique, visit the guide on [managing Appium extensions](../guides/managing-exts.md).

### Batch Install

You may want to use Appium with more than one driver. One way to accomplish this is to run
`appium driver install <driver-name>` for each individual driver, but you can also install multiple
drivers in one go:

```
appium setup
```

Running this will install Appium's mobile-specific drivers: UiAutomator2, [XCUITest](https://appium.github.io/appium-xcuitest-driver/)
(only if running macOS), and [Espresso](https://github.com/appium/appium-espresso-driver).

You can also use this command to batch install drivers for desktop applications or desktop browsers.
For more details on this, refer to the [Setup command documentation](../cli/setup.md).

### Validating the Install

The UiAutomator2 driver, like all official Appium drivers, comes with the Appium Doctor tool, which
allows validating whether all prerequisites have been set up correctly:

```
appium driver doctor uiautomator2
```

This guide has focused on essential requirements, so Appium Doctor may suggest one or more optional
fixes. But if you see `0 required fixes needed`, that means everything is set up!

Now, start the Appium server again (run `appium`), and you should see that the newly-installed
driver is listed as available:

```
[Appium] Available drivers:
[Appium]   - uiautomator2@2.0.5 (automationName 'UiAutomator2')
```

With the Android setup complete and the UiAutomator2 driver installed, you're ready to write your
first test! Now select your preferred language and give it a shot:

<div class="grid cards" markdown>

-   :material-language-javascript: [__JavaScript__](./test-js.md)
-   :material-language-java: [__Java__](./test-java.md)
-   :material-language-python: [__Python__](./test-py.md)
-   :material-language-ruby: [__Ruby__](./test-rb.md)
-   :material-dot-net: [__.NET C#__](./test-dotnet.md)

</div>
