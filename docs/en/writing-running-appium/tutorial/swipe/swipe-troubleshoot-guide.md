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

2. In Android enable 'Show Taps' and 'Pointer location' in 'Settings
   -> System -> Developer options -> Input tab' to see touches visually.
3. Check swipe manually using the same start and end points.

### Android: 'UIScrollable' swipe

`under construction`

### iOS: 'mobile:scroll', 'mobile:swipe' swipe

`under construction`

### iOS: 'pickerWheels' swipe

`under construction`
