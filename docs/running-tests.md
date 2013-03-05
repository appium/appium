Running Tests
=============

<a name="prep-ios"></a>Preparing your app for test (iOS)
-----
Test apps run on the simulator have to be compiled specifically for the
simulator, for example by executing the following command in the Xcode project:

    > xcodebuild -sdk iphonesimulator6.0

This creates a `build/Release-iphonesimulator` directory in your Xcode project
that contains the `.app` package that you'll need to communicate with the
Appium server.

<a name="prep-android"></a>Preparing your app for test (Android)
------

<a name="run-ios"></a>Running your test app with Appium (iOS)
------

<a name="run-android"></a>Running your test app with Appium (Android)
-----
