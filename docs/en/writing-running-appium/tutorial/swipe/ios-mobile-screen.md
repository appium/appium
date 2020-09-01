## iOS 'mobile:': Screen swipe

XCTest framework supports unique gestures like "mobile:scroll" and
"mobile:swipe". They are not so flexible as UIScrollable but still
useful.

More info
[https://developer.apple.com/documentation/xctest/xcuielement]() in
'Scrolling' and 'Performing Gestures' sections.

As usual swipe performs swipe action while scroll tries to change one
visible view port only.

!Note! Scroll direction differs between scroll and swipe commands

```java
/**
 * Performs screen scroll
 *
 * @param dir the direction of scroll
 * @version java-client: 7.3.0
 **/
public void mobileScrollScreenIOS(Direction dir) {
    System.out.println("mobileScrollScreenIOS(): dir: '" + dir + "'"); // always log your actions

    // Animation default time:
    //  - iOS: 200 ms
    // final value depends on your app and could be greater
    final int ANIMATION_TIME = 200; // ms
    final HashMap<String, String> scrollObject = new HashMap<String, String>();

    switch (dir) {
        case DOWN: // from down to up (! differs from mobile:swipe)
            scrollObject.put("direction", "down");
            break;
        case UP: // from up to down (! differs from mobile:swipe)
            scrollObject.put("direction", "up");
            break;
        case LEFT: // from left to right (! differs from mobile:swipe)
            scrollObject.put("direction", "left");
            break;
        case RIGHT: // from right to left (! differs from mobile:swipe)
            scrollObject.put("direction", "right");
            break;
        default:
            throw new IllegalArgumentException("mobileScrollIOS(): dir: '" + dir + "' NOT supported");
    }
    try {
        driver.executeScript("mobile:scroll", scrollObject); // swipe faster then scroll
        Thread.sleep(ANIMATION_TIME); // always allow swipe action to complete
    } catch (Exception e) {
        System.err.println("mobileScrollIOS(): FAILED\n" + e.getMessage());
        return;
    }
}

/**
 * Performs screen swipe
 *
 * @param dir the direction of swipe
 * @version java-client: 7.3.0
 **/
public void mobileSwipeScreenIOS(Direction dir) {
    System.out.println("mobileSwipeScreenIOS(): dir: '" + dir + "'"); // always log your actions

    // Animation default time:
    //  - iOS: 200 ms
    // final value depends on your app and could be greater
    final int ANIMATION_TIME = 200; // ms
    final HashMap<String, String> scrollObject = new HashMap<String, String>();

    switch (dir) {
        case DOWN: // from up to down (! differs from mobile:scroll)
            scrollObject.put("direction", "down");
            break;
        case UP: // from down to up  (! differs from mobile:scroll)
            scrollObject.put("direction", "up");
            break;
        case LEFT: // from right to left  (! differs from mobile:scroll)
            scrollObject.put("direction", "left");
            break;
        case RIGHT: // from left to right  (! differs from mobile:scroll)
            scrollObject.put("direction", "right");
            break;
        default:
            throw new IllegalArgumentException("mobileSwipeScreenIOS(): dir: '" + dir + "' NOT supported");
    }
    try {
        driver.executeScript("mobile:swipe", scrollObject);
        Thread.sleep(ANIMATION_TIME); // always allow swipe action to complete
    } catch (Exception e) {
        System.err.println("mobileSwipeScreenIOS(): FAILED\n" + e.getMessage());
        return;
    }
}
```

