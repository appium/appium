## iOS 'mobile:': Element swipe

To swipe inside element you need add element id into swipe methods.

```java
// find element to swipe inside
MobileElement el = (MobileElement) driver.findElement(MobileBy.id("my_id"));

// execute scroll
mobileScrollElementIOS(el, SwipeExamples.Direction.RIGHT);
mobileScrollElementIOS(el, SwipeExamples.Direction.LEFT);

// execute swipe
// !remember! to execute swipe in same direction as scroll use reverse direction
mobileSwipeElementIOS(el, SwipeExamples.Direction.LEFT);
mobileSwipeElementIOS(el, SwipeExamples.Direction.RIGHT);

/**
 * Performs scroll inside element
 *
 * @param dir the direction of scroll
 * @version java-client: 7.3.0
 **/
public void mobileScrollElementIOS(MobileElement el, Direction dir) {
    System.out.println("mobileScrollElementIOS(): dir: '" + dir + "'"); // always log your actions

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
            throw new IllegalArgumentException("mobileScrollElementIOS(): dir: '" + dir + "' NOT supported");
    }
    scrollObject.put("element", el.getId());
    try {
        driver.executeScript("mobile:scroll", scrollObject); // swipe faster then scroll
        Thread.sleep(ANIMATION_TIME); // always allow swipe action to complete
    } catch (Exception e) {
        System.err.println("mobileScrollElementIOS(): FAILED\n" + e.getMessage());
        return;
    }
}

/**
 * Performs swipe inside element
 *
 * @param dir the direction of swipe
 * @version java-client: 7.3.0
 **/
public void mobileSwipeElementIOS(MobileElement el, Direction dir) {
    System.out.println("mobileSwipeElementIOS(): dir: '" + dir + "'"); // always log your actions

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
            throw new IllegalArgumentException("mobileSwipeElementIOS(): dir: '" + dir + "' NOT supported");
    }
    try {
        driver.executeScript("mobile:swipe", scrollObject);
        Thread.sleep(ANIMATION_TIME); // always allow swipe action to complete
    } catch (Exception e) {
        System.err.println("mobileSwipeElementIOS(): FAILED\n" + e.getMessage());
        return;
    }
}

```

