# Running Tests

## Preparing your app for test (iOS)

Test apps run on the simulator have to be compiled specifically for the
simulator, for example by executing the following command in the Xcode project:

    > xcodebuild -sdk iphonesimulator6.0

This creates a `build/Release-iphonesimulator` directory in your Xcode project
that contains the `.app` package that you'll need to communicate with the
Appium server.

If you want, you can zip up the .app directory into a .zip file! Appium will
unpack it for you. Nice if you're not using Appium locally.

## Preparing your app for test (Android)

Nothing in particular needs to be done to run your .apk using Appium. If you
want to zip it up, you can.

## Running your test app with Appium (iOS)

The best way to see what to do currently is to look at the example tests:

[Node.js](/sample-code/examples/node) | [Python](/sample-code/examples/python) | [PHP](/sample-code/examples/php) | [Ruby](/sample-code/examples/ruby) | [Java](/sample-code/examples/java)

Basically, first make sure Appium is running:

    node .

Then script your WebDriver test, sending in the following desired capabilities:

```js
{
    platformName: 'iOS',
    platformVersion: '7.1',
    deviceName: 'iPhone Simulator',
    app: myApp
}
```

```python
{
    'platformName': 'iOS',
    'platformVersion': '7.1',
    'deviceName': 'iPhone Simulator',
    'app': myApp
}
```

```php
public static $browsers = array(
    array(
        'desiredCapabilities' => array(
            'platformName' => 'iOS',
            'platformVersion' => '7.1',
            'deviceName' => 'iPhone Simulator',
            'app' => $myApp
        )
    )
);
```

```java
DesiredCapabilities capabilities = new DesiredCapabilities();
capabilities.setCapability("platformName", "iOS");
capabilities.setCapability("platformVersion", "7.1");
capabilities.setCapability("deviceName", "iPhone Simulator");
capabilities.setCapability("app", myApp);
```

In this set of capabilities, `myApp` must be either:

* A local absolute path to your simulator-compiled .app directory or .zip
* A url of a zip file containg your .app package

Using your WebDriver library of choice, set the remote session to use these
capabilities and connect to the server running at port 4723 of localhost (or
whatever host and port you specified when you started Appium). You should be
all set now!

## Running your test app with Appium (Android)

First, make sure you have one and only one Android emulator or device
connected. If you run `adb devices`, for example, you should see one device
connected. This is the device Appium will use for tests. Of course, to have
a device connected, you'll need to have made an Android AVD (see system
setup ([Windows](running-on-windows.md),
[Mac](running-on-osx.md),
or [Linux](running-on-linux.md))
for more information). If the Android SDK tools are on your path, you can
simply run:

    emulator -avd <MyAvdName>

And wait for the android emulator to finish launching. Sometimes, for various
reasons, `adb` gets stuck. If it's not showing any connected devices or
otherwise failing, you can restart it by running:

    adb kill-server && adb devices

Now, make sure Appium is running:

    node .

Then script your WebDriver test, sending in the following desired capabilities:

```js
{
    platformName: 'Android',
    platformVersion: '4.4',
    deviceName: 'Android Emulator',
    app: myApp
}
```

```python
{
    'platformName': 'Android',
    'platformVersion': '4.4',
    'deviceName': 'Android Emulator',
    'app': myApp
}
```

```php
public static $browsers = array(
    array(
        'desiredCapabilities' => array(
            'platformName' => 'Android',
            'platformVersion' => '4.4',
            'deviceName' => 'Android Emulator',
            'app' => $myApp
        )
    )
);
```

```java
DesiredCapabilities capabilities = new DesiredCapabilities();
capabilities.setCapability("platformName", "Android");
capabilities.setCapability("platformVersion", "4.4");
capabilities.setCapability("deviceName", "Android Emulator");
capabilities.setCapability("app", myApp);
```

In this set of capabilities, `myApp` must be either:

* A local absolute path to your .apk or a .zip of it
* A url of a zip file containg your .apk

Using your WebDriver library of choice, set the remote session to use these
capabilities and connect to the server running at port 4723 of localhost (or
whatever host and port you specified when you started Appium). You should be
all set now!

## Running your test app with Appium (Android devices &lt; 4.2, and hybrid tests)

Android devices before version 4.2 (API Level 17) do not have Google's
[UiAutomator framework](http://developer.android.com/tools/help/uiautomator/index.html)
installed. This is what Appium uses to perform the automation behaviors on
the device. For earlier devices or tests of hybrid (webview-based) apps,
Appium comes bundled with another automation backend called [Selendroid]
(http://selendroid.io/).

To use Selendroid, all that is required is to slightly change the set of
desired capabilities mentioned above, by adding the `automationName` capability
and specifying the Selendroid automation backend.

```js
{
    automationName: 'Selendroid',
    platformName: 'Android',
    platformVersion: '2.3',
    deviceName: 'Android Emulator',
    app: myApp
}
```

```python
{
    'automationName': 'Selendroid',
    'platformName': 'Android',
    'platformVersion': '2.3',
    'deviceName': 'Android Emulator',
    'app': myApp
}
```

```php
public static $browsers = array(
    array(
        'desiredCapabilities' => array(
            'automationName' => 'Selendroid',
            'platformName' => 'Android',
            'platformVersion' => '2.3',
            'deviceName' => 'Android Emulator',
            'app' => $myApp
        )
    )
);
```

```java
DesiredCapabilities capabilities = new DesiredCapabilities();
capabilities.setCapability("automationName", "Selendroid");
capabilities.setCapability("platformName", "Android");
capabilities.setCapability("platformVersion", "2.3");
capabilities.setCapability("deviceName", "Android Emulator");
capabilities.setCapability("app", myApp);
```

Now Appium will start up a Selendroid test session instead of the default test
session. One of the downsides to using Selendroid is that its API differs
sometimes significantly with Appium's. Therefore we recommend you thoroughly
read [Selendroid's documentation](http://selendroid.io/native.html) before
writing your scripts for older devices or hybrid apps.
