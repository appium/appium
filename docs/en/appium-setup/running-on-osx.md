## Running Appium on Mac OS X

Appium on OS X supports iOS and Android testing.

### System setup (iOS)

* Appium requires Mac OS X 10.10 or greater.
* Make sure you have Xcode and the iOS SDK(s) installed. Xcode version 7.1 is
  recommended as earlier versions of Xcode are limited in which versions of iOS
  they can test against. See the next section for more detail.
* You need to authorize use of the iOS Simulator. See [below](#authorizing-ios-on-the-computer).
* If you're on Xcode 7.x and up, Instruments Without Delay (IWD) does not work.
  You can enable IWD (which will significantly speed up your tests) using [this
  method](/docs/en/advanced-concepts/iwd_xcode7.md)
* If you're on Xcode 6, you need to launch each simulator you intend to use
  with appium in advance, and change the default to actually show the soft
  keyboard if you want sendKeys to work. You can do this by clicking on any
  textfield and hitting command-K until you notice the soft keyboard show up.
* If you're on Xcode 6, you have a feature in Xcode called Devices
  (command-shift-2). You need to make sure that whichever deviceName you choose
  to use with Appium in your capabilities, there is only one of those per sdk
  version. In other words, if you send in a deviceName cap of "iPhone 5s" and
  a platformVersion cap of "8.0", you need to make sure that there is exactly
  one device with the name "iPhone 5s" and the 8.0 sdk in your devices list.
  Otherwise, Appium won't know which one to use.
* In iOS 8, devices each have their own setting which enables or disables
  UIAutomation. It lives in a "Developer" view in the Settings app. You need to
  verify that UIAutomation is enabled in this view before the simulator or
  device can be automated.

### Authorizing iOS on the computer

You need to authorize use of the iOS Simulator by running the `authorize-ios`
binary made available through `npm`. Install the program by running

```
npm install -g authorize-ios
```

And the invoke the program using

```
sudo authorize-ios
```

If you are running [Appium.app](https://github.com/appium/appium-dot-app), you can
authorize iOS through the GUI.

You need to do this every time you install a new version of Xcode.

### Testing against multiple iOS SDKs

Xcode version 7.1 allows for automatic testing against iOS versions 7.1 and later.

If you're using multiple Xcode versions, you can switch between them using:

    sudo xcode-select --switch &lt;path to required xcode&gt;

### Testing using Xcode 8 (including iOS 10) with XCUITest

In order to automate iOS devices with Xcode 8 (which includes all testing of iOS 10+),
you need to install the [Carthage](https://github.com/Carthage/Carthage) dependency
manager:

```
brew install carthage
```

### Testing Mac apps

Currently, the Mac app driver for appium does not ship with the AppiumForMac binary, which means, in order to automate Mac apps you must manually install the AppiumForMac application and grant it the appropriate OS X Accessibility permissions.

To Install Appium for Mac:
1. [Download a release](https://github.com/appium/appium-for-mac/releases/tag/0.2.0) and unzip the application into your `/Applications` folder
2. Follow the [brief supplemental installation instructions](https://github.com/appium/appium-for-mac#installation) to enable appium to have access to OS X's Accessibility APIs

For more information on using Appium for mac, checkout the [docs](https://github.com/appium/appium-for-mac#appium-for-mac).

### System setup (Android)

Instructions for setting up Android and running tests on Mac OS X are the same as
those on Linux. See the [Android setup docs](/docs/en/appium-setup/android-setup.md).

### Running iOS tests on OS X using Jenkins

First download the jenkins-cli.jar and verify the Mac successfully connects to Jenkins master. Ensure you've run the `authorize-ios` command mentioned above.

`wget https://jenkins.ci.cloudbees.com/jnlpJars/jenkins-cli.jar`

```
java -jar jenkins-cli.jar \
 -s https://team-appium.ci.cloudbees.com \
 -i ~/.ssh/id_rsa \
 on-premise-executor \
 -fsroot ~/jenkins \
 -labels osx \
 -name mac_appium
 ```

Next define a LaunchAgent for Jenkins to launch automatically on login. A LaunchDaemon will not work because daemons don't have GUI access. Make sure the plist doesn't contain the `SessionCreate` or `User` key as that may prevent tests from running. You'll see a `Failed to authorize rights` error if misconfigured.

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


### Files generated by iOS test runs

Testing on iOS generates files that can sometimes get large. These include logs,
temporary files, and derived data from Xcode runs. Generally the following locations
are where they are found, should they need to be deleted:

```
$HOME/Library/Logs/CoreSimulator/*
```

For Instruments-based tests (iOS _not_ using `XCUITest` as `automationName`):

```
/Library/Caches/com.apple.dt.instruments/*
```

For XCUITest-based tests:

```
$HOME/Library/Developer/Xcode/DerivedData/*
```
