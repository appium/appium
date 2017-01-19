## Troubleshooting Appium

Here's what to do if you're experiencing problems, before you submit a ticket
to github or write to the [appium-discuss discussion group](https://discuss.appium.io).

### General

* Make sure you've followed the getting started steps in the [README](/README.md)
* Make sure your system is set up appropriately (i.e., XCode is updated,
  Android SDK is installed and `ANDROID_HOME` is set.
* Make sure the paths to your applications are correct
* On windows run appium.app as administrator or when running from source you need to run cmd as administrator.

### If you're running Appium.app

* Update the app and restart. If you get a message saying the app can't be updated,
  re-download it from [appium.io](http://appium.io).

### If you're running Appium from source

* `git pull` to make sure you're running the latest code
* Remove old dependencies: `rm -rf node_modules`
* Re-install dependencies: `npm install`
* Re-transpile the code: `gulp transpile`

* You can also use [Appium Doctor](https://github.com/appium/appium-doctor) to determine whether your system is configured correctly for Appium.
* If you get this error after upgrading to Android SDK 22:
  `{ANDROID_HOME}/tools/ant/uibuild.xml:155: SDK does not have any Build Tools installed.`
In the Android SDK 22, the platform and build tools are split up into their
own items in the SDK manager. Make sure you install the build-tools and platform-tools.

### Android

* Make sure the Android emulator is up and running.
* It's sometimes useful to run `adb kill-server && adb devices`. This can
  reset the connection to the Android device.
* Make sure you set ANDROID_HOME pointing to the Android SDK directory

### Windows

* Make sure developer mode is on
* Make sure command prompt is Admin
* Check that the URL Appium server is listening to matches the one specified in test script

### IOS

* Make sure Instruments.app is not open
* If you're running the simulator, make sure your actual device is not
  plugged in
* Make sure the accessibility helper is turned off in your Settings app
* Make sure the app is compiled for the version of the simulator that's being
  run
* Make sure the app is compiled for the simulator (or real device) as
  appropriate (e.g., in debug mode for the simulator), or you might get
  a `posix spawn` error.
* If you've ever run Appium with sudo, you might need to `sudo rm
  /tmp/instruments_sock` and try again as not-sudo.
* If this is the first time you've run Appium, make sure to authorize the use
  of Instruments. See [running on OSX documentation](./running-on-osx.md#authorizing-ios-on-the-computer).
* If Instruments is crashing when running against a physical device ("exited with code 253"), ensure Xcode has downloaded device symbols. Go to Window -> Devices, and it should start automatically. This is needed after iOS version upgrades.
* If you see `iOS Simulator failed to install the application.` and the
  paths are correct, try restarting the computer.
* Make sure your macOS keychain that holds the certificate(s) needed for building your app and the WebDriverAgent is unlocked. Especialy if you are using ssh. General symptom to look for is `codesign` failure.
* If you have custom elements in your app, they will not be automatable by
  UIAutomation (and therefore Appium) by default. You need to set the
  accessibility status to 'enabled' on them. The way to do this in code is:

  ```center
  [myCustomView setAccessibilityEnabled:YES];
  ```

* Tests on iOS may exhibit symptoms similar to a memory leak including sluggish
  performance or hangs. If you experience this problem, it's likely due to a
  known issue with NSLog. One option is to remove NSLog from your code.
  However, there are several more nuanced approaches that may also help without
  requiring that you refactor.

  ### Workaround 1
  NSLog is a macro and can be redefined. E.g.,
  ```objectivec
  // *You'll need to define TEST or TEST2 and then recompile.*

  #ifdef TEST
    #define NSLog(...) _BlackHoleTestLogger(__VA_ARGS__);
  #endif // TEST
  #ifdef TEST2
    #define NSLog(...) _StdoutTestLogger(__VA_ARGS__);
  #endif // TEST2

  void _BlackHoleTestLogger(NSString *format, ...) {
      //
  }

  void _StdoutTestLogger(NSString *format, ...) {
      va_list argumentList;
      va_start(argumentList, format);
      NSMutableString * message = [[NSMutableString alloc] initWithFormat:format
                                                  arguments:argumentList];

      printf(message);

      va_end(argumentList);
      [message release];
  }
  ```

  ### Workaround 2
  Manually replace the underlying function that NSLog wraps. This method was recommended by
  [Apple in a similar context.](https://support.apple.com/kb/TA45403?locale=en_US&viewlocale=en_US)

  ```objectivec
  extern void _NSSetLogCStringFunction(void(*)(const char *, unsigned, BOOL));

  static void _GarbageFreeLogCString(const char *message, unsigned length, BOOL withSyslogBanner) {
     fprintf(stderr, "%s\\n", message);
  }

  int main (int argc, const char *argv[]) {
     NSAutoreleasePool *pool = [[NSAutoreleasePool alloc] init];
     int exitCode;

     setbuf(stderr, NULL);

     _NSSetLogCStringFunction(_GarbageFreeLogCString);
     exitCode = WOApplicationMain(@"Application", argc, argv);
     [pool release];
     return exitCode;
  }
```


### Webview/Hybrid/Safari app support

* Make Sure you enable the 'Web Inspector' on the real device.
* Make Sure you enable the Safari - Advance Preferences- Developer menu for
  simulators.
* Make sure you are properly switching contexts using the `context` appium commands provided by your client library.
* If you getting this error: select_port() failed, when trying to open the
  proxy, see this [discussion](https://groups.google.com/forum/#!topic/appium-discuss/tw2GaSN8WX0)
* In a Safari session, if the logs indicate that the initial url cannot be entered, make sure that
  you have the software keyboard enabled. See this [discussion](https://github.com/appium/appium/issues/6440).

### Let the community know

Once you've tried the above steps and your issue still isn't resolved,
here's what you can do:

If you're having trouble getting Appium working and the error messages Appium
provides are not clear, join the [discussion group](https://discuss.appium.io)
and send a message. Please include the following:

* How you're running Appium (Appium.app, npm, source)
* What operating system you are using
* What device and version you are testing against (i.e. Android 4.4, or iOS 7.1)
* Whether you are running against a real device or a simulator/emulator
* The client-side and server-side errors you're getting (i.e.,
"In Python this is the exception I get in my test script,
and here's a link to a paste of the Appium server output)
* Per above, it's very important to include a paste of the Appium server
output when it's run in verbose mode so that we can diagnose what's going on.

If you've found what you believe is a bug, go straight to the [issue tracker](https://github.com/appium/appium/issues)
and submit an issue describing the bug and a repro case.

### Known Issues

* If you've installed Node from the Node website, it requires that you use sudo
  for `npm`. This is not ideal. Try to get node with [nvm](https://github.com/creationix/nvm),
  [n](https://github.com/visionmedia/n) or `brew install node` instead!
* Webview support works on real iOS devices with a proxy, see [discussion](https://groups.google.com/d/msg/appium-discuss/u1ropm4OEbY/uJ3y422a5_kJ).
* Sometimes iOS UI elements become invalidated milliseconds after they are
  found. This results in an error that looks like `(null) cannot be tapped`.
  Sometimes the only solution is to put the finding-and-clicking code in a retry
  block.
* Appium may have difficulties finding the `node` executable if you've
  installed Node and npm via MacPorts. You must make sure that the MacPorts bin
  folder (`/opt/local/bin` by default) is added to `PATH` somewhere in your
  `~/.profile`, `~/.bash_profile` or `~/.bashrc`.

### Specific Errors

|Action|Error|Resolution|
|------|-----|----------|
|Running ios test|`[INST STDERR] posix spawn failure; aborting launch`|Your app is not compiled correctly for the simulator or device.|
|Running mobile safari test|`error: Could not prepare mobile safari with version '7.1'`|You probably need to run the authorize script again to make the iOS SDK files writeable. See [running on OSX documentation](./running-on-osx.md#authorizing-ios-on-the-computer)|
