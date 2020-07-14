## Automating mobile web apps

If you're interested in automating your web app in Mobile Safari on iOS or
Chrome on Android, Appium can help you. Basically, you write a normal WebDriver
test, and use Appium as the Selenium server with a special set of desired
capabilities.

### Mobile Safari on Simulator

First of all, make sure developer mode is turned on in your Safari
preferences so that the remote debugger port is open.

If you are using the simulator or a real device, you MUST run Safari before
attempting to use Appium.

Then, use desired capabilities like these to run your test in mobile Safari:

```javascript
// javascript
{
  platformName: 'iOS'
  , platformVersion: '7.1'
  , browserName: 'Safari'
  , deviceName: 'iPhone Simulator'
}
```

```python
# python
{
  'platformName': 'iOS',
  'platformVersion': '7.1',
  'browserName': 'Safari',
  'deviceName': 'iPhone Simulator'
}
```

```php
// php
public static $browsers = array(
    array(
        'desiredCapabilities' => array(
            'platformName' => 'iOS',
            'platformVersion' => '7.1',
            'browserName' => 'Safari',
            'deviceName' => 'iPhone Simulator'
        )
    )
);
```

```java
// java
DesiredCapabilities capabilities = new DesiredCapabilities();
capabilities.setCapability(MobileCapabilityType.PLATFORM_NAME, "iOS");
capabilities.setCapability(MobileCapabilityType.PLATFORM_VERSION, "7.1");
capabilities.setCapability(MobileCapabilityType.BROWSER_NAME, "Safari");
capabilities.setCapability(MobileCapabilityType.DEVICE_NAME, "iPhone Simulator");
```

### Mobile Safari on a Real iOS Device

For iOS 9.3 and below (pre-XCUITest), we use the [SafariLauncher
App](https://github.com/snevesbarros/SafariLauncher) app to launch Safari and
run tests against mobile Safari. This is because Safari is an app that is owned
by Apple, and Instruments cannot launch it on real devices. Once Safari has
been launched by SafariLauncher, the Remote Debugger automatically connects
using the
[ios-webkit-debug-proxy](https://github.com/google/ios-webkit-debug-proxy).
When working with `ios-webkit-debug-proxy`, you have to trust the machine before
you can can run tests against your iOS device.

For instruction on how to install and run ios-webkit-debugger-proxy see
[iOS WebKit debug proxy](/docs/en/advanced-concepts/ios-webkit-debug-proxy.md) documentation.

### Setup

Before you can run your tests against Safari on a real device you will need to:

* Have the **ios-webkit-debug-proxy** installed, running and listening on port 27753 (see the
[hybrid docs](/docs/en/advanced-concepts/hybrid.md#execution-against-a-real-ios-device) for instructions)
* Turn on **web inspector** on iOS device (**settings > safari > advanced**)
* Make sure that `SafariLauncher` will work (see the [SafariLauncher docs](safari-launcher.md) for instructions)

### Running your test

To configure you test to run against safari simply set the **"browserName"** to be **"Safari"**.

### Java Example

```java
// java
//setup the web driver and launch the webview app.
DesiredCapabilities desiredCapabilities = new DesiredCapabilities();
desiredCapabilities.setCapability(MobileCapabilityType.BROWSER_NAME, "Safari");
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

### Python Example

```python
# python
# setup the web driver and launch the webview app.
capabilities = { 'browserName': 'Safari' }
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

```php
// php
class ContextTests extends PHPUnit_Extensions_AppiumTestCase
{
    public static $browsers = array(
        array(
            'desiredCapabilities' => array(
                'platformName' => 'iOS',
                'platformVersion' => '7.1',
                'browserName' => 'Safari',
                'deviceName' => 'iPhone Simulator'
            )
        )
    );

    public function testThings()
    {
        $this->get('http://saucelabs.com/test/guinea-pig');

        $div = $this->byId('i_am_an_id');
        $this->assertEquals('I am a div', $div->text());

        $this->byId('comments')->sendKeys('My comment');
    }
}
```

### Mobile Chrome on Emulator or Real Device

Pre-requisites:

*  Make sure Chrome (an app with the package `com.android.chrome`) is installed on your device or emulator. Getting Chrome for the x86 version of the emulator is not currently possible without building Chromium, so you may want to run an ARM emulator and then copy a Chrome APK from a real device to get Chrome on an emulator.
*  Chromedriver needs to be installed and configured for automating the specific version of Chrome available on the device. See [here](/docs/en/advanced-concepts/chromedriver.md) for more information and details.

Then, use desired capabilities like these to run your test in Chrome:

```javascript
// javascript
{
  platformName: 'Android'
  , platformVersion: '4.4'
  , deviceName: 'Android Emulator'
  , browserName: 'Chrome'
};
```

```python
# python
{
  'platformName': 'Android',
  'platformVersion': '4.4',
  'deviceName': 'Android Emulator',
  'browserName': 'Chrome'
}
```

```php
// php
public static $browsers = array(
    array(
        'desiredCapabilities' => array(
            'platformName' => 'Android',
            'platformVersion' => '4.4',
            'browserName' => 'Chrome',
            'deviceName' => 'Android Emulator'
        )
    )
);
```

```java
// java
DesiredCapabilities capabilities = new DesiredCapabilities();
capabilities.setCapability(MobileCapabilityType.PLATFORM_NAME, "Android");
capabilities.setCapability(MobileCapabilityType.PLATFORM_VERSION, "4.4");
capabilities.setCapability(MobileCapabilityType.DEVICE_NAME, "Android Emulator");
capabilities.setCapability(MobileCapabilityType.BROWSER_NAME, "Chrome");
```

Note that on 4.4+ devices, you can also use the 'Browser' `browserName` cap to automate the built-in browser. On all devices you can use the 'Chromium' `browserName` cap to automate a build of Chromium.

#### Troubleshooting chromedriver

As of Chrome version 33, a rooted device is no longer required. If running tests on older versions of Chrome, devices needed to be rooted as ChromeDriver required write access to the /data/local directory
to set Chrome's command line arguments.

If testing on Chrome app prior to version 33, ensure adb shell has read/write access to /data/local directory on the device:

```center
$ adb shell su -c chmod 777 /data/local
```

For more chromedriver specific documentation see [ChromeDriver documentation](https://sites.google.com/a/chromium.org/chromedriver/getting-started/getting-started---android).
