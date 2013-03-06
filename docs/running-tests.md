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

If you want, you can zip up the .app directory into a .zip file! Appium will
unpack it for you. Nice if you're not using Appium locally.

<a name="prep-android"></a>Preparing your app for test (Android)
------
Nothing in particular needs to be done to run your .apk using Appium. If you
want to zip it up, you can.

<a name="run-ios"></a>Running your test app with Appium (iOS)
------
The best way to see what to do currently is to look at the example tests:

[Node.js](https://github.com/appium/appium/tree/master/sample-code/examples/node) | [Python](https://github.com/appium/appium/tree/master/sample-code/examples/python) | [PHP](https://github.com/appium/appium/tree/master/sample-code/examples/php) | [Ruby](https://github.com/appium/appium/tree/master/sample-code/examples/ruby) | [Java](https://github.com/appium/appium/tree/master/sample-code/examples/java)

Basically, first make sure Appium is running:

    node server.js -V

Then script your WebDriver test, sending in the following desired capabilities:

```json
{
    'device': 'iPhone Simulator',
    'browserName': '',
    'platform': 'MAC',
    'version': '6.1',
    'app': myApp
}
```

In this set of capabilities, `myApp` must be either:

* A local absolute path to your simulator-compiled .app directory or .zip
* A url of a zip file containg your .app package

Using your WebDriver library of choice, set the remote session to use these
capabilities and connect to the server running at port 4723 of localhost (or
whatever host and port you specified when you started Appium). You should be
all set now!

<a name="run-android"></a>Running your test app with Appium (Android)
-----
First, make sure you have one and only one Android emulator or device
connected. If you run `adb devices`, for example, you should see one device
connected. This is the device Appium will use for tests. Of course, to have
a device connected, you'll need to have made an Android AVD (see [system
setup](https://github.com/appium/appium/blob/master/docs/system-setup.md#android)
for more information). If the Android SDK tools are on your path, you can
simply run:

    emulator -avd <MyAvdName>

And wait for the android emulator to finish launching. Sometimes, for various
reasons, `adb` gets stuck. If it's not showing any connected devices or
otherwise failing, you can restart it by running:

    adb kill-server
    adb devices

Now, make sure Appium is running:

    node server.js -V

Then script your WebDriver test, sending in the following desired capabilities:

```json
{
    'device': 'Android',
    'browserName': '',
    'platform': 'MAC',
    'version': '4.2',
    'app': myApp,
    'app-package': myAppPackage,
    'app-activity': myAppActivity
}
```

In this set of capabilities, `myApp` must be either:

* A local absolute path to your .apk or a .zip of it
* A url of a zip file containg your .apk

`myAppPackage` must be the java package of your application, e.g.,
`com.example.android.myApp`.

`myAppActivity` must be the Android activity you want to launch for the test,
e.g., `MainActivity`.

Using your WebDriver library of choice, set the remote session to use these
capabilities and connect to the server running at port 4723 of localhost (or
whatever host and port you specified when you started Appium). You should be
all set now!
