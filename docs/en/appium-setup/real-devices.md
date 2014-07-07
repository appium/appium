## Appium on real iOS devices

Appium has support for real device testing.

To get started on a real device, you will need the following:

* An [Apple Developer ID](https://developer.apple.com/programs/ios/)
 and a valid Developer Account with a configured distribution certificate and
 provisioning profile.
* An iPad or iPhone.
* A signed `.ipa` file of your app, or the source code to build one.
* A Mac with [Xcode](https://itunes.apple.com/en/app/xcode/id497799835?mt=12)
 and the Xcode Command Line Developer Tools.

### Provisioning Profile

A valid iOS Development Distribution Certificate and Provisioning Profile are
necessary to test on a real device. Your app will also need to be signed. You
can find information about this in the [Apple documentation](https://developer.apple.com/library/ios/documentation/IDEs/Conceptual/AppDistributionGuide/TestingYouriOSApp/TestingYouriOSApp.html).

Appium will attempt to install your app using Fruitstrap, but it is often easier
to pre-install your app using Xcode to ensure there are no problems.

### Running your tests with Appium

Once your device and app are configured, you can run tests on that device by
passing the `-U` or `--udid` flag to the server or the `udid` desired capability,
and the bundle ID (if the app is installed on the device) or the path to the
`.ipa` or `.apk` file via the `--app` flag or the `app` desired capability.

### Server Arguments

For example, if you are prelaunching your app and wish for Appium to force use
a specific UDID, then you may use the below command:

```
appium -U <udid> --app <path or bundle>
```

This will start Appium and have Appium use the device to test the app.

Refer to the [Appium server arguments](server-args.md) page for more detail on
the arguments that you can use.

### Desired Capabilities

You can launch the app on a device by including the following desired
capabilities in your tests:

* `app`
* `udid`

Refer to the [Appium server capabilities](caps.md) page for more detail on
the capabilities that you can use.

### Troubleshooting ideas

0. Make sure UDID is correct by checking it in Xcode Organizer or iTunes. It
   is a long string (20+ chars).
0. Make sure that you can run your tests against the Simulator.
0. Double check that you can invoke your automation from Instruments.
0. Make sure Instruments in closed already.

### Appium on real Android devices

Hooray! There's nothing extra to know about testing real Android devices: it
works exactly the same as testing on emulators. Make sure that your device
can connect to ADB and has Developer Mode enabled.
