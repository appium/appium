## Swipe troubleshoot guide

### Simple swipe actions

With touch action swipe problems execute following steps to check:

1. Add logs to touch coordinates.

Swipe screen example with logs:

```java
/**
 * Performs swipe from the center of screen
 *
 * @param dir the direction of swipe
 * @version java-client: 7.3.0
 **/
public void swipeScreenWithLogs(Direction dir) {
    System.out.println("swipeScreen(): dir: '" + dir + "'"); // always log your actions

    // Animation default time:
    //  - Android: 300 ms
    //  - iOS: 200 ms
    // final value depends on your app and could be greater
    final int ANIMATION_TIME = 200; // ms

    final int PRESS_TIME = 200; // ms

    int edgeBorder = 10; // better avoid edges
    Point pointStart, pointEnd;
    PointOption pointOptionStart, pointOptionEnd;

    // init screen variables
    Dimension dims = driver.manage().window().getSize();

    // init start point = center of screen
    pointStart = new Point(dims.width / 2, dims.height / 2);

    switch (dir) {
        case DOWN: // center of footer
            pointEnd = new Point(dims.width / 2, dims.height - edgeBorder);
            break;
        case UP: // center of header
            pointEnd = new Point(dims.width / 2, edgeBorder);
            break;
        case LEFT: // center of left side
            pointEnd = new Point(edgeBorder, dims.height / 2);
            break;
        case RIGHT: // center of right side
            pointEnd = new Point(dims.width - edgeBorder, dims.height / 2);
            break;
        default:
            throw new IllegalArgumentException("swipeScreen(): dir: '" + dir.toString() + "' NOT supported");
    }

    // execute swipe using TouchAction
    pointOptionStart = PointOption.point(pointStart.x, pointStart.y);
    pointOptionEnd = PointOption.point(pointEnd.x, pointEnd.y);
    System.out.println("swipeScreen(): pointStart: {" + pointStart.x + "," + pointStart.y + "}");
    System.out.println("swipeScreen(): pointEnd: {" + pointEnd.x + "," + pointEnd.y + "}");
    System.out.println("swipeScreen(): screenSize: {" + dims.width + "," + dims.height + "}");
    try {
        new TouchAction(driver)
                .press(pointOptionStart)
                // a bit more reliable when we add small wait
                .waitAction(WaitOptions.waitOptions(Duration.ofMillis(PRESS_TIME)))
                .moveTo(pointOptionEnd)
                .release().perform();
    } catch (Exception e) {
        System.err.println("swipeScreen(): TouchAction FAILED\n" + e.getMessage());
        return;
    }

    // always allow swipe action to complete
    try {
        Thread.sleep(ANIMATION_TIME);
    } catch (InterruptedException e) {
        // ignore
    }
}
```

Example output:

```
swipeScreen(): dir: 'DOWN'
swipeScreen(): pointStart: {187,333}
swipeScreen(): pointEnd: {187,657}
swipeScreen(): screenSize: {375,667}
swipeScreen(): dir: 'UP'
swipeScreen(): pointStart: {187,333}
swipeScreen(): pointEnd: {187,10}
swipeScreen(): screenSize: {375,667}
```

2. In Android enable 'Show Taps' and 'Pointer location' in 'Settings ->
   System -> Developer options -> Input tab' to see touches visually.
3. Check swipe manually using the same start and end points.

### Android: 'UIScrollable' swipe

#### Scroll does not start:

1. Check number of scrollViews on screen. If more then one -> specify
   scrollView by instance/resource-id/classname/...
2. Check scrollView layout and use 'setAsVerticalList' or
   'setAsHorizontalList'.
3. Use combination of specifying scrollView element and layout.
4. All fails -> switch to simple element swipe.

#### Missed the search element:

1. Add pause in test before search and manually swipe to needed element
   while test in pause. After pause add code to check element search.
   E.g. if you specified search element by text:

```java
MobileElement element = (MobileElement) driver.findElement(MobileBy.AndroidUIAutomator(
         "new UiSelector().text(\"exact_text\")"));
// or
MobileElement element = (MobileElement) driver.findElement(MobileBy.AndroidUIAutomator(
         "new UiSelector().textContains(\"part_text\")"));

try {
    System.out.println("Element found: " + !element.getId().isEmpty());
} catch (Exception e) {
    System.out.println("Element found: false");
}
```

### iOS: 'mobile:scroll', 'mobile:swipe' swipe

#### Scroll does not start:

1. Check direction. Note that 'scroll' and 'swipe' method directions
   differ!
2. All fails -> switch to simple element swipe.

#### Missed the search element:

1. If you need precise swipe prefer scroll method.
2. Sometimes when search element appeared partly tap on it will fail.
   Use strategy of simple-partial-element swipe (like
   simple-partial-screen example) on tap fail and repeat tap again after
   partial element swipe.
