## Android 'UIScrollable' swipe: Tricks and Tips

While Appium does not allow you to use the full power 'UIScrollable'
directly, it is possible to ignore errors and do the trick.

### Scroll forward

```java
// scrollForward (moves exactly one view)
try {
    driver.findElement(MobileBy.AndroidUIAutomator(
            "new UiScrollable(new UiSelector().scrollable(true)).scrollForward()"));
} catch (InvalidSelectorException e) {
    // ignore
}

// flingForward (performs quick swipe)
try {
    driver.findElement(MobileBy.AndroidUIAutomator(
            "new UiScrollable(new UiSelector().scrollable(true)).flingForward()"));
} catch (InvalidSelectorException e) {
    // ignore
}
```

### Scroll backward

```java
// scrollBackward (moves exactly one view)
try {
    driver.findElement(MobileBy.AndroidUIAutomator(
            "new UiScrollable(new UiSelector().scrollable(true)).scrollBackward()"));
} catch (InvalidSelectorException e) {
    // ignore
}

// flingBackward (performs quick swipe)
try {
    driver.findElement(MobileBy.AndroidUIAutomator(
            "new UiScrollable(new UiSelector().scrollable(true)).flingBackward()"));
} catch (InvalidSelectorException e) {
    // ignore
}
```

### Scroll to beginning

```java
// scrollToBeginning (moves exactly by one view. 10 scrolls max)
try {
    driver.findElement(MobileBy.AndroidUIAutomator(
            "new UiScrollable(new UiSelector().scrollable(true)).scrollToBeginning(10)"));
} catch (InvalidSelectorException e) {
    // ignore
}

// flingToBeginning (performs quick swipes. 10 swipes max)
try {
    driver.findElement(MobileBy.AndroidUIAutomator(
            "new UiScrollable(new UiSelector().scrollable(true)).flingToBeginning(10)"));
} catch (InvalidSelectorException e) {
    // ignore
}
```

### Scroll to end

```java
// scrollToEnd (moves exactly by one view. 10 scrolls max)
try {
    driver.findElement(MobileBy.AndroidUIAutomator(
            "new UiScrollable(new UiSelector().scrollable(true)).scrollToEnd(10)"));
} catch (InvalidSelectorException e) {
    // ignore
}

// flingToEnd (performs quick swipes. 10 swipes max)
try {
    driver.findElement(MobileBy.AndroidUIAutomator(
            "new UiScrollable(new UiSelector().scrollable(true)).flingToEnd(10)"));
} catch (InvalidSelectorException e) {
    // ignore
}
```

