## The UIAutomation Driver for iOS

> **Note**: This driver is _DEPRECATED_ and should not be used unless
> absolutely necessary. The information in this doc may not keep up to date
> with reality, and the driver will be removed in a future version of Appium.
> To begin iOS automation with Appium today, please use the [XCUITest
> Driver](/docs/en/drivers/ios-xcuitest.md) instead.

Appium's former method for iOS app automation was based on `UIAutomation`, an
Apple-provided framework that shipped with the iOS SDK until iOS 10, when it
was removed. `UIAutomation` was one of the tools included in Apple's
Instruments profiling system, and provided a JavaScript API that ran
synchronously in the context of a single app. The Appium UIAutomation driver
established an asynchronous, session-based WebDriver front end for this API.

Development of the UIAutomation driver is done at the
[appium-ios-driver](https://github.com/appium/appium-ios-driver) repo.

### Requirements and Support

In addition to Appium's general requirements:

* Xcode 7 or lower.
* iOS simulators or devices with version 9.3 or lower.
* All versions of Appium ship with this driver.
* For correct functioning of the driver, see additional setup below.

### Usage

The way to start a session using the UIAutomation driver is to set the
`platformName` [capability](#TODO) in your [new session request](#TODO) to the
value of `iOS`. Of course, you must also include appropriate `platformVersion`,
`deviceName`, and `app` capabilities, at a minimum.

### Capabilities

The UIAutomation driver supports a number of standard [Appium
capabilities](/docs/en/writing-running-appium/caps.md), but has an additional
set of capabilities that work for this driver only (see the [iOS
section](/docs/en/writing-running-appium/caps.md#ios-only) of the
aforementioned doc).

To automate Safari instead of your own application, leave the `app` capability
empty and instead set the `browserName` capability to `Safari`.

### Commands

To see the various commands Appium supports, and specifically for information
on how the commands map to behaviors for the UIAutomation driver, see the [API
Reference](#TODO).

### Simulator Setup

(Note that due to limitations of Xcode and the iOS simulator, only one
simulator may be open, and automated, at any given time. For multiple simulator
support, you will need to upgrade to the [XCUITest driver](ios-xcuitest.md)).

1. For best results, launch each simulator you wish to use and ensure the following:

    * The soft keyboard is enabled (Command+K in the Simulator app)
    * UIAutomation is enabled in the Developer settings menu
    * There is not more than one simulator with the same name in Xcode's
      "Devices" organizer

### Real Device Setup

Running tests on real devices is considerably more complicated due to code
signing and additional workarounds to Apple limitations. The basic process for
a successful automation strategy using this driver are as follows:

1. Build your app with a Debug configuration, for the specific type of real
   device you will run the test on, ensuring that the app is also signed for
   running on your specific device. For example:

    ```
    xcodebuild -sdk <iphoneos> -target <target_name> -configuration Debug \
        CODE_SIGN_IDENTITY="iPhone Developer: Mister Smith" \
        PROVISIONING_PROFILE="XXXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXX"
    ```

1. Install the built app (usually now located in a build directory specified in
   Xcode) to your test device yourself, ensuring it exists on the device and
   there are no signing issues. There are a number of methods for installing
   apps onto devices. One is to just use Xcode itself. Another is to use the
   `ideviceinstaller` tool provided as part of the `libimobiledevice` suite.
   A third is to use [ios-deploy](https://npmjs.org/package/ios-deploy).
   Here's an example for `ideviceinstaller`:

    ```
    # first install ideviceinstaller, using Homebrew (http://brew.sh)
    brew install libimobiledevice
    ideviceinstaller -u <UDID of your device> -i <path to your built app>
    ```

1. Use the bundle ID of your application as the value of the `app` capability.
1. Use the UDID of your device as the `udid` capability.
1. As above, ensure that UI Automation is enabled in the Developer settings.

Following these steps should ensure your success! If you're using newer
versions of Xcode (7.x, for example), you may wish to consult the [XCUITest
Driver Real Device Docs](https://github.com/appium/appium-xcuitest-driver/blob/master/docs/real-device-config.md)
as they may contain some pertinent information as well.

### Real Device Hybrid / Web Testing

For hybrid and web testing, Appium requires the use of the Remote Debugging
Protocol to send JavaScript to execute inside a web view. For real iOS devices,
this protocol is encrypted and access must be facilitated using a 3rd-party
tool, provided by Google, called
[ios-webkit-debug-proxy](https://github.com/google/ios-webkit-debug-proxy)
(IWDP). For information on installing and using IWDP within Appium, check out
the [IWDP doc](/docs/en/writing-running-appium/web/ios-webkit-debug-proxy.md).

For web testing, i.e., tests that run in the Safari browser, we have another
hurdle to jump. On real devices, apps that are not signed by the developer
cannot be instrumented with UIAutomation. Safari is one such app. Thus we have
a helper app called `SafariLauncher`, which _can_ be signed by the developer.
Its sole purpose upon launching is to turn around and launch Safari, which can
then be automated via the Remote Debugger in conjunction with IWDP. Unfortunately
you cannot, in this case, move into the native context and do any automation of
the browser itself.

For instructions on setting up `SafariLauncher`, check out the [SafariLauncher
doc](/docs/en/drivers/ios-uiautomation-safari-launcher.md).

### Files generated by iOS test runs

Testing on iOS generates files that can sometimes get large. These include
logs, temporary files, and derived data from Xcode runs. Generally the
following locations are where they are found, should they need to be deleted:

```
$HOME/Library/Logs/CoreSimulator/*
/Library/Caches/com.apple.dt.instruments/*
```

### Running iOS tests using Jenkins

First download the `jenkins-cli.jar` and verify that the Mac successfully
connects to Jenkins master.

```
wget https://jenkins.ci.cloudbees.com/jnlpJars/jenkins-cli.jar

java -jar jenkins-cli.jar \
 -s https://team-appium.ci.cloudbees.com \
 -i ~/.ssh/id_rsa \
 on-premise-executor \
 -fsroot ~/jenkins \
 -labels osx \
 -name mac_appium
```

Next define a LaunchAgent for Jenkins to launch automatically on login.
A LaunchDaemon will not work because daemons don't have GUI access. Make sure
the plist doesn't contain the `SessionCreate` or `User` key as that may prevent
tests from running. You'll see a `Failed to authorize rights` error if
misconfigured.

```
$ sudo nano /Library/LaunchAgents/com.jenkins.ci.plist
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.jenkins.ci</string>
    <key>ProgramArguments</key>
    <array>
        <string>java</string>
        <string>-Djava.awt.headless=true</string>
        <string>-jar</string>
        <string>/Users/appium/jenkins/jenkins-cli.jar</string>
        <string>-s</string>
        <string>https://instructure.ci.cloudbees.com</string>
        <string>on-premise-executor</string>
        <string>-fsroot</string>
        <string>/Users/appium/jenkins</string>
        <string>-executors</string>
        <string>1</string>
        <string>-labels</string>
        <string>mac</string>
        <string>-name</string>
        <string>mac_appium</string>
        <string>-persistent</string>
    </array>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/Users/appium/jenkins/stdout.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/appium/jenkins/error.log</string>
</dict>
</plist>
```

Finally set the owner, permissions, and then start the agent.

```
sudo chown root:wheel /Library/LaunchAgents/com.jenkins.ci.plist
sudo chmod 644 /Library/LaunchAgents/com.jenkins.ci.plist

launchctl load /Library/LaunchAgents/com.jenkins.ci.plist
launchctl start com.jenkins.ci
```
