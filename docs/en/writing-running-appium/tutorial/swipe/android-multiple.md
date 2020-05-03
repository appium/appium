## Android 'UIScrollable' swipe: Multiple scroll views example

With more then one scrollView on the screen, there is a chance, that
UIScrollable fails to scroll to the destination subview. In such case we
would need to specify the locator of the destination subview as "new
UiSelector().scrollable(true)".

### By instance

```java
// first scrollView
// FindElement
MobileElement element = (MobileElement) driver.findElement(MobileBy.AndroidUIAutomator(
        "new UiScrollable(new UiSelector().scrollable(true).instance(0))" +
         ".scrollIntoView(new UiSelector().text(\"exact_text\"))"));

// second scrollView
// FindElement
MobileElement element = (MobileElement) driver.findElement(MobileBy.AndroidUIAutomator(
        "new UiScrollable(new UiSelector().scrollable(true).instance(1))" +
         ".scrollIntoView(new UiSelector().text(\"exact_text\"))"));

```

### By id

```java
// FindElement
MobileElement element = (MobileElement) driver.findElement(MobileBy.AndroidUIAutomator(
        "new UiScrollable(new UiSelector().scrollable(true).resourceIdMatches((\".*part_id.*\")))" +
         ".scrollIntoView(new UiSelector().text(\"exact_text\"))"));

```


