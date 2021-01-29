## Automating hybrid apps

One of the core principles of Appium is that you shouldn't have to change your
app to test it. In line with that methodology, it is possible to test hybrid
apps the same way you can with Selenium for web apps. There is a bit of technical
complexity required so that Appium knows whether you want to automate the native
aspects of the app or the web views. But, thankfully, we can stay within the
Selenium WebDriver protocol for everything.

Once the test is in a web view context the command set that is available is the
full [Selenium](http://www.seleniumhq.org/) [WebDriver API](http://www.seleniumhq.org/docs/03_webdriver.jsp).


### Entering the web view context

Here are the steps required to talk to a web view in your Appium test:

1. Navigate to a portion of your app where a web view is active
1. [Retrieve the currently available contexts](/docs/en/commands/context/get-contexts.md)
    * This returns a list of contexts we can access, like `'NATIVE_APP'` or `'WEBVIEW_1'`
1. [Set the context](/docs/en/commands/context/set-context.md) with the id of
  the context you want to access
    * This puts your Appium session into a mode where all commands are
      interpreted as being intended for automating the web view, rather than the
      native portion of the app. For example, if you run `getElementByTagName`, it
      will operate on the DOM of the web view, rather than return native elements.
      Of course, certain WebDriver methods only make sense in one context or
      another, so in the wrong context you will receive an error message.
1. To stop automating in the web view context and go back to automating the
   native portion of the app, simply [set the context](/docs/en/commands/context/set-context.md)
   again with the native context id (generally `'NATIVE_APP'`) to leave the web
   context and once again access the native commands.


### Automatically entering the web view context on session start

If your application begins in a web view, and you do not want to automate the
native application before entering it, you can have Appium automatically enter
the web view context on session initialization by setting the `autoWebview`
[desired capability](/docs/en/writing-running-appium/caps.md) to `true`.


### Examples

```javascript
// javascript
// assuming we have an initialized `driver` object for an app
driver
    .contexts().then(function (contexts) { // get list of available views. Returns array: ["NATIVE_APP","WEBVIEW_1"]
        return driver.context(contexts[1]); // choose the webview context
    })

    // do some web testing
    .elementsByCss('.green_button').click()

    .context('NATIVE_APP') // leave webview context

    // do more native stuff here if we want

    .quit() // stop webdrivage
```

```java
// java
// assuming we have a set of capabilities
driver = new AppiumDriver(new URL("http://127.0.0.1:4723/wd/hub"), capabilities);

Set<String> contextNames = driver.getContextHandles();
for (String contextName : contextNames) {
    System.out.println(contextName); //prints out something like NATIVE_APP \n WEBVIEW_1
}
driver.context(contextNames.toArray()[1]); // set context to WEBVIEW_1

//do some web testing
String myText = driver.findElement(By.cssSelector(".green_button")).click();

driver.context("NATIVE_APP");

// do more native testing if we want

driver.quit();
```

```ruby
# ruby_lib_core
# assuming we have a set of capabilities
@driver = Appium::Core.for(url: SERVER_URL, desired_capabilities: capabilities).start_driver
# ruby_lib
# opts = { caps: capabilities, appium_lib: { custom_url: SERVER_URL }}
# @driver = Appium::Driver.new(opts, true).start_driver

# I switch to the last context because its always the webview in our case, in other cases you may need to specify a context
# View the appium logs while running @driver.contexts to figure out which context is the one you want and find the associated ID
# Then switch to it using @driver.switch_to.context("WEBVIEW_6")

Given(/^I switch to webview$/) do
    webview = @driver.available_contexts.last
    @driver.switch_to.context(webview)
end

Given(/^I switch out of webview$/) do
    @driver.switch_to.context(@driver.contexts.first)
end

# Now you can use CSS to select an element inside your webview

And(/^I click a webview button $/) do
    @driver.find_element(:css, ".green_button").click
end
```

```python
# python
# assuming we have an initialized `driver` object for an app

# switch to webview
webview = driver.contexts.last
driver.switch_to.context(webview)

# do some webby stuff
driver.find_element(By.CSS, ".green_button").click

# switch back to native view
driver.switch_to.context(driver.contexts.first)

# do more native testing if we want

driver.quit()
```

```php
// php
// assuming we have an initialized `driver` object in an AppiumTestCase

public function testThings()
{
        $expected_contexts = array(
                0 => 'NATIVE_APP',
                1 => 'WEBVIEW_1'
        );

        $contexts = $this->contexts();
        $this->assertEquals($expected_contexts, $contexts);

        $this->context($contexts[1]);
        $context = $this->context();
        $this->assertEquals('WEBVIEW_1', $context);

        // do webby stuff

        $this->context('NATIVE_APP');

        // do mobile stuff
}
```



### Automating hybrid Android apps

Appium comes with [built-in hybrid support via Chromedriver](/docs/en/writing-running-appium/web/chromedriver.md),
which allow the automation of any Chrome-backed Android web views.

There is an additional step necessary within your app build, unfortunately. As
described in the Android [remote debugging docs](https://developers.google.com/web/tools/chrome-devtools/remote-debugging/webviews)
it is necessary to set to `true` the [setWebContentsDebuggingEnabled](http://developer.android.com/reference/android/webkit/WebView.html#setWebContentsDebuggingEnabled(boolean))
property on the [android.webkit.WebView](http://developer.android.com/reference/android/webkit/WebView.html)
element.

Once you have set your [desired capabilities](/docs/en/writing-running-appium/caps.md)
and started an Appium session, follow the generalized instructions above.


### Automating hybrid iOS apps

To interact with a web view Appium establishes a connection using a custom
remote debugger. When executing against a simulator this connection is
established directly as the simulator and the Appium server are on the same
machine. Appium can automate [WkWebView](https://developer.apple.com/documentation/webkit/wkwebview)
and [UIWebView](https://developer.apple.com/documentation/uikit/uiwebview)
elements. Unfortunately, it is not currently able to handle
[SafariViewController](https://developer.apple.com/documentation/safariservices/sfsafariviewcontroller)
elements.

Once you've set your [desired capabilities](/docs/en/writing-running-appium/caps.md)
and started an Appium session, follow the generalized instructions above.

#### Execution against an iOS real device

When executing against an iOS real device, Appium is unable to access the web view
directly. Therefore the connection has to be established through the USB cable.
Appium can establish the connection natively since version 1.15 via [appium-ios-device](https://github.com/appium/appium-ios-device).
[ios-webkit-debugger-proxy](https://github.com/google/ios-webkit-debug-proxy) is only necessary for Appium below version 1.15.

For instruction on how to install and run `ios-webkit-debugger-proxy` see the
[iOS webkit debug proxy](/writing-running-appium/web/ios-webkit-debug-proxy.md)
documentation.

Now you can start an Appium test session and follow the generalized instructions
above.
