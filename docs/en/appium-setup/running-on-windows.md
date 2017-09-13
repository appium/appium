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

Please follow the guide for the [UiAutomator2
Driver](/docs/en/drivers/android-uiautomator2.md) to get going with Android
testing.

## Additional Setup for Windows App Testing

   1. To test a Windows app, simply make sure you have turned [developer mode](https://msdn.microsoft.com/en-us/windows/uwp/get-started/enable-your-device-for-development) on.

   (see the [Windows app testing](/docs/en/writing-running-appium/windows-app-testing.md) doc for instructions on how to run Windows app tests)

## Running Appium

See the [server documentation](/docs/en/writing-running-appium/server-args.md) for all the command line arguments.

* On Windows run Appium.exe as an administrator, or when running from source you need to run cmd as an administrator.
