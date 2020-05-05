## Android 'UIScrollable' swipe: Tricks and Tips

While Appium does not allow you to use the full power 'UIScrollable'
directly, it is possible to ignore errors and do the trick.

### Scroll forward

```java
// scrollForward (moves exactly one view)
try {
    driver.findElement(MobileBy.AndroidUIAutomator(
            "new UiScrollable(new UiSelector().scrollable(true)).scrollForward()"));
} catch (Exception e) {
    // ignore
}

// flingForward (performs quick swipe)
try {
    driver.findElement(MobileBy.AndroidUIAutomator(
            "new UiScrollable(new UiSelector().scrollable(true)).flingForward()"));
} catch (Exception e) {
    // ignore
}
```

### Scroll backward

```java
// scrollBackward (moves exactly one view)
try {
    driver.findElement(MobileBy.AndroidUIAutomator(
            "new UiScrollable(new UiSelector().scrollable(true)).scrollBackward()"));
} catch (Exception e) {
    // ignore
}

// flingBackward (performs quick swipe)
try {
    driver.findElement(MobileBy.AndroidUIAutomator(
            "new UiScrollable(new UiSelector().scrollable(true)).flingBackward()"));
} catch (Exception e) {
    // ignore
}
```

### Scroll to beginning

```java
// scrollToBeginning (moves exactly by one view)
try {
    driver.findElement(MobileBy.AndroidUIAutomator(
            "new UiScrollable(new UiSelector().scrollable(true)).scrollToBeginning()"));
} catch (Exception e) {
    // ignore
}

// flingToBeginning (performs quick swipes)
try {
    driver.findElement(MobileBy.AndroidUIAutomator(
            "new UiScrollable(new UiSelector().scrollable(true)).flingToBeginning()"));
} catch (Exception e) {
    // ignore
}
```

### Scroll to end

```java
// scrollToEnd (moves exactly by one view)
try {
    driver.findElement(MobileBy.AndroidUIAutomator(
            "new UiScrollable(new UiSelector().scrollable(true)).scrollToEnd()"));
} catch (Exception e) {
    // ignore
}

// flingToEnd (performs quick swipes)
try {
    driver.findElement(MobileBy.AndroidUIAutomator(
            "new UiScrollable(new UiSelector().scrollable(true)).flingToEnd()"));
} catch (Exception e) {
    // ignore
}
```

