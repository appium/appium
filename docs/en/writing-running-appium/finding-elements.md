## Finding and interacting with elements

Appium supports a subset of the WebDriver locator strategies:

* find by "class" (i.e., ui component type)
* find by "xpath" (i.e., an abstract representation of a path to an element,
with certain constraints)

Appium additionally supports some of the [Mobile JSON Wire Protocol](https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md) locator strategies

* `-ios uiautomation`: a string corresponding to a recursive element search
using the [UIAutomation library](/docs/en/writing-running-appium/ios/ios-predicate.md) (iOS 9.3 and below only)
* `-android uiautomator`: a string corresponding to a recursive element
search using the [UiAutomator Api](/docs/en/writing-running-appium/android/uiautomator-uiselector.md) (Android-only)
* `accessibility id`: a string corresponding to a recursive element search
using the Id/Name that the native Accessibility options utilize.

### Issues

There's a known issue with table cell elements becoming invalidated before
there's time to interact with them. We're working on a fix

### Using Appium Desktop To Locate Elements

Appium provides you with a neat tool that allows you to find the the elements
you're looking for. With [Appium Desktop](https://github.com/appium/appium-desktop) you
can find any element and its locators by either clicking the element on the screenshot
image, or locating it in the source tree.

### Overview

Appium Desktop has a simple layout, complete with a source tree,
a screenshot, and record and refresh buttons, and interaction tools.

![](https://github.com/appium/appium-desktop/blob/master/docs/images/screen-inspector-and-logs.png)

### Example

After launching Appium Desktop and starting a session, you can locate any element in the
source. In this test, I'm looking for the accessibility id of the "Compute Sum" button.

To find the accessibility id of this button, I click the "Compute Sum" button in the
screenshot. The element is then highlighted in the source tree. In the panel on the right,
I can see the accessibility id.

![](https://github.com/appium/appium-desktop/raw/master/docs/images/screen-inspector.png)
