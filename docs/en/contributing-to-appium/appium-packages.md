# Appium in a Nutshell

![Appium packages](./appium-packages.png)

## appium
- runs basic checks
  - node version (>= 4)
  - CLI arguments checks
    - contains all available and supported CLI arguments
    - check for deprecation and mutual exclusion
- put logging together
  - mixture out of npmlog, winston and a custom logger
- initiates AppiumDriver (extends Basedriver)
  - assigns iOS/Android/Selendroid/Fake driver to session
  - creates/deletes Appium session
- starts baseServer (appium-express)
  - passes routes given by driver

## appium-express (part of appium-base-driver)
- starts express server (allows x-domain-origin)
- initialises routes from AppiumDriver
- timeout handling
- serves a static page for test purposes
- connects req/res events to logger

## mobile-json-wire-protocol (part of appium-base-driver)
- provides list of Appium commands
- subclassed by drivers that will use the protocol
  - kind of middleware between client and driver
  - handles jwp proxy for driver
- contains error classes for all types of errors
  - sanitises error responses
- (un)wraps params to commands
- checks required params, validates params

## appium-base-driver
- designed to have a single testing session per instantiation
- contains constraints on caps (platformName has to be present, etc)
- validates capabilities
- runs chain of promised commands with single concurrency
- handles session restart
- handles swipe options
- exports class (DeviceSettings) to manage device settings (get/update)
- contains basic commands
  - to find elements
  - create/delete sessions
  - handle timeouts
  - set/update device settings
- provides helper methods for commands

## appium-ios-driver
- can also run as standalone server (has a small server part that extends from appium-express)
- supported strategies: "name", "xpath", "id", "-ios uiautomation", "class name", "accessibility id”
- can start a simulator or a real device (if udid is given)
  - runs for each type a huge set of instructions
    - removeInstrumentsSocket
    - setBundleIdFromApp
    - createInstruments
    - runSimReset, isolateSimDevice, setLocale || runRealDeviceReset
    - setPreferences || runRealDeviceReset
    - startLogCapture
    - prelaunchSimulator || (noop)
    - startInstruments
    - onInstrumentsLaunch
    - configureBootstrap
    - setBundleId
    - setInitialOrientation
    - initAutoWebview
    - waitForAppLaunched
  - all instructions are helper methods within driver.js
- contains a more specific set of capability constraints
- has logic to build and run Safari (safari-launcher) using appium-xcode
- implements commands for iOS driver
  - Selenium commands are compiled to ui-automator commands
  - commands will be send out to uiAutoClient (appium-uiauto)
- connects to appium remote debugger

## appium-xcode
- runs shell commands to return useful data from Xcode like
  - getPath
  - getVersion
  - getAutomationTraceTemplatePath
  - getMaxIOSSDK
  - …
- has an auto-retry built in

## appium-uiauto
- wrapper for the iOS UI Automation framework
- talks to it via socket connection
- runs a command queue that get filled up by the sendCommand function
- handles responses (as a buffer) from the ui-automation framework
- uses osascript to rotate screenshots
- provides method to bootstrap simulator/realdevice (dynamic-bootstrap)
  - javascript files which are run in the iOS UI Automation context (not node)
  - responsible to execute actual iOS UI Automation commands
  - see [UIAutomation docs](https://developer.apple.com/library/ios/documentation/DeveloperTools/Reference/UIAutomationRef/)
  - command flow is like
    - Webdriver command -> iOS driver command -> uiauto-command

## appium-instruments
- wrapper to run instruments commands
- a lot of exec calls to talk to instruments binary
- all of them take callbacks to propagate the result
- uses "iwd" (instruments without delay) packages which have to be compiled first
  - special Instruments package that gets rid of a delay between commands
  - contains also older versions of iwd instrument (v4 - v7)

## appium-ios-log
- captures console, performance and crash logs from the iOS simulator or real device
- by either calling tail to grab logs from a system path (simulator devices)
- or by calling deviceconsole (real devices)
- performance logs are getting grabbed using the remote-debugger
- crash logs remain in “.crash” files on the system

## appium-ios-simulator
- wrapper around iOS simulator app
  - start and shutdown (kill all) simulators
  - updating settings and locals
  - update/clean safari
  - grabs meta data about the simulator device
- uses simctl to talk to the simulator
- works for Xcode 6 and 7

## authorize-ios
- utility that pre-authorizes Instruments to run UIAutomation scripts against iOS devices
- enables developer tools by calling “DevToolsSecurity —enable”
- authorises user as developer calling “authorizationdb"
- changes ownerships of simulator directories

## node-simctl
- wrapper around simctl binary (cli utility to control an iOS simulator)
- executed as a subcommand of xcrun (locate or invoke developer tools from the command-line)
- contains functions to
  - install/remove apps
  - launch and shutdown simulators
  - create/erase/delete devices
  - get list of devices

## appium-cookies
- simple package to create and receive cookies
- used in the appium-ios-driver to implement jswonwire cookie commands within the web context

## appium-chromedriver
- wrapper around the chrome driver
- downloads and installs chromedriver binaries
- launches, restarts and stops (or kills all) chrome instances
- uses appium-jsonwp-proxy to send json wire protocol commands to the driver

## jsonwp-proxy (part of appium-base-driver)
- allows to send json wire protocol commands to a server that understands it (browser drivers)
- parses response into json
- allows to proxy requests to a proxied server
- used for communication in appium-chromedriver and appium-selendroid-driver

## appium-android-driver
- similar to appium-ios-driver it can run as standalone server
- automates native, hybrid and mobile web apps on emulators/simulators and real devices
- takes care of installing android packages to the device
- runs chromedriver sessions if desired
- contains a more specific set of capability constraints
- uses appium-adb to talk to the emulator/simulator/realdevice
- and appium-android-bootstrap to execute the actual commands
- contains helpers to figure out which web view belongs to which app package vice versa

## appium-adb
- wrapper around the Android Debug Bridge (adb)
- contains a bunch of commands that are basically just rpc to the adb binary
- houses jar files to run for special use cases like signing, verifying apps or moving manifests
- allows special (mobile specific) emulator commands that are not related to the webdriver protocol like
  - locking the screen
  - press back button
  - press home button
  - set/get airplane mode
  - set/get wifi state
- captures logcat
- handles emulator/simulator actions (e.g. reboot)

## appium-android-bootstrap
- JavaScript interface, and Java code, for interacting with Android UI Automator
- builds AppiumBootstrap.jar that contains logic to execute the commands
- counterpart to appium-uiauto
- once started it creates a web socket connection to the device
  - application provides start/shutdown/sendCommand interface
- command flow is like:
  - Selenium command -> appium-adb -> appium-android-bootstrap -> Java code using the Android UI Automator framework

## appium-uiautomator
- starts and shutdowns uiautomator server given by appium-android-bootstrap jar build
- command flow is like
  - appium-android-bootstrap:start -> appium-uiautomator:start -> appium-adb:install bootstrap

## appium-selendroid-driver
- similar to appium-android-driver it can run as standalone server
- downloads and installs Selendroid using appium-selendroid-installer
- contains several Selendroid specific logic to ensure a seamless integration
- contains a more specific set of capability constraints
- uses jsonwp-proxy to talk to the server
- used appium-adb to enable commands not implemented in Selendroid

## appium-selendroid-installer
- contains and exports a setup logic to
  - download Selendroid
  - determine AndroidManifest location
  - determine Server APK location
  - extracting both files
  - copying and cleaning files

## appium-android-ime
- allows to send and receive unicode characters from/to the Android device
- encodes text into UTF-7 sends it to the device and recodes it as Unicode
- used by appium-android-driver and appium-selendroid-driver

## appium-doctor
- diagnoses, reports and fixes common Node, iOS and Android configuration issues before starting Appium
- exposes cli command “appium-doctor"
- it checks for
  - Android:
    - android sdk exists and configured properly
    - env variables and path check
  - iOS:
    - xcode is installed (with command line tools)
    - dev tools security check
    - auth check
    - node binary check

## appium-gulp-plugins
- dev package with custom plugins used accross appium modules (for Appium development only)
- contains task for
  - e2e and unit tests (with coverage reporting)
  - transpiling ES2016 into ES5
  - static code analysis (jshint)
  - watch task for dev

## appium-remote-debugger
- RPC client to connect Appium to iOS webviews
- can connect to WebKit devtools
- for iOS only
- has two rpc client classes
  - remote-debugger-rpc-client: uses tcp6 that connects to localhost:27753
  - webkit-rpc-client: uses WebSockets to connect to ws://localhost:27753/devtools/page/${pageId}

## node-teen_process
- helper module that exposes:
  - exec: ES7 (async/await) implementation of exec that uses spawn under the hood
  - SubProcess: cuts down boilerplate when using spawn (especially when using in an async/await context)

## appium-logger
- basic logger defaulting to npmlog with special consideration for running tests
- exposes getLogger function that gets used by almost all Appium packages
  - defers to already-running logger if there is one, so everything bubbles up

## appium-support
- utility functions used to support libs used across appium packages.
- provides promise wrappers for some common operations like
  - system methods (isWindows, isLinux …)
  - utility methods like hasValue, escapeSpace
  - a bunch of fs methods
  - plist helpers for parsing and updating plist files
