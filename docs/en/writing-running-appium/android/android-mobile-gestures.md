## Automating Mobile Gestures With UiAutomator2 Backend

Touch actions are the most advanced and the most complicated way to
implement any Android gesture. Although, there is a couple of basic
gestures, like swipe, fling or pinch, which are commonly used in
Android applications and for which it makes sense to have shortcuts,
where only high-level options are configurable.


### mobile: longClickGesture

This gesture performs long click action on the given element/coordinates.
Available since Appium v1.19

#### Supported arguments

 * _elementId_: The id of the element to be clicked.
  If the element is missing then both click offset coordinates must be provided.
  If both the element id and offset are provided then the coordinates
  are parsed as relative offsets from the top left corner of the element.
 * _x_: The x-offset coordinate
 * _y_: The y-offset coordinate
 * _duration_: Click duration in milliseconds. `500` by default. The value must not be negative

#### Usage examples

```java
// Java
((JavascriptExecutor) driver).executeScript("mobile: longClickGesture", ImmutableMap.of(
    "elementId", ((RemoteWebElement) element).getId()
));
```

```python
# Python
driver.execute_script('mobile: longClickGesture', {'x': 100, 'y': 100, 'duration': 1000})
```


### mobile: doubleClickGesture

This gesture performs double click action on the given element/coordinates.
Available since Appium v1.21

#### Supported arguments

 * _elementId_: The id of the element to be clicked.
  If the element is missing then both click offset coordinates must be provided.
  If both the element id and offset are provided then the coordinates
  are parsed as relative offsets from the top left corner of the element.
 * _x_: The x-offset coordinate
 * _y_: The y-offset coordinate

#### Usage examples

```java
// Java
((JavascriptExecutor) driver).executeScript("mobile: doubleClickGesture", ImmutableMap.of(
    "elementId", ((RemoteWebElement) element).getId()
));
```

```python
# Python
driver.execute_script('mobile: doubleClickGesture', {'x': 100, 'y': 100})
```


### mobile: clickGesture

This gesture performs click action on the given element/coordinates.
Available since Appium v1.22.1. Usage of this gesture is recommended
as a possible workaround for cases where the "native" tap call fails,
even though tap coordinates seem correct. This issue is related to the fact
these calls use the legacy UIAutomator-based calls while this extension
is based on the same foundation as W3C does.


#### Supported arguments

 * _elementId_: The id of the element to be clicked.
  If the element is missing then both click offset coordinates must be provided.
  If both the element id and offset are provided then the coordinates
  are parsed as relative offsets from the top left corner of the element.
 * _x_: The x-offset coordinate
 * _y_: The y-offset coordinate

#### Usage examples

```java
// Java
driver.executeScript("mobile: clickGesture", ImmutableMap.of(
    "elementId", ((RemoteWebElement) element).getId()
));
```

```python
# Python
driver.execute_script('mobile: clickGesture', {'x': 100, 'y': 100})
```


### mobile: dragGesture

This gesture performs drag action from the given element/coordinates to the given point.
Available since Appium v1.19

#### Supported arguments

 * _elementId_: The id of the element to be dragged.
  If the element id is missing then both start coordinates must be provided.
  If both the element id and the start coordinates are provided then these
  coordinates are considered as offsets from the top left element corner.
 * _startX_: The x-start coordinate
 * _startY_: The y-start coordinate
 * _endX_: The x-end coordinate. Mandatory argument
 * _endY_: The y-end coordinate. Mandatory argument
 * _speed_:  The speed at which to perform this gesture in pixels per second.
  The value must not be negative. The default value is `2500 * displayDensity`

#### Usage examples

```java
// Java
((JavascriptExecutor) driver).executeScript("mobile: dragGesture", ImmutableMap.of(
    "elementId", ((RemoteWebElement) element).getId(),
    "endX", 100,
    "endY", 100
));
```


### mobile: flingGesture

This gesture performs fling gesture on the given element/area.
Available since Appium v1.19

#### Supported arguments

 * _elementId_: The id of the element to be flinged.
  If the element id is missing then fling bounding area must be provided.
  If both the element id and the fling bounding area are provided then this
  area is effectively ignored.
 * _left_: The left coordinate of the fling bounding area
 * _top_: The top coordinate of the fling bounding area
 * _width_: The width of the fling bounding area
 * _height_: The height of the fling bounding area
 * _direction_: Direction of the fling. Mandatory value.
  Acceptable values are: `up`, `down`, `left` and `right` (case insensitive)
 * _speed_:  The speed at which to perform this
  gesture in pixels per second. The value must be greater than the minimum fling
  velocity for the given view (50 by default). The default value is `7500 * displayDensity`

#### Returned value

The returned value is a boolean one and equals to `true` if the object can still scroll in the given direction

#### Usage examples

```java
// Java
boolean canScrollMore = (Boolean) ((JavascriptExecutor) driver).executeScript("mobile: flingGesture", ImmutableMap.of(
    "elementId", ((RemoteWebElement) element).getId(),
    "direction", "down",
    "speed", 500
));
```


### mobile: pinchOpenGesture

This gesture performs pinch-open gesture on the given element/area.
Available since Appium v1.19

#### Supported arguments

 * _elementId_: The id of the element to be pinched.
  If the element id is missing then pinch bounding area must be provided.
  If both the element id and the pinch bounding area are provided then the
  area is effectively ignored.
 * _left_: The left coordinate of the pinch bounding area
 * _top_: The top coordinate of the pinch bounding area
 * _width_: The width of the pinch bounding area
 * _height_: The height of the pinch bounding area
 * _percent_: The size of the pinch as a percentage of the pinch area size.
  Valid values must be float numbers in range 0..1, where 1.0 is 100%.
  Mandatory value.
 * _speed_:  The speed at which to perform this gesture in pixels per second.
  The value must not be negative. The default value is `2500 * displayDensity`

#### Usage examples

```java
// Java
((JavascriptExecutor) driver).executeScript("mobile: pinchOpenGesture", ImmutableMap.of(
    "elementId", ((RemoteWebElement) element).getId(),
    "percent", 0.75
));
```


### mobile: pinchCloseGesture

This gesture performs pinch-close gesture on the given element/area.
Available since Appium v1.19

#### Supported arguments

 * _elementId_: The id of the element to be pinched.
  If the element id is missing then pinch bounding area must be provided.
  If both the element id and the pinch bounding area are provided then the
  area is effectively ignored.
 * _left_: The left coordinate of the pinch bounding area
 * _top_: The top coordinate of the pinch bounding area
 * _width_: The width of the pinch bounding area
 * _height_: The height of the pinch bounding area
 * _percent_: The size of the pinch as a percentage of the pinch area size.
  Valid values must be float numbers in range 0..1, where 1.0 is 100%.
  Mandatory value.
 * _speed_:  The speed at which to perform this gesture in pixels per second.
  The value must not be negative. The default value is `2500 * displayDensity`

#### Usage examples

```java
// Java
((JavascriptExecutor) driver).executeScript("mobile: pinchCloseGesture", ImmutableMap.of(
    "elementId", ((RemoteWebElement) element).getId(),
    "percent", 0.75
));
```

```python
# Python
can_scroll_more = driver.execute_script('mobile: pinchCloseGesture', {
    'elementId': element.id,
    'percent': 0.75
})
```


### mobile: swipeGesture

This gesture performs swipe gesture on the given element/area.
Available since Appium v1.19

#### Supported arguments

 * _elementId_: The id of the element to be swiped.
  If the element id is missing then swipe bounding area must be provided.
  If both the element id and the swipe bounding area are provided then the
  area is effectively ignored.
 * _left_: The left coordinate of the swipe bounding area
 * _top_: The top coordinate of the swipe bounding area
 * _width_: The width of the swipe bounding area
 * _height_: The height of the swipe bounding area
 * _direction_: Swipe direction. Mandatory value.
  Acceptable values are: `up`, `down`, `left` and `right` (case insensitive)
 * _percent_: The size of the swipe as a percentage of the swipe area size.
  Valid values must be float numbers in range 0..1, where 1.0 is 100%.
  Mandatory value.
 * _speed_:  The speed at which to perform this gesture in pixels per second.
  The value must not be negative. The default value is `5000 * displayDensity`

#### Usage examples

```java
// Java
((JavascriptExecutor) driver).executeScript("mobile: swipeGesture", ImmutableMap.of(
    "left", 100, "top", 100, "width", 200, "height", 200,
    "direction", "left",
    "percent", 0.75
));
```


### mobile: scrollGesture

This gesture performs scroll gesture on the given element/area.
Available since Appium v1.19

#### Supported arguments

 * _elementId_: The id of the element to be scrolled.
  If the element id is missing then scroll bounding area must be provided.
  If both the element id and the scroll bounding area are provided then this
  area is effectively ignored.
 * _left_: The left coordinate of the scroll bounding area
 * _top_: The top coordinate of the scroll bounding area
 * _width_: The width of the scroll bounding area
 * _height_: The height of the scroll bounding area
 * _direction_: Scrolling direction. Mandatory value.
  Acceptable values are: `up`, `down`, `left` and `right` (case insensitive)
 * _percent_: The size of the scroll as a percentage of the scrolling area size.
  Valid values must be float numbers greater than zero, where 1.0 is 100%.
  Mandatory value.
 * _speed_:  The speed at which to perform this gesture in pixels per second.
  The value must not be negative. The default value is `5000 * displayDensity`

#### Returned value

The returned value is a boolean one and equals to `true` if the object can still scroll in the given direction

#### Usage examples

```java
// Java
boolean canScrollMore = (Boolean) ((JavascriptExecutor) driver).executeScript("mobile: scrollGesture", ImmutableMap.of(
    "left", 100, "top", 100, "width", 200, "height", 200,
    "direction", "down",
    "percent", 3.0
));
```

```python
# Python
can_scroll_more = driver.execute_script('mobile: scrollGesture', {
    'left': 100, 'top': 100, 'width': 200, 'height': 200,
    'direction': 'down',
    'percent': 3.0
})
```
