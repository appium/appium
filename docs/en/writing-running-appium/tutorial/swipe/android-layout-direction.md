## Android 'UIScrollable' swipe: Add scroll layout

ScrollView can be horizontal and vertical. When UIAutomator fails
automatically scroll, specifying scrollView layout can solve problem.

### Add scrollView layout

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
