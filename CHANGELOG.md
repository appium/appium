CHANGES IN VERSION 1.5 (from 1.4.16)
======================================

*NOTE*: Appium 1.5 is a complete rewrite of Appium from the ground up. Every
effort has been made to avoid any breaking changes but caution should be
exercised. Please let us know on GitHub if you notice any issues with your
tests.

#### General
- Appium now requires Node 0.12 as a minimum Node version
- Deprecate server arguments that are also desired capabilities. Instead, add
  a `--default-capabilities` argument which takes a JSON string of capabilities
  that will be the default for any session. E.g., `--default-capabilities '{"launchTimeout": 60000}'`
- Various docs and contributing docs updates (including a code of conduct for
  the project)
- Add capability validation on the protocol and driver level. Along with this
  we have tightened up requirements on capability values so that they can be
  strictly validated. For example, before you were able to send in a string
  value of `"180"` for the `newCommandTimeout` capability. Now you must send in
  an actual JSON number, e.g., `180`.
- Remove the `autoLaunch` capability since it added a significant
  amount of complexity to the startup flow and Appium shouldn't be responsible
  for this kind of use case
- Remove long-deprecated `name` locator strategy
- Remove long-deprecated `mobile: xxx` gesture commands, except scroll

#### iOS
- add Tapster support for some more touch methods
- fix moveTo: treat coordinates as relative, instead of absolute 
- iPhone 6 + 6S support
- iOS 9.3 support

#### Android
- enable navigating to an android URI via the set url driver methods, e.g.,
  driver.get('content://contacts/people/1')
- fix some adb issues in Windows (e.g., `signWithCustomCert`, sdk binary names)
- fix issue with UIWatcher ssl certificate errors
- if you want to install all chromedrivers, use --chromedriver-install-all; if
  you want to install a specific chromedriver version, use
  --chromedriver-version="$VER"
- `driver.closeApp` no longer runs through the shutdown routine; it simply
  force-stops the app
- The `ANDROID_ADB_SERVER_PORT` environment variable has been removed in favor
  of the `adbPort` desired capability, which does the same thing.

#### Non-exhaustive examples of internal changes
- see the [developer's
  overview](/docs/en/contributing-to-appium/developers-overview.md) for
  a fuller description of Appium 1.5 from a developer's perspective
- get rid of reset.sh and various other appium build tools in favor of a simple
  npm install
- split apart Appium into various smaller modules each with their own
  repositories and NPM packages
- use gulp instead of grunt
- use babel to transpile from es2015+ to standard es5 code
- get rid of .appiumconfig.json

CHANGES IN VERSION 1.4.16 (from 1.4.15)
===================================

#### iOS
- fix for safari and webview issues for 9.2

CHANGES IN VERSION 1.4.15 (from 1.4.14)
===================================

#### iOS
- fix for safari and webview issues in iOS9+

CHANGES IN VERSION 1.4.14 (from 1.4.13)
===================================

#### iOS
- support for iOS9.2
- fix for webview, resolving context issues in iOS9+

#### Selendroid
- upgrade to Selendroid 0.17.0.

CHANGES IN VERSION 1.4.13 (from 1.4.12)
===================================

#### Chromedriver
- Setting appium-chromedriver version to 2.3.2 as it is stable on Node version 0.10.32

CHANGES IN VERSION 1.4.12 (from 1.4.11)
===================================

#### iOS
- support for iOS9.1
- fix for iOS simulator with similar device names on Xcode 7
- fix to idevicelog (real device) to record logs only for device under test

CHANGES IN VERSION 1.4.11 (from 1.4.10)
===================================

#### iOS
- fix for iOS simulator selector for Xcode 7
- fix for selecting default device for iOS9

CHANGES IN VERSION 1.4.10 (from 1.4.9)
===================================

#### General
- fixed bug in a config file accidentally published in version 1.4.9

CHANGES IN VERSION 1.4.9 (from 1.4.8)
===================================

#### iOS
- support for iOS9 and xcode 7
- at this point instruments-without-delay is not supported for xcode-7

CHANGES IN VERSION 1.4.8 (from 1.4.7)
===================================

#### General
- fix for Windows users! Now the system architecture is properly detected, npm installs should work again

#### Chromedriver / Android hybrid
- fix for an issue in responding to `/status` api endpoint, this is used heavily by Selenium grid

CHANGES IN VERSION 1.4.7 (from 1.4.6)
===================================

#### Chromedriver / Android hybrid
- fix for problem in downstream jsonwp-proxy; now sessionId returned is replaced
  with sessionId present in url(original sessionId). Fixed this in appium-jsonwp-proxy 1.2.3

CHANGES IN VERSION 1.4.6 (from 1.4.5)
===================================

#### General
- this is a republish because of a misconfiguration before 1.4.5 got published
  resulting in a server startup failure


CHANGES IN VERSION 1.4.5 (from 1.4.4)
===================================

#### General
- fix problem with npm shrinkwrap that caused Appium not to start


CHANGES IN VERSION 1.4.4 (from 1.4.3)
===================================

#### Chromedriver / Android hybrid
- fix a problem in downstream appium-chromedriver; no longer rely on async
  methods returning objects of the Promise type. This was causing undefined
  errors when running Chromedriver/hybrid tests.


CHANGES IN VERSION 1.4.3 (from 1.4.2)
===================================

#### iOS
- update the appium-instruments dependency with working subdeps


CHANGES IN VERSION 1.4.2 (from 1.4.1)
===================================

#### General
- update ES6-based dependencies which got bit by a breaking Regenerator
  change

#### iOS
- keep track of the correct app ID for Safari webviews (fixes problems in
  finding the webview for iOS)

#### Android
- fix sendKeys and clear for Samsung devices


CHANGES IN VERSION 1.4.1 (from 1.4)
===================================

#### Chromedriver
- have the appium-chromedriver manage the chromedriver binary download/install


CHANGES IN VERSION 1.4 (from 1.3.7)
======================================

#### General
- fix for broken `./reset.sh --dev` due broken UICatalog build package in sample-code submodule
- fix for issues with cookie encoding
- updated sample code
- updated documentation
- updated test suite
- deprecate node 0.10

#### iOS
- support for iOS 8.3
- deprecate iOS 6.1 and iOS 7.0 (support will be removed soon, probably 1.5)
- deprecate Xcodes less than 6.3 (moving to support of latest versions only,
  and Xcode 6.3+ together allows automation of all supported iOS versions). The
  only exception to this is the combination of Xcode 6.0.1 + iOS 8.0.
- fix for issues relating to finding xcode folder and Info.plist
- new sever flag `--instruments <path>` to specify custom path to instruments commandLine tool
- fix for getOrientation
- fix for iOS crash log retrieval

#### Android
- fix for killing chromedriver on windows
- fix for parsing java version correctly
- support for searching elements by id without passing package name
- requesting capabilities from server now returns correct deviceName and platformVersion for Android
- fix for scrollTo
- new capability `disableAndroidWatchers`
- deprecated capability `stopAppOnReset`
- new capability `dontStopAppOnReset`
- fix a crash possibly encountered during extracting app strings
- new server argument `suppress-adb-kill-server`
- fix issue with `keys()`; now it correctly targets currently-focused element

#### Selendroid
- Support for installApp, isAppInstalled and removeApp

#### Android+Chrome
- Chormedriver version updated to 2.15
- fix for driver.quit()
- use the correct ADB path already identified by Appium

#### iOS+Safari
- fix for handling real device object
- fix for safariAllowPopups for iOS 8.x
- reduce logging in remote debugger for real devices, and don't use console.log
- fix issues with SafariLauncher on real devices
- fix execute_async so that it now works at all

CHANGES IN VERSION 1.3.7
======================================

#### General
- fix failure to remap session id in proxied responses

#### iOS
- fix intermittent failure to find Xcode

CHANGES IN VERSION 1.3.6
======================================

#### Android
- fix XPath regression where Appium failed to recognize non-ASCII characters
- fix regression where Appium failed to set ADB's path during Chromedriver tests

CHANGES IN VERSION 1.3.5
======================================

#### iOS
- fix for a bug when driver.get() never returns for page with alert.
- iOS 8.2 support.
- fixed safari startup crashes.
- ensure Appium drops into the right continuation cb when selecting hybrid contexts.

#### Android
- now finds the location of adb earlier.
- ensure encoding stream in Bootstrap.jar closes correctly.
- add workaround for issue where UiAUtomator fails to find visible elements.
- fixed undefined member error for the release object.
- add a delete key test.

#### Selendroid
- upgrade to Selendroid 0.13.0.

CHANGES IN VERSION 1.3.4
======================================

#### General
- better handling of session closing.
- tmp dir customization via env variable.
- app/browserName error  message fix.
- functional test fixes.

#### iOS
- allow location services in zip file.
- ensure a string is returned from iOS getText.
- simpler device type detection logic.
- screenshotWaitTimeout cap
- added ios-webkit-debug-proxy launcher to go round libidevice 8.1 bugs
- waitForAppScript capability.
- syslog fix
- getStrings refactoring
- simulator folder fix
- doctor support for OSX 10.10.1

#### Android
- exec refactoring.
- uses for latest apktool (2.0.0-RC2) when Java 7 is detected.
- ADB.jars refactored into instance property.
- smart keyboard closing fix.
- added support for getting the resourceId attribute of an element.
- clear text fix for large centered edit fields.
- better handling of errors in clear text.
- ensure an already-running Android device's language and country settings are correct.
- fixed unknown server-side error is thrown when the XPath expression doesn't match any nodes.
- better error handling is SetText
- edit + clear fields with hint text fix.
- make hideKeyboard do nothing when keyboard is present but not closable (has no UI).

#### Selendroid
- upgrade to Selendroid 0.12.0.
- throws when getting a redirect from Selendroid.
- added hideKeyboard support.
- uses for latest apktool (2.0.0-RC2) when Java 7 is detected.

CHANGES IN VERSION 1.3.3 (from 1.3.1)
======================================

#### General
- fix several internal Appium tests
- add a sendKeyStrategy capability to allow testers to enable less reliable, but faster sendKey method
- add handling for safeRimRafSync ENOENT mesages
- clean up sessions when session clobbering enabled
- fix stripping log colors on --stripColors
- create system logs file before tailing it

#### iOS
- fix issue where driver.current_context is `null` for native app context
- fix bug that prevents closing tabs in Safari
- fix log capture when Appium starts a simulator for the first time
- add OSX 10.10 and iOS8 support for Appium Doctor
- fix inability to open Safari on a real device

#### Android
- fix arg and cap parsing when passing arguments to adb
- add support for passing elements as targets for swipe actions
- correctly calculate relative position of swipe targets
- ensure ChromeDriver instances are properly terminated
- fix appPackage parsing error with overlapping namespaces
- fix TouchAction release bug when released element is not valid
- ensure `logcat` correctly appended to command string

#### Selendroid
- add comment to caps page, and to running tests page, to note the need for a period before an activity

CHANGES IN VERSION 1.3.2
=====================================

#### Patch number skipped due to NPM error

CHANGES IN VERSION 1.3.1 (from 1.3.0)
=====================================

#### iOS
- fixed a bug where appium could hang if the 'full-reset' and 'keepKeychain' capabilities were both used on ios8.1
- default context now set to `NATIVE_APP` instead of being null

#### Android
- fix bugs which arise from spaces in the path to `adb` tool
- fix detection of whether the screen is locked
- fix an error with running remote apk's on Windows

CHANGES IN VERSION 1.3.0 (from 1.2.4)
======================================

#### General
- allow `full-reset` desired capability to work alongside `language`/`locale` desired capabilities

#### iOS
- add iOS 8 support
- add support for launching an app on the sim just by bundleId (iOS8 only)
- ensure screenshot process uses dir specified in --tmp
- add --isolate-sim-device which removes all other xcode 6 simulators
  before running test (might be necessary for some platforms)
- update mobile safari temp app to include platformVersion so we don't get
  strange version conflicts
- reset push notification privacy settings in between sessions
- fix the flakiness of getting a list of available devices
- auto-refresh Safari if no webviews are found
- rewrite cookie handling code to use code derived from jQuery instead of mozilla docCookie
- force device string when device name starts with "="
- fix a security hole in pullFile() where users could download files on the machine hosting appium

#### Android
- fix Chromedriver to work with newer versions
- Chromedriver will work if adb is not running on default port
- speed up clearing text fields when there is hint text

#### Selendroid
- fix sendKeys() in CHROMIUM context
- fix getContexts()

CHANGES IN VERSION 1.3.0-beta1 (from 1.2.3)
======================================

#### General
- add objective-c examples

#### iOS
- update appium-instruments with logging fixes
- add iOS 8 support
- add support for launching an app on the sim just by bundleId (iOS8 only)
- ensure screenshot process uses dir specified in --tmp
- add --isolate-sim-device which removes all other xcode 6 simulators
  before running test (might be necessary for some platforms)
- update mobile safari temp app to include platformVersion so we don't get
  strange version conflicts
- reset push notification privacy settings in between sessions


CHANGES IN VERSION 1.2.4 (from 1.2.3)
======================================

#### General
- add objective-c examples

#### iOS
- update appium-instruments with logging fixes
- update appium-instruments with getDevices stalling fix

#### Android
- give better error for UiScrollable parse exception
- fix UiSelector instance in finds
- use last coordinates for touch release


CHANGES IN VERSION 1.2.3 (from 1.2.2)
======================================

#### General
- add a settings api (used currently only for Android xpath compression)
- add configurable loglevels for different transports
- allow appium to be run under sudo if the sudo user owns the appium files

#### iOS
- fix crash while recovering from instruments failure
- add ability to launch app by 'bundleId' cap alone (no 'app' cap)
- misc groundwork for iOS8
- fix bug that prevented scrolling collectionViews
- more crash recovery bugfixes
- use 'click' atom in webviews, 'tap' sent two clicks
- fix bug where we'd try to kill a null logging proc and crash
- enable performance logs for webviews
- allow automation of native frame in safari (actually works on 7.1!)
- fix uiautomation predicate search bug
- fix 'spawn ENOENT' bug caused by a missing deviceconsole binary
- fix autoAcceptAlert bug
- fix certain findElement crashes
- fix hideKeyboard bugs

#### Android
- fix issue with unzipping apk
- add ability to launch arbitrary apps/activities mid-session
- add lock() method to lock screen
- add unlock() method to unlock screen
- fix bug where app would be classified incorrectly as not installed
- add settings api member for setting layout hierarchy compression
- fix crash when touch actions attempted on webviews
- undo setText changes and simply handle hint text fields better

#### Selendroid
- fix --selendroid-quick reset.sh option
- fix unicode keyboard issues
- fix bug in getting window_handles
- fix bug that would prevent launching an app with spaces in its apk path


CHANGES IN VERSION 1.2.2 (from 1.2.1)
======================================

#### General
- add doc for running on multiple devices simultaneously
- move sample code and sample apps out of the main appium repo
- remove http request size limit

#### iOS
- check to make sure an element is not UIAElementNil before returning it
- add a configurable key delay to help with keyboard smudging
- fix issue with deleting cookies in mobile safari
- correct sendKeys behavior not to clear text before sending keys
- remove 'iwebview' support, since automating safari works
- fix bug where apostraphes in accessibility ids caused elements not to be
  found
- use deviceconsole instead of idevicesyslog to capture ios logs
- fix bug where automating safari on a real device would hang forever and never
  start a session
- fix bug where getting text() on a textfield would return its label instead of
  its value

#### Android
- cache Chromedriver webview objects so we don't need to start a new
  Chromedriver on every context switch
- correct sendKeys behavior not to clear text before sending keys
- allow chromeOptions cap object to be passed to chromedriver
- download all chromedriver architectures for linux (32 and 64 bit)
- make sure we stop adb logcat logging when ending a chrome session so we don't
  leak processes
- add noSign capability to skip the apk resigning process
- add setText method that will clear a text field before adding text; this is
  primarily useful for textfields with hint text where clear() does not work
  in general
- move xpath parsing into the android bootstrap, for fewer bugs and greater
  reliability. NOTE: this could be a breaking change depending on the kind of
  xpath selectors you are using
- clean android XML tags of invalid characters like '$'
- fix bug where '&' would be sent into a textfield as '&-'
- add isLocked method to determine whether screen is locked
- add ability to automate the native portion of the Chrome/Browser apps

#### Selendroid
- make sure the contact manager test app has the required internet permissions


CHANGES IN VERSION 1.2.1 (from 1.2.0)
======================================

#### General
- fix up sample code
- bring back support for autoLaunch=false case
- reset commandTimeout during implicit wait cycles
- remove deprecated window_handles methods
- add --local-timezone flag that uses timezone for timestamps
- add a configurable --callback-address and --callback-port for execute_async
- update setLocation method to use correct spec params for geolocation
- add networkConnection to server capabilities so clients can use the API
- if boolean cap values are sent in as strings, convert them to boolean

#### iOS
- fix bug where we waited for safari7 dirs when we weren't on ios7.x
- improve deviceName flexibility and device recognition
- make sure instruments and uiauto know about the tmp dir flag
- fix install/uninstall logic for real ios device
- fix bug with parsing of binary vs XML plists
- fix handling of multiple taps
- clean up iOS simulator log
- fix hang when ending a real safari session
- implement pushFile for ios
- allow .ipa in the list of downloadable app types
- retry getting screenshot if it fails
- fix JavaScript error when using sendKeys
- fix error where testsuite would kill appium in its ios reset cycle
- fix error in getting localized strings

#### Android
- fix handling of IME activation
- fix chromedriver kill logic
- support API level 10 style focused activity strings
- add lots of fallback strategies for element.clear()
- update api level dependency for the project to 19
- add fallback strategies for finding app activity from AndroidManifest
- fix bug with xpath searches for //*
- fix xpath search bugs, now we use UiAutomator's instance() which is more
  reliable
- fix grunt-helpers bug when building appium on windows
- retry all adb commands to make all adb commands less flakey
- upgrade chromedriver to 2.10

#### Selendroid
- fix for setValue and getContexts methods, they were not using a custom
  selendroid port if active
- selendroid now requires internet permission in apps; fail if it's not
  present
- add custom keystore support
- upgrade selendroid to 0.11.0


CHANGES IN VERSION 1.2.0 (from 1.1.0)
======================================

#### General
- migrated to express 4 for the webserver
- allow setting tmp dir with --tmp flag
- upgrade many submodules including wd
- add --strict-caps mode which will cause sessions to fail which send in
  bad or unknown caps
- add error handling for invalid multi-pointer gestures
- add autoWebview capability to automatically get into a webview context of a
  hybrid app
- remove deprecated -real xpath locator strategy
- allow bypassing appium's sudo checks
- add generic crash handler
- many documentation and sample code updates

#### iOS
- prevent log lines without dates from being filetered out
- add keepAppToRetainPrefs cap to avoid deleting location plists
- check for accessibility id matching selector then fall back to string match
- add flag for specifying where in .app hierarchy Localizable.strings is
- use a dynamic bootstrap in appium-uiauto
- upgrade mechanic
- implement pullFolder to get an entire folder from the sim
- make sure launchAndKill can wait for specified directories before killing sim
- get rid of ForceQuitInstruments
- update hideKeyboard to take various possible strategies
- fix launchAndKill to wait for safari-specific directories
- make sure all pageload timeouts are cleared and called only once
- disable ios grace delay
- don't return duplicate elements

#### Android
- renamed keyevent to press_keycode and long_press_keycode
- add dedupe to complex_find
- fix activity-finding logic
- fix error handling in installApp
- extract adb code into its own package, appium-adb
- add support for opening notifications
- add automation support for embedded chromium
- fix pushStrings to work with 'app' as package
- fix id serach
- cause appium to fail if we can't parse package/activity
- add package name to android webview context
- make sure UNZIP env var doesn't confuse our internal unzip calls
- add appIntent etc capabilities so app can be launched with a certain intent
- add IME methods, and an appium-specific IME that is automatically installed
- add unicodeKeyboard capability which allows sending unicode text
- fix installApp, prevent a server crash

#### Selendroid
- faster selendroid installer


CHANGES IN VERSION 1.1.0 (from 1.0.0)
======================================

#### General
- less buggy xcode locator strategy for iOS and Android
  - note that for Android this might cause previous xpath selectors not to
    work, since we now always set compressed hierarchy when getting the xml
dump used for xpath
- fix defaults for swipe duration
- add fixes for context switching
- add optional argument 'language' to getStrings
- update docs and code samples (including adding perl code samples)
- continue work on appium CI
- make sure we can't close already ended sessions
- upgrade all node deps besides express

#### iOS
- add `-ios uiautomation` strategy doc

#### Android
- allow for encoding of non-ASCII text
- clearer activity error messages
- add language and country support
- extract strings from apk corresponding to device language instead of default
  to be used with ID locator strategy
- update complex find with new uiautomator constants
- upgrade Chromedriver to 2.10
- allow automation of Chrome Beta with browserName: `ChromeBeta`

#### Selendroid
- update selendroid to 0.10.0
- add getStrings method


CHANGES IN VERSION 1.0.0 (from 1.0.0-beta.2)
=======================================

#### General
- update python samples to use 1.0 style
- don't convert 'proxy' or 'launchTimeout' caps into strings
- make sure commit hooks use local grunt and mocha
- update some ruby samples to use 1.0 style
- add more 1.0 docs and sample code

#### iOS
- fix mobile safari native tap on android by offsetting tap position by 40px
- go back to using unpatched UICatalog
- fix autoAcceptAlerts
- allow multiple calls to /contexts
- update appium-instruments with fix that would prevent the basic 'iPhone
  Simulator' device from launching correctly

#### Android
- fix gesture timing so it doesn't interpret ms as seconds

#### Selendroid
- ensure selendroid isn't proxied appium endpoint commands


CHANGES IN VERSION 1.0.0-beta.2 (from 1.0.0-beta.1)
=======================================

#### General
- extensive docs updates (make it ready for the new Slate docs)
- decode sequence of actions to native "swipe" method
- fix valid platform error message
- update WD dep
- fix proxying when session id is null
- allow spaces in appium folder name in reset.sh
- get rid of tag name loc strat in favor of class name

#### Android
- allow for different input sets to mobile: find
- fix apk signing with custom keystore
- allow MultiActions without an element
- move chrome tests into their own emulator type
- fix async bug in getting xml dump
- use async.queue to ensure synchronicity of commands
- improve DumpWindowHierarchy so xpath queries don't crash


CHANGES IN VERSION 1.0.0-beta.1 (from 0.18.0)
=======================================

#### General
- fix broken log options: --log, --log-no-colors, and --log-timestamp
- update docs to work with Jekyll
- change 'launch' desired cap to 'autoLaunch', same defaults
- fix installApp, launchApp, closeApp, removeApp to use correct app path
- fix bug in action handling for python client
- remove deprecated window handle support for native clients (in favor of contexts)
- remove deprecated old xpath support and promote the '-real xpath' strategy to the
  default
- remove deprecated json page source in favor of xml
- remove deprecated mobile methods: location, fireEvent, waitForPageLoad,
  findElementNameContains, localScreenshot, getCommandTimeout, findAndAct
- rewrite caps.md doc to use new 1.0 style caps
- remove deprecated --merciful and --device-port flags (add
  --force-quit-instruments flag instead of -m)
- lots of docs reorganization and prep for new publishing method
- fix valid platform list
- update npm deps to latest (except for express)
- remove all deprecated "mobile: xxx" commands, except for gestures for now
- use new native methods from WD in testsuite

#### iOS
- fix bug where iOS < 7.1 would try to ask instruments for available devices
- loosen up sudo check for authorize_ios so it can run without issue under sudo
- rename `nonSyntheticWebClick` cap to `nativeWebTap`, and turn it off by
  default

#### Android
- fix bug with XML page source where it wouldn't create the dump file correctly
- change caps with hyphens (-) like "app-package" to be camelCased like the
  rest of Appium caps, e.g., "appPackage"
- fix bug with custom keystore apk signing
- allow multi actions without an element

#### Selendroid
- fix command timeout bug


CHANGES IN VERSION 0.18.0 (from 0.17.6)
=======================================

*Important*: This is the Appium 1.0 feature-complete pre-release. Please the
discussion group for more context and details about this release and where
Appium is headed in the near future.

#### General
- disallow use of appium under sudo (except for authorize_ios)
- don't autopopulate node config host (so appium url can be set in nodeconfig)
- many build and test tweaks and fixes to improve build stability
- don't link commit hooks if we're not in a git repo
- add "accessibility id" locator strategy
- get rid of a bunch of unused grunt commands
- deprecate use of JSON page source (XML will be the standard)
- simplify reset strategy and make reset strategies available through caps.
  There's now the default (fastReset), fullReset, and noReset.
- deprecate "tag name" locator strategy
- add real xpath support (for now under the "-real xpath" locator strategy)
- deprecate old xpath strategy
- a lot of work on appium CI
- further update new capability handling and device selection; use only the
  new caps internally
- implement TouchAction and MultiTouch APIs
- migrate all "mobile: " methods to their own REST endpoints; they are now
  deprecated
- don't allow users to send in bad platformNames; fail with an error instead
- allow app paths relative to appium root
- add command-line flags corresponding to the new desired capabilities

#### iOS
- add "-ios uiautomation" locator strategy
- make backup path for built-in apps in ios 7.0 configurable
- only count one out of the two textfields which compose an ios 7.1 textfield
- introduce a distinction between global and post-launch timeouts for
  instruments, to fine-tune flake management
- rewrite screenshot logic
- modify "mobile: scroll" to take an element argument
- fix bug where bundleID would be improperly lowercased
- allow changing of remote debugger ports with env variable
- fix bug in device launching logic that would try to launch an invalid device
  as the default
- add "mobile: pullFile" support for retrieving files from the sim folders
- update fruitstrap to a version which doesn't segfault for Japanese

#### Android
- make sure app is signed before getting MD5 hash for use in on-device install
- ensure that the app is always force-stopped before uninstalling the APK
- add "-android uiautomator" locator strategy
- fix bug involving storing android binary paths incorrectly
- add avdLaunchTimeout and avdReadyTimeout caps to fine-tune these timeouts
- retry launching AVD once if it never connects to adb
- if installing a remote apk fails, uninstall/rm, then retry


CHANGES IN VERSION 0.17.6 (from 0.17.6)
=======================================

#### General
- disallow use of Appium in sudo mode
- ensure publishes happen with a version of Node which doesn't generate
  shasum errors in NPM


CHANGES IN VERSION 0.17.5 (from 0.17.4)
=======================================

#### Selendroid
- update Selendroid to 0.9.0


CHANGES IN VERSION 0.17.4 (from 0.17.3)
=======================================

#### General
- fix "mobile: reset"
- use the new Context API (from [the spec
  draft](https://code.google.com/p/selenium/source/browse/spec-draft.md?repo=mobile))
  for switching back and forth between webviews. The window handles strategy
  will be deprecated in 1.0
- update Wd.js to use a version with context support
- sanitize desired caps so they are always a manageable type

#### iOS
- allow testing of iOS7.1 in Appium's testsuite/test.sh
- don't error out of pref path finding too soon if there are multiple dirs

#### Android
- fix "mobile: push"
- fix fastReset going undefined between sessions
- add --avd-args server param to pass args to avd on boot
- various fixes for starting avds, including allowing multiple emulators to be
  running
- fix getElement() to set isElement to false instead of throwing
- fix touch actions by fixing leaking state across executions
- remove fastClear and run `pm clear` on fastReset

CHANGES IN VERSION 0.17.3 (from 0.17.2)
=======================================

#### General
- add new desired capabilities handling to conform to the Selenium 3 spec. Use
  of old desired capabilities will now be deprecated. See [the spec
  draft](https://code.google.com/p/selenium/source/browse/spec-draft.md?repo=mobile) for more information

#### Android
- fix process detection
- make sure temp dir exists before writing zipaligned apk to it

CHANGES IN VERSION 0.17.2 (from 0.17.1)
=======================================

This is simply a release to make Appium downloadable on npm.

CHANGES IN VERSION 0.17.1 (from 0.17.0)
=======================================

#### General
- move toward CI: build appium and run reset.sh on Travis

#### iOS
- pass quiet flag to fruitstrap when in quiet mode
- update appium-instruments (which fixes retry behavior)

#### Android
- fix uninstall detection


CHANGES IN VERSION 0.17.0 (from 0.16.0)
=======================================

#### General
- fix maxBuffer error in installApp command
- rearchitect device extraction and configuration from args/caps, and add lots
  of unit tests
- show non-default server params in server log for easier debugging
- add --command-timeout as a server arg
- don't ever use sudo to install npm submodules
- ensure appium's CWD is always the appium dir
- clear out commandTimeout between sessions, so subsequent sessions don't count
  the session launching time as command time
- set npm submodules to track published branches
- relax requirements for unpacking zipfiles and finding app names

#### iOS
- handle both binary and xml plists when changing ios settings plists
- break out appium-instruments into its own npm package
- fix bug where command line --force-iphone or --force-ipad wouldn't set
  device. This should fix issues with Appium.app
- add --keep-keychains server arg / keepKeychains desired cap in order to
  disallow deletion of Keychains dir
- bring reset behavior back to what it was before location services / settings
  updates, so that with the default reset, most directories are still cleared
  out
- use actual current ios sdk in reset.sh
- create plist basedirs if they don't exist
- add processArguments cap to pass args to AUT
- make --merciful the default
- require bundleId when using location services caps
- update UICatalog test app for 7.1
- fix duplicate textfield issue in iOS 7.1
- use new instruments `- w` param in iOS 7.1 to set device type
- add location and contact alert request buttons to TestApp

#### iOS+Safari
- update initial webview navigation logic to work on 7.1
- if we start with a real webview, don't try to nav to webview through favs

#### Android
- added support for 'direction' in scrollTo
- fix source command
- add longClick by position and duration
- fix reset.bat issues on Windows
- updated Windows installation instructions
- added --udid flag to reset.sh/bat, so it can uninstall from specific devices
- added support for touch{Down|Up|Move}
- add "mobile: push" and "mobile: pull" commands to send files to/from device
- ensure apks are always run through zipalign
- parse launch package and activity from apk, so that `app-package` and
  `app-activity` caps are no longer required
- use better version of `isAppInstalled`

#### Chrome+Android
- update bundled chromedriver to 2.9
- add enablePerformanceLogging cap


CHANGES IN VERSION 0.16.0 (from 0.15.0)
=======================================

#### General
- auto-configure the host and port for nodes in an appium grid
- fix usage of temp folders on windows/linux
- allow better usage of reset.sh in windows git-bash
- add linking of pre-commit hook in reset.sh so everyone runs it

#### iOS
- fix regression where special keys wouldn't be sent
- add `mobile: scroll` with direction: up/down/left/right to scroll views
- display correct error when app install/uninstall fails on real device
- update TestApp to show location services enabled status
- add `locationServicesAuthorized` cap
- add `locationServicesEnabled` cap
- add `safariIgnoreFraudWarning` cap
- add `safariAllowPopups` cap
- update uiauto js to retrieve references to app/windows dynamically every time

#### iOS+Safari
- wait longer for webviews to appear in ios7
- return latest window with getWindowHandles()
- move hardcoded atoms out of appium into its own npm module which builds them
- add `nonSyntheticWebClick` cap to use atoms for click in ios7

#### Android
- fix installing unlock app on windows paths with spaces
- add test coverage mechanism
- don't fail the test if we can't find strings.xml in an apk
- add hybrid support for webviews in 4.4+ apps
- fix `mobile: launchApp`

#### Chrome+Android
- bundle chromedriver into appium itself, remove system dependency

#### Selendroid
- remove requirement to manually update selendroid test apk path in test code
- update selendroid (with maven 3.1.1 requirement)


CHANGES IN VERSION 0.15.0 (from 0.14.2)
=======================================

#### General
- fix for issue where logger would log colors even when asked not to
- stricter jshint rules enforceable from editor
- reformat/restructure test suite
- handle previously-unhandled errors when using spawn()
- fix startup bug (status object being taken as session id)
- clear sessionOverride instance var when cleaning up session
- fix regression where appium git revision wasn't shown in server output
- various testsuite tweaks/fixes

#### iOS
- don't wait 30s for instruments to terminate
- use SIGKILL for instruments again
- allow ios logs to be not found without crashing appium
- allow automation of settings app via 'app: settings' cap
- don't crash if IDevice init fails (when requesting real device)
- don't try to remove app if it's not on the device
- escape single quotes for id search
- lint the uiauto js code
- allow accented characters in send_keys()
- delete the entire sim folder when using --full-reset (before & after)

#### iOS+Safari
- allow safari to pre-launch
- don't tap apple button to get into webview on real device safari
- don't use synthetic click on real device safari
- fix undefined window handle bug
- fix safariLauncher crashes

#### Android
- add new mobile methods: toggleData, toggleFlightMode, toggleWifi,
  toggleLocationServices
- convert uiautomator error stream to string
- use a better method for finding build-tools and platform-tools dirs
- implement new version of longClick
- add `mobile: find` example
- return element's classname by selenium `tag_name` method/property
- add `app-wait-package` desired cap, to be used in concert with
  `app-wait-activity`

#### Chrome+Android
- fix unlock errors
- fix port-in-use bug which prevented automation of multiple chromes on
  multiple emulators

#### Selendroid
- upgrade to 0.8.0


CHANGES IN VERSION 0.14.2 (from 0.14.1)
=======================================

#### General
- fix bug that prevented appium from starting in ios

CHANGES IN VERSION 0.14.1 (from 0.14.0)
=======================================

#### General
- fix bug that prevented appium from pre-launching without specified device

#### iOS
- when alert title is null, return text instead
- add framework for setting iOS and app preferences via plists
- add `enableLocationServices` desired cap for enabling/disabling location
  services on the simulator

#### Android
- fix fast reset/clear logic to not fail when remote apk doesn't exist

#### Selendroid
- actually wait for app-wait-activity instead of app-activity


CHANGES IN VERSION 0.14.0 (from 0.13.0)
=======================================

#### General
- add ability to set launch timeout from command line
- require 'device' cap and fail without it
- bring back appium shell
- add new node examples
- add troubleshooting docs in Chinese
- fix app download suffix issue
- major refactor of test code

#### iOS
- delete cache data for all versions of sim
- fix sporadic DOM corruption issue
- make reset.sh more Xcode 4.6 friendly
- add flag to show simulator logs in-line with appium logs
- add cap for automatically accepting photo permission alerts
- update appium doctor to read new auth db value
- keep track of ios crash logs and make available through selenium interface
- cleanup app state pre-test and post-test
- fix installing/removing .app (instead of .ipa)
- escalate to SIGKILL if instruments doesn't respond to SIGTERM
- add cap for using native instruments lib
- return accessibility hint as 'hint' attribute

#### Android
- fix AVD startup bug
- better error handling in element finding code
- update ApiDemos app with webview
- support doing web testing against stock browser on 4.4
- increase support of android 4.4 toolchain
- fix multiple device issue
- implement `mobile: background` for android/selendroid
- fix custom keystore unzip call stack issue

#### Chrome+Android
- add ability to deal with a different kind of session redirect
- kill chromedriver before starting it up again to clear out ports

#### Selendroid
- re-instate closeApp and removeApp
- fix issue where selendroid would crash based on activity mangling,
  resulting in a mysterious connection reset error
- upgrade to 0.7.0
- show selendroid logs in appium output


CHANGES IN VERSION 0.13.0 (from 0.12.3)
=======================================

#### General
- add sauce reporting to ruby example
- normalize all ruby examples
- don't allow linux platforms to run ios doctor checks
- allow building of single platforms in reset.sh (don't delete other platforms)
- fix bug with --show-config & npm
- removed some unused tests
- remove retry support from appium test harness
- catch grid syntaxerror issue
- make sure gappium tests actually get run

#### iOS
- update docs for setting up ios-webkit-debug-proxy
- fix authorize_ios
- make sure setLocale doesn't run on real devices
- give webviews a bit of time to show up before we say they aren't there
- fix the auth db doctor check to work for 10.7
- when launching simulator without instruments, wait for sim logs
- kill zombie sim daemon launchers
- update mobile: reset
- automatically retry launching instruments if it flakes out. The number of
  retries can be set with `-r N` or `--backend-retries N`, where `N` is
  the number of retries, including 0.
- add support for automating real Safari (and other built-in apps) in iOS7
- remove support for using iwebview as a Safari replacement
- when running mobile safari tests, automatically detect ios version
- update i-w-d for compatibility with xcode 5.1 / ios 7.1

#### Android
- remove dependency on grep for real devices
- add 19.0.0 to possible build paths
- add tests for apk downloading and fix apk downloading issue
- check for API level >= 17 for uiautomator and fail sooner if not
- fix issue where calculating md5 of app would use too much memory, for large
  apps
- fix bug with checking whether app already existed on device

#### Selendroid
- give useful error message if user tries to run a uiautomator-based
  "mobile: " command in selendroid
- update selendroid


CHANGES IN VERSION 0.12.3 (from 0.12.2)
=======================================

#### General
- reset command timeout during mobile: reset
- fixes for strategy validation ('dynamic' and 'class name' are valid)
- add --show-config flag to dump appium config and exit
- add option to set newCommandTimeout to 0 or false to disable it entirely
  rather than working around it by setting a high value
- refactor server/main.js -- things were getting ugly
- fix issue where ForceQuitUnresponsiveApps would try to run even on non-Mac
  systems

#### iOS
- change default device for iOS 6 to "iPhone" (non-retina)
- change Xcode 5.0.1 warning message to indicate an upgrade is possible now
- add --default-device flag to allow instruments to launch the sim like it
  used to
- get rid of deprecated authorization strategy code
- include ForceQuitUnresponsiveApps output in appium log
- add --merciful (-m) flag to avoid running ForceQuitUnresponsiveApps. Show
  Instruments a bit of mercy...or don't.

#### Selendroid
- upgrade Selendroid to 0.7.0


CHANGES IN VERSION 0.12.2 (from 0.12.1b)
=======================================

- None (npm fix release)

CHANGES IN VERSION 0.12.1b (from 0.12.1)
=======================================

- None (npm fix release)

CHANGES IN VERSION 0.12.1 (from 0.12.0)
=======================================

#### General
- add appium doctor for checking system config issues that prevent appium
  from working properly. Run with `node bin/appium-doctor.js`, or
  `appium-doctor` if installed via NPM, or via the GUI in Appium.app
- fail sooner if user passes in bad locator strategy
- fix app extracting logic

#### iOS
- fix locale settings logic
- fix 64-bit device string
- fail with a nicer message if xcrun can't find instruments
- allow iwebview tests to automate https sites
- kill simulators before launching new ones
- automatically force quit unresponsive instruments processes


CHANGES IN VERSION 0.12.0 (from 0.11.4)
=======================================

#### General
- make sure there's no color in console when --log-no-colors is used
- add more chinese docs
- allow periods in xpath node names
- update style guide
- bring all NPM dependencies up to date

#### iOS
- mobile web: doc updates
- mobile web: make sure window.close() works on real devices
- mobile web: connect to most recent webview instead of first
- allow uiauto to get path to node binary from `node_bin` key in .appiumconfig
- fix automatic UDID detection
- improve webviewapp to be a safari replacement; can now be used for mobile
  web automation using `app: iwebview`
- use `deviceName` cap to select specific iOS device
- mobile web: automatically accept popup window alerts
- give informative error message if ideviceinstaller isn't present
- add a wait after flick calls so client doesn't regain control before flick
  has finished

#### Android
- make sure chrome tests don't require package/activity
- make sure we force-stop apps before starting them
- fix issue with checking for package/activity for chrome
- make sure to kill any running uiautomator processes before test
- add `fastClear` desired cap, default true. If false, uses reinstall
  instead of `pm clear` to reset an app
- anytime we call `dumpsys windows` when checking for screen lock, dump output
  to $APPIUM_HOME/.dumpsys.log so we can learn more about error cases


CHANGES IN VERSION 0.11.4 (from 0.11.3)
=======================================

#### General
- add ruby scrollTo example

#### iOS
- fix dismissAlert / acceptAlert on ios7
- make instruments logging quiet by default (put verbose=true in
  ~/.instruments.conf to re-enable)
- fix safarilauncher shutdown issue
- add tests for setting slider values
- set ios sim language using desired caps
- add more error handling in instruments_client

#### Android
- fix issue with adb path and quote truncation
- fail with a nice message if app activity/package are not sent in

#### Selendroid
- fix keyevent
- add command timeout tests


CHANGES IN VERSION 0.11.3 (from 0.11.2)
=======================================

#### General
- remove wiki
- various doc updates
- reset command timeout for proxied devices (incl selendroid)
- translate docs to Chinese
- make desired capabilities returned by /session/:id non-hard-coded

#### iOS
- add support for sim and devices for safari launcher
- major refactor of ios startup cascade
- fix tracetemplate detection logic
- add ability to select code-signing identity for safari launcher
- use securitydb for authorization on 10.9
- expose 'syslog' logs through selenium log interface

#### Android
- various control flow/subprocess fixes
- don't uninstall app when --no-reset is used

#### Selendroid
- update selendroid version



CHANGES IN VERSION 0.11.2 (from 0.11.1)
=======================================

#### General
- fix bug where running `appium` after installing via npm would error out
  because the logger was not initialized correctly
- fix bug in reset.sh where setting --real-safari would cause android et al
  not to build


CHANGES IN VERSION 0.11.1 (from 0.11.0)
=======================================

#### General
- fix launch timeout bug
- update travis CI to use newer version of node
- remove .appiumconfig before running reset.sh
- update reset.sh to build safarilauncher for real devices only when
  passing in the --real-safari flag
- made test.sh sh-compatible
- update all example code to use correct desired capabilities
- don't set content-length header for http POSTS with no body
- add more desired caps to docs
- expand on android setup for mac osx in docs
- remove multiple device handling code--appium just does one device at a time
  per server
- handle command timeouts centrally rather than per-device
- add --log-timestamp and --log-no-colors options to server

#### iOS
- fix sim control authorization on mavericks
- copy instead of symlink xpath/status into uiauto for non-breaking npm install
- fix cookie methods error case in mobile safari
- fail with an error message if user is on xcode 5.0.1 since it comes with
  a broken instruments binary

#### Android
- don't uninstall app on fast reset
- fix crash that occurred when no devices were connected
- fix unlock logic and change order of regex search
- correctly handle responses for element{Displayed|Enabled|Selected}
- refactor adb/android/uiautomator startup/shutdown logic to make
  callback-based
- kill uiautomator if the startup cascade for android fails, so it doesn't
  zombify


CHANGES IN VERSION 0.11.0 (from 0.10.4)
=======================================

#### General
- make tempdirs uniquely named
- massive code reorganization
- retry getting a session in testsuite to avoid flaky fails

#### iOS
- update ios alert handling
- use safariLauncher without 20/30 secs timeout
- allow .ipa extension for local apps

#### Android
- clean app using `pm clear` instead of clean.apk
- massive refactor/rewrite of android/adb code
- fix dependency download error
- ensure all apks are signed


CHANGES IN VERSION 0.10.4 (from 0.10.3)
=======================================

#### iOS
- add callback for remote debugger socket disconnect to avoid race conditions

#### Android
- allow _ in package name
- add timeout for orientation change


CHANGES IN VERSION 0.10.3 (from 0.10.2)
=======================================

#### General
- this is a bugfix release

#### iOS
- compile the i-w-d shim correctly for ios7


CHANGES IN VERSION 0.10.2 (from 0.10.1)
=====================================

#### General
- update docs
- README rewrite

#### iOS
- allow spaces in xcode path
- completely reset and restart simulator between sessions
- turn CA_DEBUG_TRANSACTIONS on
- enable `authorize_ios` on Mavericks
- fix bug making handling alerts take longer than necessary

#### Android
- update clean.apk
- refactored setOrientation
- fix screenshot method
- implement pinch in / out
- upgrade unlock.apk
- use pm uninstall/install in reset

#### Windows
- lots of reset.bat improvements
- make some more paths windows friendly


CHANGES IN VERSION 0.10.1 (from 0.10.0)
=====================================

#### Android
- add hybrid app docs
- fix unlock.apk for android 2.3
- get unlock.apk into build/ so prebuilt packages can use it

#### Selendroid
- make unlock.apk work with selendroid
- change remote url for selendroid submodule
- update selendroid to 0.6.0


CHANGES IN VERSION 0.10.0 (from 0.9.1)
=====================================

#### General
- update contributor style guide
- add some troubleshooting tips to doc
- update test.sh for a better testing flow

#### iOS
- autodetect tracetemplate rather than bundling with appium
- choose version of instruments-without-delay based on xcode version
- get rid of --ios-sdk flag in reset.sh since appium now autodetects

#### Android
- fix find elements by ID
- update clean.apk
- update touchevent for longpress
- add unlock.apk which is a more robust device unlock solution
- enable mobile chrome support on windows
- better support for tapping invisible elements


CHANGES IN VERSION 0.9.1 (from 0.9.0)
=====================================

#### General
- add desired caps doc
- moveTo defaults to 0.5, 0.5
- add some more node/yiewd examples
- beefed up test.sh

#### iOS
- fix issue with finding ids
- add --ios-sdk flag to reset.sh to choose between 6.1/7.0
- various ios 7 compatibility fixes
- significant refactor of ios session lifecycle code, fixing various issues
- add automatic UDID detection
- attempt to tap element's coordinates when typical method doesn't work
- support more types of zip archives

#### Android
- restart adb up to 10 times instead of 2
- fix --avd launching bug
- fix swipe steps/duration logic (note: will affect test behavior)
- support metastate for keyevent

#### Phonegap
- fix submodule issues

_Historical Note_: This version of Appium was published by @jlipps in a moving
vehicle on a drive from Krakow, Poland to Warsaw, Poland. Thanks, @bkobos, for
the chaffeurship and wi-fi!


CHANGES IN VERSION 0.9.0 (from 0.8.5)
=====================================

#### General
- update troubleshooting doc
- fix app unzip issue
- remove app/apk files from zip path before appium starts
- fix location of UICatalog in reset.sh
- fix reset.sh android device matching
- update ruby examples
- add chrome example in node
- improve python example code
- begin to migrate tests from wd to yiewd

#### iOS
- respond to the last command even if instruments crashes
- don't attempt to reset real devices
- update instruments-without-delay with ios7 support
- add findById support (uses localization strings)
- add mobile: getStrings
- support setting value for sliders and switches with sendKeys()
- add preliminary support for ios7 with a different tracetemplate
- make mobile: localScreenshot more robust by fixing race condition
- add phonegap example

#### Android
- don't require 'avd' to be set in order to install/uninstall to android
- dynamic find can use classmap aliases
- make it easy to run multiple android devices simultaneously
- support for dragFrom / dragTo functions in API level 18
- use resource-id for finding elements (findById)
- make getSize available
- make desired cap for compressedLayoutHierarchy
- add new version of unsign.jar
- fix stopCapture bug
- remove some deprecated methods (xmlKeyContains, etc)
- add mobile: getStrings
- always return true for click() (uiautomator bug)
- fix getAttribute to return strings instead of bool
- fix tests for use with now-required 4.3 emulator
- add phonegap example

#### Selendroid
- track selendroid dev branch instead of master
- upgrade to selendroid 0.5.0

#### Windows
- update docs
- some windows compat fixes


CHANGES IN VERSION 0.8.5 (from 0.8.4)
=====================================

#### GENERAL
- reorder problematic async calls (issue #1000!)
- misc refactoring

#### Android
- allow install/uninstall without device id
- fix race condition in starting chromedriver

#### Selendroid
- update selendroid version
- fix issue preventing errors from proxying correctly


CHANGES IN VERSION 0.8.4 (from 0.8.3)
=====================================

#### GENERAL
- some documentation updates
- give appium server a big http timeout so it doesn't drop connections

#### Android
- make sure chromedriver tries to restart adb if it fails the first time
- add logcat retrieval for android and selendroid

#### IOS
- allow use of --ipa and --app flags together
- try out a fix in mechanic.js for the (null) tap issues


CHANGES IN VERSION 0.8.3 (from 0.8.2)
=====================================

#### GENERAL
- update various documentation (gestures, inspector tutorial, README)
- allow dashes in bundle/package IDs
- fix bad address startup error message
- use native function.bind() throughout instead of a mix of scoped objects
  and underscore.bind()

#### Android
- use UiAutomator for back() instead of keyevent
- use UiAutomator for keyCode instead of adb shell
- use UiAutomator for screenshot instead of adb shell

### IOS
- add some more mechanic aliases (keyboard, key)
- add pinch/zoom gestures
- add Java example for automating mobile safari
- automatically accept location services dialogs if we can access them
- accept text-based Info.plist files in addition to binary ones
- use reset.sh to download UICatalog rather than node/grunt


CHANGES IN VERSION 0.8.2 (from 0.8.1)
=====================================

#### GENERAL
- make sure build/ is deleted by reset.sh
- re-publish without extraneous artifacts in build/


CHANGES IN VERSION 0.8.1 (from 0.8.0)
=====================================

### GENERAL
- update java examples to show correct use of JavascriptExecutor
- fix parser bug that prevented launching on windows
- fix missing parameter generating exceptions in testsuite
- fix more stdout maxBuffer errors
- fix android tests to use new activity style
- return timeout in set timeout commands

### IOS
- fix mobile safari alert-handling issues
- attempt to capture and resolve location services popup using desired cap

### ANDROID
- require shortcut activities to start with ".", allowing fully-qualified
  activities with packages different from the main appPackage
- if appium fails to launch activity with ".", it will retry
- allow downloaded apps to end in .apk as well as .zip
- fix xpath parser error not allowing widget packages to be used
- add longClick command
- added JUnit and TestNG examples
- support ChromiumTestShell as well as Google Chrome for Chrome tests

### SELENDROID
- fall back to `am start` if Selendroid doesn't successfully launch the app

CHANGES IN VERSION 0.8.0 (from 0.7.3)
=====================================
### GENERAL
- bump maxBuffer for various subprocesses
- automatically re-register appium with grid if it disconnects
- augment style guide
- allow appium tests to read appium server port from $APPIUM_PORT

### IOS
- add support for locking device for X seconds
- add support for backgrounding app for X seconds
- make finding node/instruments_client more robust for instruments context
- mobile methods for installing/uninstalling apps to device
- add shortcut for UIACollectionCell and UIATableCell
- ensure isEnabled returns a boolean value

### ANDROID
- add mobile: searchId method to search for string by ID
- add mobile: resolveId method to resolve strings
- fix activity detection to be more allowing of different strings
- enable keystore for using different certs
- fix issue when large messages are transferred from bootstrap
- fix takesScreenshot capability
- add long tap method
- make screenshot work on windows
- fix scrollTo support

### CHROME
- add support for automating Chrome on Android!

### SELENDROID
- update selendroid to 90aef5d

CHANGES IN VERSION 0.7.3 (from 0.7.2)
=====================================
### IOS
- bugfix: authorize_ios needed #!

CHANGES IN VERSION 0.7.2 (from 0.7.1)
=====================================
### GENERAL
- make sure reset.sh checks for JAVA_HOME set for android/selendroid
- add mobile: reset docs
- alias POST /touch/click to POST /click

### IOS
- fix discrepancy between isDisplayed() and isVisible() and isEnabled()
- use new Automation.tracetemplate
- fixes for checking alerts in webviews
- page source now gets all windows, not just main window
- allow custom node path by setting NODE_BIN in a settings file
- add authorize_ios binary to npm install so npm users can authorize their ios
  sim

### ANDROID
- use path.resolve in a cross-platform way

### SELENDROID
- fix use of adb from within selendroid
- keyevent support
- fix app-wait-activity

CHANGES IN VERSION 0.7.1 (from 0.7.0)
=====================================
### SELENDROID
- update to new version with new build instructions
- make selendroid port configurable

### WINDOWS
- fix use of exec and spawn so external commands work

CHANGES IN VERSION 0.7.0 (from 0.6.1)
=====================================
### GENERAL
- allow new session requests to override current session; this can be disabled
  with the --no-session-override flag
- make sure reset.sh fails if android bootstrap can't build
- make --no-reset do what it's supposed to do, and fix description in docs
- check to make sure conflicting arguments aren't passed to the server before
  launching
- removed deprecated flags completely (hence the minor version bump)
- bringing some error messages into line across platforms
- fix some issues with grunt building functions

### ANDROID
- add find element by ID (parses strings.xml)
- remove a sleep in bootstrap server that caused delays
- make sure app is uninstalled when not using fast reset
- make sure AndroidManifest.xml.apk is writable (for npm installed appium)
- make sure device wakes up / unlocks before running test
- add set geo location support
- clean up and fix issues relating to mid-session bootstrap.jar restart
- app-wait-activity now takes comma-separated list of valid activities

### IOS
- fix some tests
- fix mobile: reset

CHANGES IN VERSION 0.6.1 (from 0.6.0)
=====================================
### GENERAL
- started work on mobile_methods.md doc
- added hardcore mode to reset.sh that will refresh uicatalog inter alia
- ios-webkit-debug-proxy docs
- appium now registers correctly with selenium grid
- better bundle/package detection

### IOS
- mobile: setLocation and POST /location for setting geolocation
- updated tests to work with new uicatalog version
- allow registering a websocket handler for alerts
- escape sendKeys values so you can send '
- fixed up tests a little bit

### ANDROID
- fix fast reset race condition
- fix lack of AndroidManifest.xml.src in npm
- allow registering a websocket handler for alerts
- added method for getting location of element
- fixed package name for webviews

CHANGES IN VERSION 0.6.0 (from 0.5.2)
=====================================
### GENERAL
- initial Windows appium support (Android-only)
- reset.sh no longer fails silently if it errors
- added reset.bat for windows
- get status now returns actual appium version
- make sure reset.sh uninstalls android test apps if emulator is running
- include the git revision in the status object and in the logs at startup
- misc bugfixes

### IOS
- ability to talk to mobile Safari on a real device over USB
- added native back() method
- sendKeys now only taps on field if it doesn't already have focus

### ANDROID
- find by name checks to see if it found the element
- find by xpath no longer returns duplicate elements
- add support for ADT 22
- add "mobile: waitForPageLoad" that waits for indicators to clear
- fix scrollTo

### SELENDROID
- build selendroid modded servers in /tmp for npm
- fixed issue with running tests for multiple apps sequentially

### ROBOT
- initial support for robot automation (robot intercepts tap etc)

### APPIUM.EXE
- not strictly part of appium, but the Windows GUI has arrived in beta!

CHANGES IN VERSION 0.5.2 (from 0.5.1)
=====================================
### IOS
- fixed regression in mobile safari pre-launch

CHANGES IN VERSION 0.5.1 (from 0.5.0)
=====================================
### GENERAL
- updates to python examples
- refactored configuration code
- initial work making Appium's node code windows-compatible
- more lenient treatment of relationship between $HOME and system username

### IOS
- fixing webview not waiting for page loading on url nav issue
- added node-idevice which streamlines installing .ipas on real devices
- implement scrollTo
- fixed bug in xpath code which returned last element first

### ANDROID
- add some docs for installing HAXM
- add scroll_into_view for mobile: find
- completed android element class map

### SELENDROID
- http timeout tweaks

CHANGES IN VERSION 0.5.0 (from 0.4.1)
=====================================
### GENERAL
- significant change for command-line params for appium:
    - --without-delay is now on by default. to turn it off, use
      --native-instruments-lib if you don't want it
    - --fast-reset is now on by default. to turn it off, use --full-reset
    - --verbose is now on by default. to turn it off, use --quiet

CHANGES IN VERSION 0.4.1 (from 0.4.0)
=====================================
### GENERAL
- added --dev flag to reset.sh to optionally include test apps / dev deps
- added --verbose flag to reset.sh to optionally spew info (was default)
- reset.sh now puts all binaries in /build so it can be packaged and reused by
  npm et al

### IOS
- added more Java examples

### SELENDROID
- updated selendroid to 56581e27b45c3a4483d89701fc893ac37b172e46

CHANGES IN VERSION 0.4.0 (from 0.3.1)
=====================================
### GENERAL
- more python examples including for android
- node android code example
- migrated wiki to appium/docs
- added troubleshooting docs
- added auto-tagging of repo on npm publish
- add a config check to make sure reset.sh was run for a specific device
  before allowing appium to try to start a session with that device

### IOS
- various efforts to fix/workaround the (null).tap() issue in UIAutomation
- added shake()

### ANDROID
- partial match on content-desc
- find aapt in SDK or path
- better logging all around
- ensure app apk exists and fail if not
- added content-desc to all ApiDemos elements
- added --avd flag for launching emulator if not running
- added getName()
- fix mobile: find

### SELENDROID
- updated selendroid to 0.4
- don't re-build selendroid for each app, just re-insert manifest and build
  selendroid in reset.sh instead

### FIREFOXOS
- Initial Firefox OS support landed!

CHANGES IN VERSION 0.3.1 (from 0.3.0)
=====================================
### GENERAL
- support for xpath indexes
- support for xpath last()
- docs specific to linux
- fix name of npm binary-plist dependency

### IOS
- update instruments-without-delay (fix #432)
- fix #437 (implicit wait didn't work after ios reset)
- when searching for @text, fall back to @label and @value
- allow @name to refer to @text, @label, and @value
- have "textfield" searches return "secure" fields as well
- add "collection" tag name
- make sure to do a clean build before building sample apps

### ANDROID
- fix xpath wildcard issue
- fix tag name selector
- alias "window" tag name to "frame"
- tweak flick timing
- have swipe/flick return errors if we know they didn't execute
- fix page source on real device
- use aapt rename to handle manifest stuff
- screenshot support
- support for the clear() method

### SELENDROID
- fix proxy behavior
- added example/test for selendroid webview
- add WebViewDemo app with tasks for building it

CHANGES IN VERSION 0.3.0 (from 0.2.3)
=====================================
### GENERAL
- Running tests with grunt will now not crash on first test failure
- Rewrote reset.sh to respect sudo and to run for individual platforms
- Changed markdown rendering engine and logic for generating appium.io from
  README.md

### ANDROID
- Add "mobile: find" method for complex find combinations
- Check that clean.apk is signed
- Orientation support
- Update verify.jar to work on java 6
- Massive refactoring of adb.js
- Added Selendroid proxy support (!)

CHANGES IN VERSION 0.2.3 (from 0.2.2)
=====================================
### GENERAL
- removed bloated appium.io submodule, replaced with no-binary one
- Fix plist resetting regression (#342)
- Fix to ensure GET /sessions doesn't return false information

### IOS
- Allow instruments to find node binaries in MacPorts default location
- Allow instruments to find node binaries from Appium.app
- Rotate screenshots to match orientation of device
- Fix python examples
- Webview: add tests for implicit attributes
- Made sure window handles are always strings
- Reduced flakiness of swipe tests
- Added a Sauce Connect example
- C# example updates
- Fixed a few minor regressions

### ANDROID
- Large refactoring of bootstrap code
- Moved ApiDemos code into a submodule which is included and built for tests
- Fix install command
- Support for element-based swiping
- Use selenium touch actions for flick()
- Some error message improvements
- Make sure we lint adb.js

CHANGES IN VERSION 0.2.2 (from 0.2.1)
=====================================
### IOS
- safari: use js close() instead of clicking buttons to close windows
- webview: make title() always return title for default context
- webview: async javascript execute
- webview: fix when webelements are returned to client
- allow launching app via bundle id and not just app path
- webview: get/set/delete cookie(s)
- correctly rotate screenshot images if taken in landscape mode

### ANDROID
- add eclipse formatting file for bootstrap
- stop when activity fails to show up
- make content-desc search case-insensitive and partial
- allow launching emulator according to device id
- only sign app for clean apk once

CHANGES IN VERSION 0.2.1 (from 0.2.0)
=====================================
### GENERAL
- fix bug in npm dependencies (make swig a real dependency)

### IOS
- fixed scoping bug in alert handling
- get rid of --warp flag, instruments-without-delay is better
- safari: clear cookies/history/windows in between test runs

CHANGES IN VERSION 0.2.0 (from 0.1.3)
=====================================
### GENERAL
- updates to reset.sh
- host our own guinea pig html page for webview tests
- updated java examples and docs

### IOS
- webview: isActive()
- webview: submit()
- webview: clear()
- webview: selected()
- webview: implicit waits
- webview: location()
- webview: getName()
- webview: moveTo() and generalized click()
- webview: getWindowSize()
- webview: close()
- webview: don't allow alerts to cause webview requests to hang forever
- webview: find element(s) from element
- webview: get alert text
- webview: set prompt value
- allow pre-launching local zips/apps/safari from cli
- webview: allow execution in arbitrary frames
- "mobile: leaveWebView" special command instead of frame(null)
- webview: equalsElement()
- webview: back() and forward()
- webview: refresh()
- "mobile: fireEvent" for webview
- enable setting of device orientation through desired caps
- fix to not allow native commands to execute if webview command in progress
- bugfix in ios.js that left multiple remote debugger objs hanging around
- bumped command timeout since webview commands don't reset it

### ANDROID
- fix in swipe where steps weren't converted to integers
- "mobile: keyevent" for hitting arbitrary keys
- native back()
- xpath search by "*"
- skip uninstall if --fast-reset set
- better error handling if activity is not found
- match other kinds of button than android.widget.Button with "button"
- allow matching custom class name (partial class name matching)
- relaunch on failure (or on screen cap)
- begun work to get bootstrap in maven
- flick() as an alias of sorts for swipe()

-- changes not tracked before v0.1.3 --
