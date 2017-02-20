## Automating mobile gestures

While the Selenium WebDriver spec has support for certain kinds of mobile
interaction, its parameters are not always easily mappable to the functionality
that the underlying device automation (like UIAutomation in the case of iOS)
provides. To that end, Appium implements the new TouchAction / MultiAction API
defined in the newest version of the spec
([https://dvcs.w3.org/hg/webdriver/raw-file/tip/webdriver-spec.html#multiactions-1](https://dvcs.w3.org/hg/webdriver/raw-file/tip/webdriver-spec.html#multiactions-1)).
Note that this is different from the earlier version of the TouchAction API in
the original JSON Wire Protocol.

These APIs allow you to build up arbitrary gestures with multiple actuators.
Please see the Appium client docs for your language in order to find examples
of using this API.

### An Overview of the TouchAction / MultiAction API

### TouchAction

*TouchAction* objects contain a chain of events.

In all the appium client libraries, touch objects are created and are given a
chain of events.

The available events from the spec are:
 * press
 * release
 * moveTo
 * tap
 * wait
 * longPress
 * cancel
 * perform

Here's an example of creating an action in pseudocode:

```center
TouchAction().press(el0).moveTo(el1).release()
```

The above simulates a user pressing down on an element, sliding their finger
to another position, and removing their finger from the screen.

Appium performs the events in sequence. You can add a `wait` event to control
the timing of the gesture.

`moveTo` coordinates are *relative* to the current position. For example, dragging from
100,100 to 200,200 can be achieved by:
```
.press(100,100) // Start at 100,100
.moveTo(100,100) // Increase X & Y by 100 each, ending up at 200,200

```

The appium client libraries have different ways of implementing this, for example:
you can pass in coordinates or an element to a `moveTo` event. Passing both
coordinates _and_ an element will treat the coordinates as relative to the
element's position, rather than relative to the current position.

Calling the `perform` event sends the entire sequence of events to appium,
and the touch gesture is run on your device.

Appium clients also allow one to directly execute a TouchAction through the
driver object, rather than calling the `perform` event on the TouchAction
object.

In pseudocode, both of the following are equivalent:

```center
TouchAction().tap(el).perform()

driver.perform(TouchAction().tap(el))
```

### MultiTouch

*MultiTouch* objects are collections of TouchActions.

MultiTouch gestures only have two methods, `add`, and `perform`.

`add` is used to add another TouchAction to this MultiTouch.

When `perform` is called, all the TouchActions which were added to the
MultiTouch are sent to appium and performed as if they happened at the
same time. Appium first performs the first event of all TouchActions together,
then the second, etc.

Pseudocode example of tapping with two fingers:

```center
action0 = TouchAction().tap(el)
action1 = TouchAction().tap(el)
MultiAction().add(action0).add(action1).perform()
```



### Bugs and Workarounds

An unfortunate bug exists in the iOS 7.0 - 8.x Simulators where ScrollViews,
CollectionViews, and TableViews don't recognize gestures initiated by
UIAutomation (which Appium uses under the hood for iOS). To work around this,
we have provided access to a different function, `scroll`, which in many cases
allows you to do what you wanted to do with one of these views, namely, scroll
it!


**Scrolling<a name="scrolling">**


To allow access to this special feature, we override the `execute` or
`executeScript` methods in the driver, and prefix the command with `mobile: `.
See examples below:

To scroll, pass direction in which you intend to scroll as parameter.


```javascript
// javascript
driver.execute('mobile: scroll', {direction: 'down'})
```

```java
// java
JavascriptExecutor js = (JavascriptExecutor) driver;
HashMap<String, String> scrollObject = new HashMap<String, String>();
scrollObject.put("direction", "down");
js.executeScript("mobile: scroll", scrollObject);
```

```ruby
# ruby
execute_script 'mobile: scroll', direction: 'down'
```

```python
# python
driver.execute_script("mobile: scroll", {"direction": "down"})
```

```csharp
// c#
Dictionary<string, string> scrollObject = new Dictionary<string, string>();
scrollObject.Add("direction", "down");
((IJavaScriptExecutor)driver).ExecuteScript("mobile: scroll", scrollObject));
```

```php
$params = array(array('direction' => 'down'));
$driver->executeScript("mobile: scroll", $params);
```

Sample to scroll using direction and element.

```javascript
// javascript
driver.execute('mobile: scroll', {direction: 'down', element: element.value.ELEMENT});
```

```java
// java
JavascriptExecutor js = (JavascriptExecutor) driver;
HashMap<String, String> scrollObject = new HashMap<String, String>();
scrollObject.put("direction", "down");
scrollObject.put("element", ((RemoteWebElement) element).getId());
js.executeScript("mobile: scroll", scrollObject);
```

```ruby
# ruby
execute_script 'mobile: scroll', direction: 'down', element: element.ref
```

```python
# python
driver.execute_script("mobile: scroll", {"direction": "down", element: element.getAttribute("id")})
```

```csharp
// c#
Dictionary<string, string> scrollObject = new Dictionary<string, string>();
scrollObject.Add("direction", "down");
scrollObject.Add("element", <element_id>);
((IJavaScriptExecutor)driver).ExecuteScript("mobile: scroll", scrollObject));
```

```php
$params = array(array('direction' => 'down', 'element' => element.GetAttribute("id")));
$driver->executeScript("mobile: scroll", $params);
```

**Swiping**

This is an XCUITest driver specific method that is similar to scrolling (for reference, see 
https://developer.apple.com/reference/xctest/xcuielement). 

This method has the same API as [Scrolling](#scrolling), just replace "mobile: scroll"
with "mobile: swipe"

**Automating Sliders**


**iOS**

 * **Java**

```java
// java
// slider values can be string representations of numbers between 0 and 1
// e.g., "0.1" is 10%, "1.0" is 100%
WebElement slider =  driver.findElement(By.xpath("//window[1]/slider[1]"));
slider.sendKeys("0.1");
```

**Android**

The best way to interact with the slider on Android is with TouchActions.
