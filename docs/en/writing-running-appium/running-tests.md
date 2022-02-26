## Running Tests

### Preparing your app for test (iOS)

Test apps run on the simulator have to be compiled specifically for the
simulator, for example by executing the following command in the Xcode project (you can use `xcodebuild -showsdks` to see the list of available SDKs):

    > xcodebuild -sdk iphonesimulator6.0

This creates a `build/Release-iphonesimulator` directory in your Xcode project
that contains the `.app` package that you'll need to communicate with the
Appium server.

If you want, you can zip up the .app directory into a .zip file! Appium will
unpack it for you. Nice if you're not using Appium locally.

### Preparing your app for test (Android)

Nothing in particular needs to be done to run your .apk using Appium. If you
want to zip it up, you can.

### Preparing your app for test (Windows)

Nothing in particular needs to be done to run your test.

### Running your test app with Appium (iOS)

The best way to see what to do currently is to look at the example tests:

[Node.js](https://github.com/appium/appium/tree/master/sample-code/javascript-webdriverio) | [Python](https://github.com/appium/appium/tree/master/sample-code/python) | [Ruby](https://github.com/appium/appium/tree/master/sample-code/ruby) | [Java](https://github.com/appium/appium/tree/master/sample-code/java)

Basically, first make sure Appium is running:

    node .

Then script your WebDriver test, sending in the following desired capabilities:

```javascript
// javascript
{
    platformName: 'iOS',
    platformVersion: '7.1',
    deviceName: 'iPhone Simulator',
    app: myApp
}
```

```python
# python
{
    'platformName': 'iOS',
    'platformVersion': '7.1',
    'deviceName': 'iPhone Simulator',
    'app': myApp
}
```

```java
// java
DesiredCapabilities capabilities = new DesiredCapabilities();
capabilities.setCapability(MobileCapabilityType.PLATFORM_NAME, "iOS");
capabilities.setCapability(MobileCapabilityType.PLATFORM_VERSION, "7.1");
capabilities.setCapability(MobileCapabilityType.DEVICE_NAME, "iPhone Simulator");
capabilities.setCapability(MobileCapabilityType.APP, myApp);
```

In this set of capabilities, `myApp` must be either:

* A local absolute path to your simulator-compiled .app directory or .zip
* A url of a zip file containing your .app package
* A path to one of the sample app relative to the appium install root

Using your WebDriver library of choice, set the remote session to use these
capabilities and connect to the server running at port 4723 of localhost (or
whatever host and port you specified when you started Appium). You should be
all set now!

### Running your test app with Appium (Android)

First, make sure you have one and only one Android emulator or device
connected. If you run `adb devices`, for example, you should see one device
connected. This is the device Appium will use for tests. Of course, to have
a device connected, you'll need to have made an Android AVD. If the Android SDK
tools are on your path, you can simply run:

    emulator -avd <MyAvdName>

And wait for the android emulator to finish launching. Sometimes, for various
reasons, `adb` gets stuck. If it's not showing any connected devices or
otherwise failing, you can restart it by running:

    adb kill-server && adb devices

Now, make sure Appium is running:

    node .

There are several ways to start an Appium application (it works exactly
the same as when the application is started via adb):

- apk or zip only, the default activity will be launched ('app' capability)
- apk + activity ('app' + 'appActivity' capabilities)
- apk + activity + intent ('app' + 'appActivity' + 'appIntent' capabilities)
- ...

Activities may be specified in the following way:

- absolute (e.g. appActivity: 'com.helloworld.SayHello').
- relative to appPackage (e.g. appPackage: 'com.helloworld', appActivity='.SayHello')

If the 'appWaitPackage' and 'appWaitActivity' caps are specified, Appium
automatically spins until those activities are launched. You may specify
multiple wait activities for instance:

- appActivity: 'com.splash.SplashScreen'
- appPackage: 'com.splash' appActivity: '.SplashScreen'
- appPackage: 'com.splash' appActivity: '.SplashScreen,.LandingPage,com.why.GoThere'

If you are not sure what activity are configured in your apk, you can
proceed in one of the following ways:

- Mac/Linux: 'adb shell dumpsys window windows | grep mFocusedApp'
- In the Ruby console: 'adb shell dumpsys window windows\`.each_line.grep(/mFocusedApp/).first.strip'
- In Windows terminal run 'adb shell dumpsys window windows' and manually look for the mFocusedApp line.

Then script your WebDriver test, sending in the following desired capabilities:

```javascript
// javascript
{
    platformName: 'Android',
    platformVersion: '4.4',
    deviceName: 'Android Emulator',
    app: myApp
}
```

```python
# python
{
    'platformName': 'Android',
    'platformVersion': '4.4',
    'deviceName': 'Android Emulator',
    'app': myApp
}
```

```java
// java
DesiredCapabilities capabilities = new DesiredCapabilities();
capabilities.setCapability(MobileCapabilityType.PLATFORM_NAME, "Android");
capabilities.setCapability(MobileCapabilityType.PLATFORM_VERSION, "4.4");
capabilities.setCapability(MobileCapabilityType.DEVICE_NAME, "Android Emulator");
capabilities.setCapability(MobileCapabilityType.APP, myApp);
```

In this set of capabilities, `myApp` must be either:

* A local absolute path to your .apk or a .zip of it
* A url of a zip file containing your .apk
* A path to one of the sample app relative to the appium install root

Using your WebDriver library of choice, set the remote session to use these
capabilities and connect to the server running at port 4723 of localhost (or
whatever host and port you specified when you started Appium). You should be
all set now!


### Running your test app with Appium (Windows)

Simply ensure that Appium is listening, and run your test with your test runner of choice.

See our [samples](https://github.com/Microsoft/WinAppDriver/tree/master/Samples) for details.
