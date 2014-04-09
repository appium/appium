---
title: Appium on real devices
layout: default
---

Appium on real iOS devices
======================
Appium has support for real device testing.

To get started on a real device, you will need the following:

1. An Apple Developer ID and a valid Developer Account with a configured distribution certificate and provisioning profile.
2. An iPad or iPhone.
3. The source code of your app.
4. A Mac with XCode and the XCode Command Line Developer Tools

Provisioning Profile
---

A valid iOS Development Distribution Certificate and Provisioning Profile are necessary to test on a real device. You can find information about configuring these in the [Apple documentation](http://developer.apple.com/library/ios/#documentation/ToolsLanguages/Conceptual/YourFirstAppStoreSubmission/TestYourApponManyDevicesandiOSVersions/TestYourApponManyDevicesandiOSVersions.html)

You will also need to [sign your app](http://developer.apple.com/library/ios/#documentation/ToolsLanguages/Conceptual/YourFirstAppStoreSubmission/ProvisionYourDevicesforDevelopment/ProvisionYourDevicesforDevelopment.html#//apple_ref/doc/uid/TP40011375-CH4-SW1).

Appium will attempt to install your app using Fruitstrap, but it is often easier to pre-install your app using Xcode to ensure there are no problems.

Running your tests with Appium
---

Once your device and app are configured, you can run tests on that device by passing the -U flag to the server, and passing the bundle ID (if the app is installed on the device) or the path to the .ipa file via the `--app` flag or the `app` desired capability:

```
node . -U <UDID> --app <bundle_id>
```

This will start Appium and have Appium use the device to test the app.

Troubleshooting ideas
---

0. Make sure UDID is correct by checking it in xcode organizer or itunes. It is a long string (20+ chars)
0. Make sure that you can run your tests against simulator
0. Double check that you can invoke your automation from instruments.
0. Make sure instruments in closed already

Appium on real Android devices
==============================

Hooray! There's nothing extra to know about testing real Android devices: it works exactly the same as testing on emulators. Make sure that your device can connect to ADB and has Developer Mode enabled.
