## Troubleshooting Appium

Here's what to do if you're experiencing problems, before you submit a ticket
to github or write to the [appium-discuss mailing list](https://groups.google.com/forum/#!forum/appium-discuss).

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
* Run the appropriate flavor of `reset.sh` based on what you're trying to
automate:

|command                  | explanation |
|-------------------------|-------------|
|./reset.sh               | # all |
|./reset.sh --ios         | # ios-only |
|./reset.sh --android     | # android-only |
|./reset.sh --selendroid  | # selendroid-only |

* You might also want to run `reset.sh` with the `--dev` flag if you want the
  test apps downloaded and built as well.
* You can also use `appium-doctor` to automatically verify that all
  dependencies are met. If running from source, you may have to use
  `bin/appium-doctor.js` or `node bin/appium-doctor.js`.
* If you get this error after upgrading to Android SDK 22:
  `{ANDROID_HOME}/tools/ant/uibuild.xml:155: SDK does not have any Build Tools installed.`
In the Android SDK 22, the platform and build tools are split up into their
own items in the SDK manager. Make sure you install the build-tools and platform-tools.

### Android

* Make sure the Android emulator is up and running.
* It's sometimes useful to run `adb kill-server && adb devices`. This can
  reset the connection to the Android device.
* Make sure you set ANDROID_HOME pointing to the Android SDK directory

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
  of Instruments. Usually a box will pop up that you enter your password into
  . If you're running Appium from source, you can simply run `sudo grunt authorize`
  from the main repo to avoid getting this popup. If you're running from npm,
  run `sudo authorize_ios` instead. You need to do this every time you install
  a new version of Xcode, as well.
* If you see `iOS Simulator failed to install the application.` and the
  paths are correct, try restarting the computer.

### Webview/Hybrid/Safari app support

* Make Sure you enable the 'Web Inspector' on the real device.
* Make Sure you enable the Safari - Advance Preferences- Developer menu for
  simulators.
* Make sure you are properly switching contexts using the `context` appium commands provided by your client library.
* If you getting this error: select_port() failed, when trying to open the
  proxy, see this [discussion](https://groups.google.com/forum/#!topic/appium-discuss/tw2GaSN8WX0)

### FirefoxOS

* Make sure the Boot-to-Gecko simulator is up and running.
* Make sure the simulator screen is alive and unlocked (might require restarting B2G).

### Let the community know

Once you've tried the above steps and your issue still isn't resolved,
here's what you can do:

If you're having trouble getting Appium working and the error messages Appium
provides are not clear, join the [mailing list](https://groups.google.com/d/forum/appium-discuss)
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
  for `npm`. This is not ideal. Try to get node with
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
|Running reset.sh|xcodebuild: error: SDK "iphonesimulator6.1" cannot be located|Install the iPhone 6.1 SDK _or_ build the test apps with a separate SDK, e.g., `grunt buildApp:UICatalog:iphonesimulator5.1`|
|Running reset.sh|Warning: Task "setGitRev" not found. Use --force to continue.|Update the submodules with `git submodule update --init` and run `reset.sh` again|
|Running ios test|`[INST STDERR] posix spawn failure; aborting launch`|Your app is not compiled correctly for the simulator or device.|
|Running mobile safari test|`error: Could not prepare mobile safari with version '7.1'`|You probably need to run the authorize script again to make the iOS SDK files writeable. E.g., `sudo authorize_ios`|
