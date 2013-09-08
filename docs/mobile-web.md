Automating mobile web apps
======================

If you're interested in automating your web app in Mobile Safari on iOS or Chrome on Android, Appium can help you. Basically, you write a normal WebDriver test, and use Appium as the Selenium server with a special set of desired capabilities.

### Mobile Safari on Simulator

First of all, make sure developer mode is turned on in your Safari preferences so that the remote debugger port is open.

If you are using the simulator or a real device, you MUST run Safari before attempting to use Appium.

Then, use desired capabilities like these to run your test in mobile Safari:

```js
{
  , app: 'safari'
  , device: 'iPhone Simulator'
  , version: '6.1'
}
```

### Mobile Safari on Real Device

See [the hybrid docs](https://github.com/appium/appium/blob/master/docs/hybrid.md) for instructions on setting up ios-webkit-debug-proxy and everything else you need.

### Mobile Chrome on Emulator or Real Device

Pre-requisites:

*  Make sure Chrome (an app with the package `com.android.chrome`) is installed on your device or emulator. Getting Chrome for the x86 version of the emulator is not currently possible without building Chromium, so you may want to run an ARM emulator and then copy a Chrome APK from a real device to get Chrome on an emulator.
*  Make sure [ChromeDriver](https://code.google.com/p/chromedriver/downloads/list), version &gt;= 2.0 is on your system and that the `chromedriver` binary is on your `$PATH`.

Then, use desired capabilities like these to run your test in Chrome:

```js
{
  app: 'chrome'
  , device: 'Android'
};
```
