## Finding and interacting with elements

Appium supports a subset of the WebDriver locator strategies:

* find by "class" (i.e., ui component type)
* find by "xpath" (i.e., an abstract representation of a path to an element,
with certain constraints)

Appium additionally supports some of the [Mobile JSON Wire Protocol](https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md) locator strategies

* `-ios uiautomation`: a string corresponding to a recursive element search
using the [UIAutomation library](ios_predicate.md) (iOS 9.3 and below only)
* `-android uiautomator`: a string corresponding to a recursive element
search using the [UiAutomator Api](uiautomator_uiselector.md) (Android-only)
* `accessibility id`: a string corresponding to a recursive element search
using the Id/Name that the native Accessibility options utilize.

### Issues

There's a known issue with table cell elements becoming invalidated before
there's time to interact with them. We're working on a fix

### Using The Appium Inspector To Locate Elements

Appium provides you with a neat tool that allows you to find the the elements
you're looking for without leaving the Appium app. With the Appium Inspector
(the i symbol next to the start test button) you can find any element and
it's name by either clicking the element on the preview page provided,
or locating it in the UI navigator.

### Overview

The Appium inspector has a simple layout, complete with a UI navigator,
a preview, and record and refresh buttons, and interaction tools.

![Step 1](https://raw.github.com/appium/appium/master/assets/InspectorImages/Overview.png)

### Example

After launching the Appium Inspector (you can do this by clicking the small
"i" button in the top right of the app) you can locate any element in the
preview. In this test, I'm looking for the id of the "show alert" button.

![Step 1](https://raw.github.com/appium/appium/master/assets/InspectorImages/Step1.png)

To find the id of this button, I click the "show alert" button in the
inspector preview. The Appium inspector then highlights the element in the UI
navigator, showing me both the id and element type of the button I clicked.

![Step 1](https://raw.github.com/appium/appium/master/assets/InspectorImages/Step2.png)
