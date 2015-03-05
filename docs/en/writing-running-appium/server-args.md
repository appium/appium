# Appium server arguments

Usage: `node . [flags]`

## Server flags
All flags are optional, but some are required in conjunction with certain others.



<expand_table>

|Flag|Default|Description|Example|
|----|-------|-----------|-------|
|`--shell`|null|Enter REPL mode||
|`--localizable-strings-dir`|en.lproj|IOS only: the relative path of the dir where Localizable.strings file resides |`--localizable-strings-dir en.lproj`|
|`--app`|null|IOS: abs path to simulator-compiled .app file or the bundle_id of the desired target on device; Android: abs path to .apk file|`--app /abs/path/to/my.app`|
|`--ipa`|null|(IOS-only) abs path to compiled .ipa file|`--ipa /abs/path/to/my.ipa`|
|`-U`, `--udid`|null|Unique device identifier of the connected physical device|`--udid 1adsf-sdfas-asdf-123sdf`|
|`-a`, `--address`|0.0.0.0|IP Address to listen on|`--address 0.0.0.0`|
|`-p`, `--port`|4723|port to listen on|`--port 4723`|
|`-ca`, `--callback-address`|null|callback IP Address (default: same as address)|`--callback-address 127.0.0.1`|
|`-cp`, `--callback-port`|null|callback port (default: same as port)|`--callback-port 4723`|
|`-bp`, `--bootstrap-port`|4724|(Android-only) port to use on device to talk to Appium|`--bootstrap-port 4724`|
|`-k`, `--keep-artifacts`|false|deprecated, no effect, trace is now in tmp dir by default and is  cleared before each run. Please also refer to the --trace-dir flag.||
|`-r`, `--backend-retries`|3|(iOS-only) How many times to retry launching Instruments before saying it crashed or timed out|`--backend-retries 3`|
|`--session-override`|false|Enables session override (clobbering)||
|`--full-reset`|false|(iOS) Delete the entire simulator folder. (Android) Reset app state by uninstalling app instead of clearing app data. On Android, this will also remove the app after the session is complete.||
|`--no-reset`|false|Don't reset app state between sessions (IOS: don't delete app plist files; Android: don't uninstall app before new session)||
|`-l`, `--pre-launch`|false|Pre-launch the application before allowing the first session (Requires --app and, for Android, --app-pkg and --app-activity)||
|`-lt`, `--launch-timeout`|90000|(iOS-only) how long in ms to wait for Instruments to launch||
|`-g`, `--log`|null|Also send log output to this file|`--log /path/to/appium.log`|
|`--log-level`|debug|log level; default (console[:file]): debug[:debug]|`--log-level debug`|
|`--log-timestamp`|false|Show timestamps in console output||
|`--local-timezone`|false|Use local timezone for timestamps||
|`--log-no-colors`|false|Don't use colors in console output||
|`-G`, `--webhook`|null|Also send log output to this HTTP listener|`--webhook localhost:9876`|
|`--native-instruments-lib`|false|(IOS-only) IOS has a weird built-in unavoidable delay. We patch this in appium. If you do not want it patched, pass in this flag.||
|`--app-pkg`|null|(Android-only) Java package of the Android app you want to run (e.g., com.example.android.myApp)|`--app-pkg com.example.android.myApp`|
|`--app-activity`|null|(Android-only) Activity name for the Android activity you want to launch from your package (e.g., MainActivity)|`--app-activity MainActivity`|
|`--app-wait-package`|false|(Android-only) Package name for the Android activity you want to wait for (e.g., com.example.android.myApp)|`--app-wait-package com.example.android.myApp`|
|`--app-wait-activity`|false|(Android-only) Activity name for the Android activity you want to wait for (e.g., SplashActivity)|`--app-wait-activity SplashActivity`|
|`--android-coverage`|false|(Android-only) Fully qualified instrumentation class. Passed to -w in adb shell am instrument -e coverage true -w |`--android-coverage com.my.Pkg/com.my.Pkg.instrumentation.MyInstrumentation`|
|`--avd`|null|(Android-only) Name of the avd to launch|`--avd @default`|
|`--avd-args`|null|(Android-only) Additional emulator arguments to launch the avd|`--avd-args -no-snapshot-load`|
|`--device-ready-timeout`|5|(Android-only) Timeout in seconds while waiting for device to become ready|`--device-ready-timeout 5`|
|`--safari`|false|(IOS-Only) Use the safari app||
|`--device-name`|null|Name of the mobile device to use|`--device-name iPhone Retina (4-inch), Android Emulator`|
|`--platform-name`|null|Name of the mobile platform: iOS, Android, or FirefoxOS|`--platform-name iOS`|
|`--platform-version`|null|Version of the mobile platform|`--platform-version 7.1`|
|`--automation-name`|null|Name of the automation tool: Appium or Selendroid|`--automation-name Appium`|
|`--browser-name`|null|Name of the mobile browser: Safari or Chrome|`--browser-name Safari`|
|`--default-device`, `-dd`|false|(IOS-Simulator-only) use the default simulator that instruments launches on its own||
|`--force-iphone`|false|(IOS-only) Use the iPhone Simulator no matter what the app wants||
|`--force-ipad`|false|(IOS-only) Use the iPad Simulator no matter what the app wants||
|`--language`|null|Language for the iOS simulator / Android Emulator|`--language en`|
|`--locale`|null|Locale for the iOS simulator / Android Emulator|`--locale en_US`|
|`--calendar-format`|null|(IOS-only) calendar format for the iOS simulator|`--calendar-format gregorian`|
|`--orientation`|null|(IOS-only) use LANDSCAPE or PORTRAIT to initialize all requests to this orientation|`--orientation LANDSCAPE`|
|`--tracetemplate`|null|(IOS-only) .tracetemplate file to use with Instruments|`--tracetemplate /Users/me/Automation.tracetemplate`|
|`--show-sim-log`|false|(IOS-only) if set, the iOS simulator log will be written to the console||
|`--show-ios-log`|false|(IOS-only) if set, the iOS system log will be written to the console||
|`--nodeconfig`|null|Configuration JSON file to register appium with selenium grid|`--nodeconfig /abs/path/to/nodeconfig.json`|
|`-ra`, `--robot-address`|0.0.0.0|IP Address of robot|`--robot-address 0.0.0.0`|
|`-rp`, `--robot-port`|-1|port for robot|`--robot-port 4242`|
|`--selendroid-port`|8080|Local port used for communication with Selendroid|`--selendroid-port 8080`|
|`--chromedriver-port`|9515|Port upon which ChromeDriver will run|`--chromedriver-port 9515`|
|`--chromedriver-executable`|null|ChromeDriver executable full path||
|`--use-keystore`|false|(Android-only) When set the keystore will be used to sign apks.||
|`--keystore-path`|/Users/user/.android/debug.keystore|(Android-only) Path to keystore||
|`--keystore-password`|android|(Android-only) Password to keystore||
|`--key-alias`|androiddebugkey|(Android-only) Key alias||
|`--key-password`|android|(Android-only) Key password||
|`--show-config`|false|Show info about the appium server configuration and exit||
|`--no-perms-check`|false|Bypass Appium's checks to ensure we can read/write necessary files||
|`--command-timeout`|60|The default command timeout for the server to use for all sessions. Will still be overridden by newCommandTimeout cap||
|`--keep-keychains`|false|(iOS) Whether to keep keychains (Library/Keychains) when reset app between sessions||
|`--strict-caps`|false|Cause sessions to fail if desired caps are sent in that Appium does not recognize as valid for the selected device||
|`--isolate-sim-device`|false|Xcode 6 has a bug on some platforms where a certain simulator can only be launched without error if all other simulator devices are first deleted. This option causes Appium to delete all devices other than the one being used by Appium. Note that this is a permanent deletion, and you are responsible for using simctl or xcode to manage the categories of devices used with Appium.||
|`--tmp`|null|Absolute path to directory Appium can use to manage temporary files, like built-in iOS apps it needs to move around. Defaults to the `APPIUM_TMP_DIR` variable and then to `/tmp` on *nix/Mac and to the `TEMP` variable on windows.||
|`--trace-dir`|null|Absolute path to directory Appium use to save ios instruments traces, defaults to <tmp dir>/appium-instruments||
|`--intent-action`|android.intent.action.MAIN|(Android-only) Intent action which will be used to start activity|`--intent-action android.intent.action.MAIN`|
|`--intent-category`|android.intent.category.LAUNCHER|(Android-only) Intent category which will be used to start activity|`--intent-category android.intent.category.APP_CONTACTS`|
|`--intent-flags`|0x10200000|(Android-only) Flags that will be used to start activity|`--intent-flags 0x10200000`|
|`--intent-args`|null|(Android-only) Additional intent arguments that will be used to start activity|`--intent-args 0x10200000`|
|`--suppress-adb-kill-server`|false|(Android-only) If set, prevents Appium from killing the adb server instance||
