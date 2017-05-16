## Automating Mobile Gestures For iOS With WebDriverAgent/XCTest Backend

Unfortunately Apple's XCTest framework does not natively support W3C standards for
TouchAction interface implementation. Although, it provides rich set of gestures,
inluding these, that are unique for iOS platform. It is possible to directly invoke these
gestures in Appium starting from version 1.6.4-beta.

It is important to rememeber that XCTest and WDA are being constantly changed.
This means all "mobile: *" commands can be also subject of change in Appium
without any preliminary notice.


### mobile: swipe

This gesture performs a simple "swipe" gesture on the particular screen element or
on the application element, which is usually the whole screen. This method does not
accept coordnates and siply emulates single swipe with one finger. It might be
useful for such cases like album pagination, switching views, etc. More advanced
cases may require to call "mobile: dragFromToForDuration", where one can supply
coordinates and duration.

#### Supported arguments

 * _direction_: Either 'up', 'down', 'left' or 'right'. The parameter is mandatory
 * _element_: The internal element identifier (as hexadecimal hash string) to swipe on.
 Application element will be used instead if this parameter is not provided

#### Usage examples

```java
// Java
JavascriptExecutor js = (JavascriptExecutor) driver;
Map<String, Object> params = new HashMap<>();
scrollObject.put("direction", "down");
scrollObject.put("element", ((RemoteWebElement) element).getId());
js.executeScript("mobile: swipe", params);
```


### mobile: scroll

Scrolls the element or the whole screen. Different scrolling strategies are supported.
Arguments define the choosen strategy: either 'name', 'direction', 'predicateString' or
'toVisible' in that order. All strategies are exclusive and only one strategy
can be applied at a single moment of time. Use "mobile: scroll" to emulate precise
scrolling in tables or collection views, where it is already known to which element
the scrolling should be performed. Although, there is one known limitation there: in case
it is necessary to perform too many scroll gestures on parent container to reach the
necessary child element (tens of them) then the method call may fail.

#### Supported arguments

 * _element_: The internal element identifier (as hexadecimal hash string) to scroll on.
 Application element will be used if this argument is not set
 * _name_: the accessibility id of the child element, to which scrolling is performed.
 The same result can be achieved by setting _predicateString_ argument to
 'name == accessibilityId'. Has no effect if _element_ is not a container
 * _direction_: Either 'up', 'down', 'left' or 'right'. The main difference from
 _swipe_ call with the same argument is that _scroll_ will try to move the current viewport
 exactly to the next/previous page (the term "page" means the content, which fits into
 a single device screen)
 * _predicateString_: the NSPredicate locator of the child element, to which
 the scrolling should be performed. Has no effect if _element_ is not a container
 * _toVisible_: Boolean parameter. If set to _true_ then asks to scroll to
 the first visible _element_ in the parent container. Has no effect if _element_ is
 not set

#### Usage examples

```python
# Python
driver.execute_script('mobile: scroll', {'direction': 'down'});
```


### mobile: pinch

Performs pinch gesture on the given element or on the application element.

#### Supported arguments

 * _element_: The internal element identifier (as hexadecimal hash string) to pinch on.
 Application element will be used instead if this parameter is not provided
 * _scale_: Pinch scale of type float. Use a scale between 0 and 1 to "pinch close" or
 zoom out and a scale greater than 1 to "pinch open" or zoom in. Mandatory parameter
 * _velocity_: The velocity of the pinch in scale factor per second (float value). Mandatory parameter

#### Usage examples

```ruby
# Ruby
execute_script 'mobile: pinch', scale: 0.5, velocity: 1.1, element: element.ref
```


### mobile: doubleTap

Performs double tap gesture on the given element or on the screen.

#### Supported arguments

 * _element_: The internal element identifier (as hexadecimal hash string) to double tap on
 * _x_: Screen x tap coordinate of type float. Mandatory parameter only if _element_ is not set
 * _y_: Screen y tap coordinate of type float. Mandatory parameter only if _element_ is not set

#### Usage examples

```javascript
// javascript
driver.execute('mobile: doubleTap', {element: element.value.ELEMENT});
```


### mobile: touchAndHold

Performs long press gesture on the given element or on the screen.

#### Supported arguments

 * _element_: The internal element identifier (as hexadecimal hash string) to long tap on
 * _duration_: The float duration of press action in seconds. Mandatory patameter
 * _x_: Screen x long tap coordinate of type float. Mandatory parameter only if _element_ is not set
 * _y_: Screen y long tap coordinate of type float. Mandatory parameter only if _element_ is not set

#### Usage examples

```csharp
// c#
Dictionary<string, object> tfLongTap = new Dictionary<string, object>();
tfLongTap.Add("element", element.Id);
tfLongTap.Add("duration", 2.0);
((IJavaScriptExecutor)driver).ExecuteScript("mobile: touchAndHold", tfLongTap);
```


### mobile: twoFingerTap

Performs two finger tap gesture on the given element or on the application element.

#### Supported arguments

 * _element_: The internal element identifier (as hexadecimal hash string) to double tap on.
 Application element will be used instead if this
 parameter is not provided

#### Usage examples

```csharp
// c#
Dictionary<string, object> tfTap = new Dictionary<string, object>();
tfTap.Add("element", element.Id);
((IJavaScriptExecutor)driver).ExecuteScript("mobile: twoFingerTap", tfTap);
```


### mobile: tap

Performs tap gesture by coordinates on the given element or on the screen.

#### Supported arguments

 * _element_: The internal element identifier (as hexadecimal hash string) to long tap on.
 _x_ and _y_ tap coordinates will be calulated relatively to the current element position on the
 screen if this argument is provided. Otherwise they should be calculated
 relatively to screen borders.
 * _x_: x tap coordinate of type float. Mandatory parameter
 * _y_: y tap coordinate of type float. Mandatory parameter

#### Usage examples

```php
// PHP
$params = array(array('x' => 100.0, 'y' => 50.0, 'element' => element.GetAttribute("id")));
$driver->executeScript("mobile: tap", $params);
```


### mobile: dragFromToForDuration

Performs drag and drop gesture by coordinates. This can be done either on an element or
on the screen

#### Supported arguments

 * _element_: The internal element identifier (as hexadecimal hash string) to perform drag on.
 All the coordinates will be calculated relatively this this element position on the screen.
 Absolute screen coordinates are expected if this argument is not set
 * _duration_: Float number of seconds in range [0.5, 60]. How long the tap gesture at
 starting drag point should be before to start dragging. Mandatory parameter
 * _fromX_: The x coordinate of starting drag point (type float). Mandatory parameter
 * _fromY_: The y coordinate of starting drag point (type float). Mandatory parameter
 * _toX_: The x coordinate of ending drag point (type float). Mandatory parameter
 * _toY_: The y coordinate of ending drag point (type float). Mandatory parameter

#### Usage examples

```java
// Java
JavascriptExecutor js = (JavascriptExecutor) driver;
Map<String, Object> params = new HashMap<>();
params.put("duration", 1.0);
params.put("fromX", 100);
params.put("fromY", 100);
params.put("toX", 200);
params.put("toY", 200);
params.put("element", ((RemoteWebElement) element).getId());
js.executeScript("mobile: dragFromToForDuration", params);
```


### mobile: selectPickerWheelValue

Performs selection of the next or previous picker wheel value. This might
be useful if these values are populated dynamically, so you don't know which
one to select or value selection does not work because of XCTest bug.

#### Supported arguments

 * _element_: PickerWheel's internal element id (as hexadecimal hash string) to perform
 value selection on. The element must be of type XCUIElementTypePickerWheel. Mandatory parameter
 * _order_: Either _next_ to select the value next to the current one
 from the target picker wheel or _previous_ to select the previous one. Mandatory parameter
 * _offset_: The value in range [0.01, 0.5]. It defines how far from picker
 wheel's center the click should happen. The actual distance is culculated by
 multiplying this value to the actual picker wheel height. Too small offset value
 may not change the picker wheel value and too high value may cause the wheel to switch
 two or more values at once. Usually the optimal value is located in range [0.15, 0.3]. _0.2_ by default

#### Usage examples

```java
// Java
JavascriptExecutor js = (JavascriptExecutor) driver;
Map<String, Object> params = new HashMap<>();
params.put("order", "next");
params.put("offset", 0.15);
params.put("element", ((RemoteWebElement) element).getId());
js.executeScript("mobile: selectPickerWheelValue", params);
```


### mobile: alert

Performs operations on NSAlert instance.

#### Supported arguments

 * _action_: The following actions are supported: _accept_, _dismiss_ and _getButtons_.
 Mandatory parameter
 * _buttonLabel_: The label text of an existing alert button to click on. This is an
 optional parameter and is only valid in combination with _accept_ and _dismiss_
 actions.

#### Usage examples

```python
# Python
driver.execute_script('mobile: alert', {'action': 'accept', 'buttonLabel': 'My Cool Alert Button'});
```


### Advanced Topics

Check [WDA Element Commands API](https://github.com/facebook/WebDriverAgent/blob/master/WebDriverAgentLib/Commands/FBElementCommands.m)
to get the information about the gestures implemented in Facebook WebDriverAgent.
Check Apple XCTest documentation on [XCUIElement](https://developer.apple.com/reference/xctest/xcuielement) and
[XCUICoordinate](https://developer.apple.com/reference/xctest/xcuicoordinate) methods list to get the information
about all gestures available there.
