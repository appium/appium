# Windows Setup

Appium on Windows supports both Windows and Android app automation!

See [Windows App Testing](/docs/en/writing-running-appium/windows-app-testing.md) for more details.

## Running Appium on Windows

## Setup

To get started:

   1. Download latest [node and npm tools](https://nodejs.org/download/release/v6.3.0/node-v6.3.0-x64.msi) MSI (version >= 6.0). The `npm` and `nodejs` paths should be in your PATH environment variable.
   2. Open admin cmd prompt
   3. Run the command `npm install -g appium` which will install Appium from NPM
   4. To start Appium, you can now simply run `appium` from the prompt.
   5. Follow the directions below for setup for either Android or Windows app testing.
   6. Run a test from any Appium client.

## Additional Setup for Android App Testing

   1. Download the latest Java JDK [here](http://www.oracle.com/technetwork/java/javase/downloads/jdk8-downloads-2133151.html) (accept the license agreement first). Set 'JAVA_HOME' to be your JDK path. The `bin` in that directory should be added to your PATH variable.
   2. Install the [Android SDK](http://developer.android.com/sdk/index.html). Set the `ANDROID_HOME` environment variable to be your Android SDK path and add the `tools` and `platform-tools` folders to your PATH variable.
   3. Install [Apache Ant](http://ant.apache.org/bindownload.cgi) or use the one that comes with the Android Windows SDK in the eclipse\plugins folder. Be sure to add the folder containing Ant to your PATH variable.
   4. Install [Apache Maven](http://maven.apache.org/download.cgi) and set the M2HOME and M2 environment variables. Set `M2_HOME` to the directory maven is installed in, and set `M2` to the `bin` in that directory. Add the path you used for `M2` to your PATH.
   5. To run tests on Windows, you will need to have the Android Emulator booted or an Android Device connected that is running an AVD with API Level 17 or greater. Then run Appium on the command line (via the `appium` command)
   6. Your test script should ensure that the `platformVersion` capability corresponds to the emulator or device version you are testing, and that the `app` capability is an absolute path to the .apk file of the Android app.

## Additional Setup for Windows App Testing

   1. To test a Windows app, simply make sure you have turned [developer mode](https://msdn.microsoft.com/en-us/windows/uwp/get-started/enable-your-device-for-development) on.

   (see the [Windows app testing](/docs/en/writing-running-appium/windows-app-testing.md) doc for instructions on how to run Windows app tests)

## Running Appium

See the [server documentation](/docs/en/writing-running-appium/server-args.md) for all the command line arguments.

* On Windows run Appium.exe as an administrator, or when running from source you need to run cmd as an administrator.
* You must supply the `--no-reset` or `--full-reset` flags for
  Android to work on Windows.
* There exists a hardware accelerated emulator for Android; it has it's own
  limitations. For more information you can check out this
  [page](/docs/en/appium-setup/android-hax-emulator.md).
