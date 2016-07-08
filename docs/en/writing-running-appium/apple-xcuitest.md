# Apple XCUITest

Xcode 7 introduces [new UI testing features](https://developer.apple.com/videos/play/wwdc2015/406/). Moving forward, [Appium iOS Driver](https://github.com/appium/appium-ios-driver) will leverage this framework, replacing UI Automation. While there are no official docs, @joemasilotti has created [some handy unofficial docs](http://masilotti.com/xctest-documentation/index.html) by pulling out comments from the header files.

## Launching the App (XCUIApplication)
  - ##### – launch

    Launches the application. This call is synchronous and when it returns the application is launched
and ready to handle user events. Any failure in the launch sequence is reported as a test failure
and halts the test at this point. If the application is already running, this call will first
terminate the existing instance to ensure clean state of the launched instance.

  - ##### – terminate

    Terminates any running instance of the application. If the application has an existing debug session
via Xcode, the termination is implemented as a halt via that debug connection. Otherwise, a SIGKILL
is sent to the process.

  - #####   launchArguments

    The arguments that will be passed to the application on launch. If not modified, these are the
arguments that Xcode will pass on launch. Those arguments can be changed, added to, or removed.
Unlike NSTask, it is legal to modify these arguments after the application has been launched. These
changes will not affect the current launch session, but will take effect the next time the application
is launched.

  - #####   launchEnvironment

    The environment that will be passed to the application on launch. If not modified, this is the
environment that Xcode will pass on launch. Those variables can be changed, added to, or removed.
Unlike NSTask, it is legal to modify the environment after the application has been launched. These
changes will not affect the current launch session, but will take effect the next time the application
is launched.

## Accessing the Device (XCUIDevice)
  - ##### + sharedDevice

    The current device.

  - #####   orientation

    The orientation of the device.

  - ##### – pressButton:

    Simulates the user pressing a physical button.

## Querying for Elements (XCUIElementQuery)
  - #####   element

    Returns an element that will use the query for resolution.

  - #####   count

    Evaluates the query at the time it is called and returns the number of matches found.

  - ##### – elementAtIndex:

    Returns an element that will resolve to the index into the query’s result set.

  - ##### – elementBoundByIndex:

    Returns an element that will use the index into the query’s results to determine which underlying accessibility element it is matched with.

  - ##### – elementMatchingPredicate:

    Returns an element that matches the predicate. The predicate will be evaluated against objects of type idXCUIElementAttributes.

  - ##### – elementMatchingType:identifier:

    Returns an element that matches the type and identifier.

  - ##### – objectForKeyedSubscript:

    Keyed subscripting is implemented as a shortcut for matching an identifier only. For example, app.descendants[“Foo”] -> XCUIElement.

  - #####   allElementsBoundByAccessibilityElement

    Immediately evaluates the query and returns an array of elements bound to the resulting accessibility elements.

  - #####   allElementsBoundByIndex

    Immediately evaluates the query and returns an array of elements bound by the index of each result.

  - ##### – descendantsMatchingType:

    Returns a new query that finds the descendants of all the elements found by the receiver.

  - ##### – childrenMatchingType:

    Returns a new query that finds the direct children of all the elements found by the receiver.

  - ##### – matchingPredicate:

    Returns a new query that applies the specified attributes or predicate to the receiver. The predicate will be evaluated against objects of type idXCUIElementAttributes.

  - ##### – matchingType:identifier:

  - ##### – matchingIdentifier:

  - ##### – containingPredicate:

    Returns a new query for finding elements that contain a descendant matching the specification. The predicate will be evaluated against objects of type idXCUIElementAttributes.

  - ##### – containingType:identifier:

  - #####   debugDescription

    @discussion
Provides debugging information about the query. The data in the string will vary based on the time
at which it is captured, but it may include any of the following as well as additional data:
    • A description of each step of the query.
    • Information about the inputs and matched outputs of each step of the query.
This data should be used for debugging only - depending on any of the data as part of a test is unsupported.

## Interacting with Elements (XCUIElement)
### XCUIElementEventSynthesis Methods
  - ##### – typeText:

    Types a string into the element. The element or a descendant must have keyboard focus; otherwise an
error is raised.

  - ##### – tap

    Sends a tap event to a hittable point computed for the element.

  - ##### – doubleTap

    Sends a double tap event to a hittable point computed for the element.

  - ##### – twoFingerTap

    Sends a two finger tap event to a hittable point computed for the element.

  - ##### – tapWithNumberOfTaps:numberOfTouches:

    Sends one or more taps with one of more touch points.

  - ##### – pressForDuration:

    Sends a long press gesture to a hittable point computed for the element, holding for the specified duration.

  - ##### – pressForDuration:thenDragToElement:

    Initiates a press-and-hold gesture that then drags to another element, suitable for table cell reordering and similar operations.
@param duration
Duration of the initial press-and-hold.
@param otherElement
The element to finish the drag gesture over. In the example of table cell reordering, this would be the reorder element of the destination row.

  - ##### – swipeUp

    Sends a swipe-up gesture.

  - ##### – swipeDown

    Sends a swipe-down gesture.

  - ##### – swipeLeft

    Sends a swipe-left gesture.

  - ##### – swipeRight

    Sends a swipe-right gesture.

  - ##### – pinchWithScale:velocity:

    Sends a pinching gesture with two touches.

  - ##### – rotate:withVelocity:

    Sends a rotation gesture with two touches.

### XCUIElementTypeSlider Methods
  - ##### – adjustToNormalizedSliderPosition:

    Manipulates the UI to change the displayed value of the slider to one based on a normalized position. 0 corresponds to the minimum value of the slider, 1 corresponds to its maximum value. The adjustment is a “best effort” to move the indicator to the desired position; absolute fidelity is not guaranteed.

  - #####   normalizedSliderPosition

    Returns the position of the slider’s indicator as a normalized value where 0 corresponds to the minimum value of the slider and 1 corresponds to its maximum value.

### XCUIElementTypePickerWheel Methods
  - ##### – adjustToPickerWheelValue:

    Changes the displayed value for the picker wheel. Will generate a test failure if the specified value is not available.
    
### Other Methods
  - #####   exists

    Test to determine if the element exists.

  - #####   hittable

    Whether or not a hit point can be computed for the element for the purpose of synthesizing events.

  - ##### – descendantsMatchingType:

    Returns a query for all descendants of the element matching the specified type.

  - ##### – childrenMatchingType:

    Returns a query for direct children of the element matching the specified type.

  - ##### – coordinateWithNormalizedOffset:

    Creates and returns a new coordinate that will compute its screen point by adding the offset multiplied by the size of the element’s frame to the origin of the element’s frame.

  - #####   debugDescription

    @discussion
Provides debugging information about the element. The data in the string will vary based on the
time at which it is captured, but it may include any of the following as well as additional data:
    • Values for the elements attributes.
    • The entire tree of descendants rooted at the element.
    • The element’s query.
This data should be used for debugging only - depending on any of the data as part of a test is unsupported.

## Using Coordinates (XCUICoordinate)
  - ##### – init

    Coordinates are never instantiated directly. Instead, they are created by elements or by other coordinates.

  - #####   referencedElement

    The element that the coordinate is based on, either directly or via the coordinate from which it was derived.

  - #####   screenPoint

    The dynamically computed value of the coordinate’s location on screen. Note that this value is dependent on the current frame of the referenced element; if the element’s frame changes, so will the value returned by this property. If the referenced element does exist when this is called, it will fail the test; check the referenced element’s exists property if the element may not be present.

  - ##### – coordinateWithOffset:

    Creates a new coordinate with an absolute offset in points from the original coordinate.

  - ##### – tap

  - ##### – doubleTap

  - ##### – pressForDuration:

  - ##### – pressForDuration:thenDragToCoordinate:

  - ##### – hover
