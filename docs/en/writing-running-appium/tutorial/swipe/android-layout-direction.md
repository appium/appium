## Android 'UIScrollable' swipe: Add scroll layout

There are horizontal or vertical scroll views. If UIAutomator fails to
automatically perform the scroll then explicitly specifying the layout
could solve the issue.

### Set scroll view layout

```java
// setAsVerticalList
// FindElement
MobileElement element = (MobileElement) driver.findElement(MobileBy.AndroidUIAutomator(
        "new UiScrollable(new UiSelector().scrollable(true)).setAsVerticalList()" +
         ".scrollIntoView(new UiSelector().text(\"exact_text\"))"));

// setAsHorizontalList
// FindElement
MobileElement element = (MobileElement) driver.findElement(MobileBy.AndroidUIAutomator(
        "new UiScrollable(new UiSelector().scrollable(true)).setAsHorizontalList()" +
         ".scrollIntoView(new UiSelector().text(\"exact_text\"))"));

```

