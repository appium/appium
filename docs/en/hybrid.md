# Automating hybrid apps

One of the core principles of Appium is that you shouldn't have to change
your app to test it. In line with that methodology, it is possible to test
hybrid web apps (e.g., the "UIWebView" elements in an iOS app) the same* way
you can with Selenium for web apps. There is a bit of technical complexity
required so that Appium knows whether you want to automate the native aspects
of the app or the web views, but thankfully, we can stay within the
WebDriver protocol for everything.

## Automating hybrid iOS apps

Here are the steps required to talk to a web view in your Appium test:

1.  Navigate to a portion of your app where a web view is active
1.  Call [GET session/:sessionId/contexts](https://code.google.com/p/selenium/source/browse/spec-draft.md?repo=mobile)
1.  This returns a list of contexts we can access, like 'NATIVE_APP' or 'WEBVIEW_1'
1.  Call [POST session/:sessionId/context](https://code.google.com/p/selenium/source/browse/spec-draft.md?repo=mobile)
    with the id of the context you want to access
1.  (This puts your Appium session into a mode where all commands are
    interpreted as being intended for automating the web view,
    rather than the native portion of the app. For example,
    if you run getElementByTagName, it will operate on the DOM of the web
    view, rather than return UIAElements. Of course,
    certain WebDriver methods only make sense in one context or another,
    so in the wrong context you will receive an error message).
1.  To stop automating in the web view context and go back to automating the
    native portion of the app, simply call `context` again with the native
    context id to leave the web frame.

## Execution against a real iOS device

To interact with a web view appium establishes a connection
using a remote debugger. When executing the examples below against a
simulator this connection can be established directly as the simulator and
the appium server are on the same machine. When executing against a real
device appium is unable to access the web view directly. Therefore the
connection has to be established through the USB lead. To establish this
connection we use the [ios-webkit-debugger-proxy](https://github.com/google/ios-webkit-debug-proxy).

To install the latest tagged version of the ios-webkit-debug-proxy using
brew, run the following commands in the terminal:

``` bash
# The first command is only required if you don't have brew installed.
> ruby -e "$(curl -fsSL https://raw.github.com/mxcl/homebrew/go/install)"
> brew update
> brew install ios-webkit-debug-proxy
```

You can also install the latest proxy by cloning it from git and installing
it yourself:

``` bash
# Please be aware that this will install the proxy with the latest code (and not a tagged version).
> git clone https://github.com/google/ios-webkit-debug-proxy.git
> cd ios-webkit-debug-proxy
> ./autogen.sh
> ./configure
> make
> sudo make install
```

Once installed you can start the proxy with the following command:

``` bash
# Change the udid to be the udid of the attached device and make sure to set the port to 27753
# as that is the port the remote-debugger uses.
> ios_webkit_debug_proxy -c 0e4b2f612b65e98c1d07d22ee08678130d345429:27753 -d
```

**NOTE:** the proxy requires the **"web inspector"** to be turned on to
allow a connection to be established. Turn it on by going to **settings >
safari > advanced**. Please be aware that the web inspector was **added as
part of iOS 6** and was not available previously.

* We're working on filling out the methods available in web view contexts. [Join us in our quest!](http://appium.io/get-involved.html)

```javascript
// javascript
// assuming we have an initialized `driver` object working on the UICatalog app
return driver
  .elementByName('Web, Use of UIWebView') // find button to nav to view
    .click() // nav to UIWebView
  .contexts().then(function (contexts) { // get list of available views
    return driver.context(contexts[1]); // choose what is probably the webview context
  }).elementsByCss('.some-class').then(function (els) { // get webpage elements by css
    els.length.should.be.above(0); // there should be some!
    return els[0];
  }).text() // get text of the first element
    .should.become("My very own text") // it should be extremely personal and awesome
  .context('NATIVE_APP') // leave webview context
  // do more native stuff here if we want
  .quit() // stop webdrivage
  .done(); // end promise chain (may not be needed)
```

```java
// java
DesiredCapabilities capabilities = new DesiredCapabilities();
capabilities.setCapability(CapabilityType.BROWSER_NAME, "");
capabilities.setCapability("platformVersion", "7.1");
capabilities.setCapability("platformName", "iOS");
capabilities.setCapability("deviceName", "iPhone Simulator");
capabilities.SetCapability("app", app);

driver = new AppiumDriver(new URL("http://127.0.0.1:4723/wd/hub"), capabilities);

WebElement button = driver.findElement(By.id("buttonStartWebview"));
button.click();
Thread.sleep(6000);
Set<String> contextNames = driver.getContextHandles();
for (String contextName : contextNames) {
  System.out.println(contextName);
  if (contextName.contains("WEBVIEW")){
    driver.context(contextName);
  }
}
WebElement inputField = driver.findElement(By.id("name_input"));
inputField.sendKeys("Some name");
```

```ruby
# ruby
TEST_NAME = "Example Ruby Test"
SERVER_URL = "http://127.0.0.1:4723/wd/hub"
APP_PATH = "https://dl.dropboxusercontent.com/s/123456789101112/ts_ios.zip"
capabilities =
    {
      'browserName' => 'iOS 6.0',
      'platform' => 'Mac 10.8',
      'device' => 'iPhone Simulator',
      'app' => APP_PATH,
      'name' => TEST_NAME
    }
@driver = Selenium::WebDriver.for(:remote, :desired_capabilities => capabilities, :url => SERVER_URL)

# I switch to the last window because its always the webview in our case, in other cases you may need to specify a window number
# View the appium logs while running @driver.window_handles to figure out which window is the one you want and find the associated number
# Then switch to it using @driver.switch_to_window("6")

Given(/^I switch to webview$/) do
  webview = @driver.contexts.last
  @driver.switch_to.context(webview)
end

Given(/^I switch out of webview$/) do
  @driver.switch_to(@driver.contexts.first)
end

# Now you can use CSS to select an element inside your webview

And(/^I click a webview button $/) do
  @driver.find_element(:css, ".green_button").click
end
```

```python
# python
APP_PATH = "https://dl.dropboxusercontent.com/s/123456789101112/ts_ios.zip"
capabilities = {
    'browserName': 'iOS 6.0',
    'platform': 'Mac 10.8',
    'device': 'iPhone Simulator',
    'app': APP_PATH,
    'name': "Example Python Test"
}
driver = webdriver.Remote('http://localhost:4723/wd/hub', capabilities)

# switch to webview
webview = driver.contexts.last
driver.switch_to.context(webview)

# do some webby stuff
driver.find_element(:css, ".green_button").click

# switch back to native view
driver.switch_to(driver.contexts.first)

# Now you can use CSS to select an element inside your webview
```

```php
// php
APP_PATH = 'https://dl.dropboxusercontent.com/s/123456789101112/ts_ios.zip'
class ContextTests extends PHPUnit_Extensions_AppiumTestCase
{
    public static $browsers = array(
        array(
            'desiredCapabilities' => array(
                'platformName' => 'iOS',
                'platformVersion' => '7.1',
                'deviceName' => 'iPhone Simulator',
                'app' => $myApp,
                'name' => 'Example Hybrid PHP Test'
            )
        )
    );

    public function testThings()
    {
        $expected_contexts = array(
            0 => 'NATIVE_APP',
            1 => 'WEBVIEW_1'
        );

        $contexts = $this->contexts();
        $this->assertEquals($expected_contexts, $contexts);

        $this->context('WEBVIEW_1');
        $context = $this->context();
        $this->assertEquals('WEBVIEW_1', $context);

        // do webby stuff

        $this->context('NATIVE_APP');

        // do mobile stuff
    }
}
```

## Automating hybrid Android apps

Appium comes with built-in hybrid support via Chromedriver. Appium also uses
Selendroid under the hood for webview support on devices older than 4.4. (In
that case, you'll want to specify `"automationName": "selendroid"` as a desired
capability). Then follow all the same steps as above for iOS, i.e.,
switching contexts, etc...

Make sure
[setWebContentsDebuggingEnabled](http://developer.android.com/reference/android/webkit/WebView.html#setWebContentsDebuggingEnabled(boolean)) is set to true as described in the [remote debugging docs](https://developer.chrome.com/devtools/docs/remote-debugging#configure-webview).

```javascript
// javascript
// assuming we have an initialized `driver` object working on a hybrid app
return driver
  .context("WEBVIEW") // choose the only available view
  .elementsByCss('.some-class').then(function (els) { // get webpage elements by css
    els.length.should.be.above(0); // there should be some!
    return els[0];
  }).text() // get text of the first element
    .should.become("My very own text") // it should be extremely personal and awesome
  .context("NATIVE_APP") // leave webview context
  // do more native stuff here if we want
  .quit() // stop webdrivage
  .done(); // end promise chain (may not be needed)
```

```java
// java
DesiredCapabilities capabilities = new DesiredCapabilities();
capabilities.setCapability(CapabilityType.BROWSER_NAME, "");
capabilities.setCapability("automationName","Selendroid");
capabilities.setCapability("platformName", "Android");
capabilities.setCapability("app", myApp);
driver = new AppiumDriver(new URL("http://127.0.0.1:4723/wd/hub"), capabilities);

WebElement button = driver.findElement(By.id("buttonStartWebview"));
button.click();
Thread.sleep(6000);
Set<String> contextNames = driver.getContextHandles();
for (String contextName : contextNames) {
  System.out.println(contextName);
  if (contextName.contains("WEBVIEW")){
    driver.context(contextName);
  }
}
WebElement inputField = driver.findElement(By.id("name_input"));
inputField.sendKeys("Some name");
```

```python
# python
# assuming we have an initialized `driver` object working on a hybrid app
driver.switch_to.context("WEBVIEW")
elements = driver.find_elements_by_css_selector('.some-class')
assertLess(0, len(elements))
assertEqual('My very own text', elements[0].text)

driver.switch_to.context("NATIVE_APP")
driver.quit()
```
