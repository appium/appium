## Appium server capabilities

<expand_table>

|Capability|Description|Values|
|----|-----------|-------|
|`automationName`|Which automation engine to use|`Appium` (default) or `Selendroid`|
|`platformName`|Which mobile OS platform to use|`iOS`, `Android`, or `FirefoxOS`|
|`platformVersion`|Mobile OS version|e.g., `7.1`, `4.4`|
|`deviceName`|The kind of mobile device or emulator to use|`iPhone Simulator`, `iPad Simulator`, `iPhone Retina 4-inch`, `Android Emulator`, `Galaxy S4`, etc.... On iOS, this should be one of the valid devices returned by instruments with `instruments -s devices`. On Android this capability is currently ignored.|
|`app`|The absolute local path _or_ remote http URL to an `.ipa` or `.apk` file, or a `.zip` containing one of these. Appium will attempt to install this app binary on the appropriate device first. Note that this capability is not required for Android if you specify `appPackage` and `appActivity` capabilities (see below). Incompatible with `browserName`.|`/abs/path/to/my.apk` or `http://myapp.com/app.ipa`|
|`browserName`|Name of mobile web browser to automate. Should be an empty string if automating an app instead.|'Safari' for iOS and 'Chrome', 'Chromium', or 'Browser' for Android|
|`newCommandTimeout`|How long (in seconds) Appium will wait for a new command from the client before assuming the client quit and ending the session|e.g. `60`|
|`autoLaunch`|Whether to have Appium install and launch the app automatically. Default `true`|`true`, `false`|
|`language`| (Sim/Emu-only) Language to set for the simulator / emulator |e.g. `fr`|
|`locale`| (Sim/Emu-only) Locale to set for the simulator / emulator |e.g. `fr_CA`|
|`udid`| Unique device identifier of the connected physical device|e.g. `1ae203187fc012g`|
|`orientation`| (Sim/Emu-only) start in a certain orientation|`LANDSCAPE` or `PORTRAIT`|
|`autoWebview`| Move directly into Webview context. Default `false`|`true`, `false`|
|`noReset`|Don't reset app state before this session. Default `false`|`true`, `false`|
|`fullReset`|(iOS) Delete the entire simulator folder. (Android) Reset app state by uninstalling app instead of clearing app data. On Android, this will also remove the app after the session is complete. Default `false`|`true`, `false`|

### Android Only

<expand_table>

|Capability|Description|Values|
|----|-----------|-------|
|`appActivity`| Activity name for the Android activity you want to launch from your package. This often needs to be preceded by a `.` (e.g., `.MainActivity` instead of `MainActivity`)|`MainActivity`, `.Settings`|
|`appPackage`| Java package of the Android app you want to run|`com.example.android.myApp`, `com.android.settings`|
|`appWaitActivity`| Activity name for the Android activity you want to wait for|`SplashActivity`|
|`appWaitPackage`| Java package of the Android app you want to wait for|`com.example.android.myApp`, `com.android.settings`|
|`deviceReadyTimeout`| Timeout in seconds while waiting for device to become ready|`5`|
|`androidCoverage`| Fully qualified instrumentation class. Passed to -w in adb shell am instrument -e coverage true -w | `com.my.Pkg/com.my.Pkg.instrumentation.MyInstrumentation`|
|`enablePerformanceLogging`| (Chrome and webview only) Enable Chromedriver's performance logging (default `false`)| `true`, `false`|
|`androidDeviceReadyTimeout`|Timeout in seconds used to wait for a device to become ready after booting|e.g., `30`|
|`androidDeviceSocket`|Devtools socket name. Needed only when tested app is a Chromium embedding browser. The socket is open by the browser and Chromedriver connects to it as a devtools client.|e.g., `chrome_devtools_remote`|
|`avd`| Name of avd to launch|e.g., `api19`|
|`avdLaunchTimeout`| How long to wait in milliseconds for an avd to launch and connect to ADB (default `120000`)| `300000`|
|`avdReadyTimeout`| How long to wait in milliseconds for an avd to finish its boot animations (default `120000`)| `300000`|
|`avdArgs`| Additional emulator arguments used when launching an avd|e.g., `-netfast`|
|`useKeystore`| Use a custom keystore to sign apks, default `false`|`true` or `false`|
|`keystorePath`| Path to custom keystore, default ~/.android/debug.keystore|e.g., `/path/to.keystore`|
|`keystorePassword`| Password for custom keystore|e.g., `foo`|
|`keyAlias`| Alias for key |e.g., `androiddebugkey`|
|`keyPassword`| Password for key |e.g., `foo`|
|`chromedriverExecutable`| The absolute local path to webdriver executable (if Chromium embedder provides its own webdriver, it should be used instead of original chromedriver bundled with Appium) |`/abs/path/to/webdriver`|
|`autoWebviewTimeout`| Amount of time to wait for Webview context to become active, in ms. Defaults to `2000`| e.g. `4`|
|`intentAction`| Intent action which will be used to start activity (default `android.intent.action.MAIN`)| e.g.`android.intent.action.MAIN`, `android.intent.action.VIEW`|
|`intentCategory`| Intent category which will be used to start activity (default `android.intent.category.LAUNCHER`)| e.g. `android.intent.category.LAUNCHER`, `android.intent.category.APP_CONTACTS`
|`intentFlags`| Flags that will be used to start activity (default `0x10200000`)| e.g. `0x10200000`
|`optionalIntentArguments`| Additional intent arguments that will be used to start activity. See [Intent arguments](http://developer.android.com/tools/help/adb.html#IntentSpec) | e.g. `--esn <EXTRA_KEY>`, `--ez <EXTRA_KEY> <EXTRA_BOOLEAN_VALUE>`, etc.
|`unicodeKeyboard`| Enable Unicode input, default `false`| `true` or `false`|
|`resetKeyboard`| Reset keyboard to its original state, after running Unicode tests with `unicodeKeyboard` capability. Ignored if used alone. Default `false`| `true` or `false`|
|`noSign`| Skip checking and signing of app with debug keys, will work only with UiAutomator and not with selendroid, default `false`| `true` or `false`|
|`ignoreUnimportantViews`| Calls the `setCompressedLayoutHierarchy()` uiautomator function. This capability can speed up test execution, since Accessibility commands will run faster ignoring some elements. The ignored elements will not be findable, which is why this capability has also been implemented as a toggle-able *setting* as well as a capability. Defaults to `false` | `true` or `false`

### iOS Only

<expand_table>

|Capability|Description|Values|
|----|-----------|-------|
|`calendarFormat`| (Sim-only) Calendar format to set for the iOS Simulator|e.g. `gregorian`|
|`bundleId`| Bundle ID of the app under test. Useful for starting an app on a real device or for using other caps which require the bundle ID during test startup. To run a test on a real device using the bundle ID, you may omit the 'app' capability, but you must provide 'udid'.|e.g. `io.appium.TestApp`|
|`udid`| Unique device identifier of the connected physical device|e.g. `1ae203187fc012g`|
|`launchTimeout`| Amount of time in ms to wait for instruments before assuming it hung and failing the session|e.g. `20000`|
|`locationServicesEnabled`| (Sim-only) Force location services to be either on or off. Default is to keep current sim setting.|`true` or `false`|
|`locationServicesAuthorized`| (Sim-only) Set location services to be authorized or not authorized for app via plist, so that location services alert doesn't pop up. Default is to keep current sim setting. Note that if you use this setting you MUST also use the `bundleId` capability to send in your app's bundle ID.|`true` or `false`|
|`autoAcceptAlerts`| Accept iOS privacy access permission alerts (e.g., location, contacts, photos) automatically if they pop up. Default is false.|`true` or `false`|
|`nativeInstrumentsLib`| Use native intruments lib (ie disable instruments-without-delay).|`true` or `false`|
|`nativeWebTap`| (Sim-only) Enable "real", non-javascript-based web taps in Safari. Default: `false`. Warning: depending on viewport size/ratio this might not accurately tap an element|`true` or `false`|
|`safariAllowPopups`| (Sim-only) Allow javascript to open new windows in Safari. Default keeps current sim setting|`true` or `false`|
|`safariIgnoreFraudWarning`| (Sim-only) Prevent Safari from showing a fraudulent website warning. Default keeps current sim setting.|`true` or `false`|
|`safariOpenLinksInBackground`| (Sim-only) Whether Safari should allow links to open in new windows. Default keeps current sim setting.|`true` or `false`|
|`keepKeyChains`| (Sim-only) Whether to keep keychains (Library/Keychains) when appium session is started/finished|`true` or `false`|
|`localizableStringsDir`| Where to look for localizable strings. Default `en.lproj`|`en.lproj`|
|`processArguments`| Arguments to pass to the AUT using instruments|e.g., `-myflag`|
|`interKeyDelay`| The delay, in ms, between keystrokes sent to an element when typing.|e.g., `100`|
|`showIOSLog`| Whether to show any logs captured from a device in the appium logs. Default `false`|`true` or `false`|
