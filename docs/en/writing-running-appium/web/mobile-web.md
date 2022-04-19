## Automating mobile web apps

If you're interested in automating your web app in Mobile Safari on iOS or
Chrome on Android, Appium can help you. Basically, you write a normal WebDriver
test, and use Appium as the Selenium server with a special set of desired
capabilities.


### iOS mobile web automation

Appium can automate the Safari browser on real and simulated iOS devices. It is
accessed by setting the `browserName` [desired capabilty](/docs/en/writing-running-appium/caps.md)
to `"Safari"` while leaving the `app` capability empty.

You **must** run Safari on the device before attempting to use Appium, in order
for the correct preferences to have been set.

Then, use desired capabilities like these to run your test in mobile Safari:

```javascript
// javascript
{
  platformName: 'iOS'
  , platformVersion: '13.2'
  , automationName: 'XCUITest'
  , browserName: 'Safari'
  , deviceName: 'iPhone 11'
}
```

```python
# python
{
  'platformName': 'iOS',
  'platformVersion': '13.2',
  'automationName': 'XCUITest',
  'browserName': 'Safari',
  'deviceName': 'iPhone 11'
}
```

```java
// java
DesiredCapabilities capabilities = new DesiredCapabilities();
capabilities.setCapability(MobileCapabilityType.PLATFORM_NAME, "iOS");
capabilities.setCapability(MobileCapabilityType.PLATFORM_VERSION, "13.2");
capabilities.setCapability(MobileCapabilityType.AUTOMATION_NAME, "XCUITest");
capabilities.setCapability(MobileCapabilityType.BROWSER_NAME, "Safari");
capabilities.setCapability(MobileCapabilityType.DEVICE_NAME, "iPhone 11");
```

```ruby
{
  platformName: 'iOS',
  platformVersion: '13.2',
  automationName: 'XCUITest',
  deviceName: 'iPhone 11',
  browserName: 'Safari'
}
```

### Mobile Safari on Simulator

First of all, make sure developer mode is turned on in your Safari
preferences so that the remote debugger port is open.


### Mobile Safari on a Real iOS Device

#### For `XCUITest`

We use [appium-ios-device](https://github.com/appium/appium-ios-device) to handle Safari since Appium 1.15.
You no longer need to install additional dependencies.

#### Setup for an iOS real device

Before you can run your tests against Safari on a real device you will need to:

* `XCUITest`
    * Turn on **web inspector** on iOS device (**settings > safari > advanced**)

### Running your test

To configure you test to run against safari simply set the `"browserName"` to be
`"Safari"`.


```java
// java
//setup the web driver and launch the webview app.
DesiredCapabilities desiredCapabilities = new DesiredCapabilities();
desiredCapabilities.setCapability(MobileCapabilityType.BROWSER_NAME, "Safari");
desiredCapabilities.setCapability(MobileCapabilityType.AUTOMATION_NAME, "XCUITest");
URL url = new URL("http://127.0.0.1:4723/wd/hub");
AppiumDriver driver = new AppiumDriver(url, desiredCapabilities);

// Navigate to the page and interact with the elements on the guinea-pig page using id.
driver.get("http://saucelabs.com/test/guinea-pig");
WebElement div = driver.findElement(By.id("i_am_an_id"));
Assert.assertEquals("I am a div", div.getText()); //check the text retrieved matches expected value
driver.findElement(By.id("comments")).sendKeys("My comment"); //populate the comments field by id.

//close the app.
driver.quit();
```

```python
# python
# setup the web driver and launch the webview app.
capabilities = { 'browserName': 'Safari', 'automationName': 'XCUITest' }
driver = webdriver.Remote('http://localhost:4723/wd/hub', capabilities)

# Navigate to the page and interact with the elements on the guinea-pig page using id.
driver.get('http://saucelabs.com/test/guinea-pig');
div = driver.find_element_by_id('i_am_an_id')
# check the text retrieved matches expected value
assertEqual('I am a div', div.text)

# populate the comments field by id
driver.find_element_by_id('comments').send_keys('My comment')

# close the driver
driver.quit()
```

### Android mobile web automation

Appium supports automating the Chrome browser both real and emulated Android
devices.

Pre-requisites:

* Make sure Chrome is installed on your device or emulator.
* Chromedriver needs to be installed (a default version comes with Appium) and
  configured for automating the specific version of Chrome available on the
  device. See [here](/docs/en/writing-running-appium/web/chromedriver.md) for more
  information and details about compatibility.

Then, use [desired capabilties](/docs/en/writing-running-appium/caps.md) like
these to run your test in Chrome:

```javascript
// javascript
{
  platformName: 'Android'
  , platformVersion: '9.0'
  , deviceName: 'Android Emulator'
  , automationName: 'UIAutomator2'
  , browserName: 'Chrome'
};
```

```python
# python
{
  'platformName': 'Android',
  'platformVersion': '9.0',
  'deviceName': 'Android Emulator',
  'automationName': 'UIAutomator2',
  'browserName': 'Chrome'
}
```

```java
// java
DesiredCapabilities capabilities = new DesiredCapabilities();
capabilities.setCapability(MobileCapabilityType.PLATFORM_NAME, "Android");
capabilities.setCapability(MobileCapabilityType.PLATFORM_VERSION, "9.0");
capabilities.setCapability(MobileCapabilityType.DEVICE_NAME, "Android Emulator");
capabilities.setCapability(MobileCapabilityType.AUTOMATION_NAME, "UIAutomator2");
capabilities.setCapability(MobileCapabilityType.BROWSER_NAME, "Chrome");
```

```ruby
{
  platformName: 'Android',
  platformVersion: '9.0',
  deviceName: 'Android Emulator',
  automationName: 'UIAutomator2',
  browserName: 'Chrome'
}
```

Note that on 4.4+ devices, you can also use the 'Browser' `browserName` cap to
automate the built-in browser. On all devices you can use the 'Chromium'
`browserName` cap to automate a build of Chromium which you have installed.


#### Troubleshooting Chromedriver

If your test target requires newer Chromedriver version,
[chromedriver_autodownload](/docs/en/writing-running-appium/web/chromedriver.md#automatic-discovery-of-compatible-chromedriver) feature will help.
It has been available since Appium 1.15.0 with the security option.
Read the linked documentation to learn how to use it.
`chromedriverExecutableDir` capability also helps when you need
a specific Chromedriver version.

As of Chrome version 33, a rooted device is no longer required. If running tests
on older versions of Chrome, devices needed to be rooted as Chromedriver
required write access to the `/data/local` directory to set Chrome's command
line arguments.

If testing on Chrome app prior to version 33, ensure `adb shell` has read/write
access to `/data/local` directory on the device:

```center
$ adb shell su -c chmod 777 /data/local
```

There is a desired capability `showChromedriverLog` which, when set to `true`,
writes the Chromedriver logs inline with the Appium logs. This can be helpful
for debugging.

For more Chromedriver specific documentation see [ChromeDriver documentation](https://sites.google.com/a/chromium.org/chromedriver/getting-started/getting-started---android).
