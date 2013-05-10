Automating hybrid apps
======================

One of the core principles of Appium is that you shouldn't have to change your app to test it. In line with that methodology, it is possible to test hybrid web apps (e.g., the "UIWebView" elements in an iOS app) the same* way you can with Selenium for web apps. There is a bit of technical complexity required so that Appium knows whether you want to automate the native aspects of the app or the web views, but thankfully, we can stay within the WebDriver protocol for everything.

Here are the steps required to talk to a web view in your Appium test:

1.  Navigate to a portion of your app where a web view is active
1.  Call [GET session/:sessionId/window_handles](http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/window_handles)
1.  This returns a list of web view ids we can access
1.  Call [POST session/:sessionId/window](http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/window) with the id of the web view you want to access
1.  (This puts your Appium session into a mode where all commands are interpreted as being intended for automating the web view, rather than the native portion of the app. For example, if you run getElementByTagName, it will operate on the DOM of the web view, rather than return UIAElements. Of course, certain WebDriver methods only make sense in one context or another, so in the wrong context you will receive an error message).
1.  To stop automating in the web view context and go back to automating the native portion of the app, simply call `"mobile: leaveWebView"` with execute_script to leave the web frame.

## Wd.js Code example

```js
  // assuming we have an initialized `driver` object working on the UICatalog app
  driver.elementByName('Web, Use of UIWebView', function(err, el) { // find button to nav to view
    el.click(function(err) { // nav to UIWebView
      driver.windowHandles(function(err, handles) { // get list of available views
        driver.window(handles[0], function(err) { // choose the only available view
          driver.elementsByCss('.some-class', function(err, els) { // get webpage elements by css
            els.length.should.be.above(0); // there should be some!
            els[0].text(function(elText) { // get text of the first element
              elText.should.eql("My very own text"); // it should be extremely personal and awesome
              driver.execute("mobile: leaveWebView", function(err) { // leave webview context
                // do more native stuff here if we want
                driver.quit(); // stop webdrivage
              });
            });
          });
        });
      });
    });
  });
```

* For the full context, see [this node example](https://github.com/appium/appium/blob/master/sample-code/examples/node/hybrid.js)
* *we're working on filling out the methods available in web view contexts. [Join us in our quest!](http://appium.io/get-involved.html)

## Wd.java Code example

```java
  //setup the web driver and launch the webview app.
  DesiredCapabilities desiredCapabilities = new DesiredCapabilities();
  desiredCapabilities.setCapability("device", "iPhone Simulator");
  desiredCapabilities.setCapability("app", "http://appium.s3.amazonaws.com/WebViewApp6.0.app.zip");  
  URL url = new URL("http://127.0.0.1:4723/wd/hub");
  RemoteWebDriver remoteWebDriver = new RemoteWebDriver(url, desiredCapabilities);
  
  //switch to the latest web view
  for(String winHandle : remoteWebDriver.getWindowHandles()){
    remoteWebDriver.switchTo().window(winHandle);
  }
  
  //Interact with the elements on the guinea-pig page using id.
  WebElement div = remoteWebDriver.findElement(By.id("i_am_an_id"));
  Assert.assertEquals("I am a div", div.getText()); //check the text retrieved matches expected value
  remoteWebDriver.findElement(By.id("comments")).sendKeys("My comment"); //populate the comments field by id.
  
  //leave the webview to go back to native app.
  remoteWebDriver.executeScript("mobile: leaveWebView");      
  
  //close the app.
  remoteWebDriver.quit();
```

