## Simple Screen swipe

Start of swipe is important. We can met following elements:
- application interface/menu e.g. header or footer menu
- elements that waiting tap and do not pass touch to scroll view

It is better to start swipe actions at the center of the screen to make
them more reliable.

![swipe_screen](simple-screen.png)

```java
/**
 * Performs screen swipe from center
 *
 * @param dir d - down, u - up, l - left, r - right
 * @version java-client: 7.3.0
 **/
public void swipeScreen(String dir) {
    System.out.println("swipeScreen(): dir: '" + dir + "'"); // always log your actions

    // Animation default time:
    //  - Android: 300 ms
    //  - iOS: 200 ms
    // final value depends on your app and could be larger
    final int ANIMATION_TIME = 200; // ms

    final int PRESS_TIME = 200; // ms

    int screenHeight, screenWidth;
    int edgeBorder = 10; // better avoid edges
    PointOption pointOptionStart, pointOptionEnd;

    // init screen variables
    Dimension dims = driver.manage().window().getSize();
    screenHeight = dims.height;
    screenWidth = dims.width;

    // init start point = center of screen
    pointOptionStart = PointOption.point(screenWidth / 2, screenHeight / 2);

    switch (dir) {
        case "d": // center of footer
            pointOptionEnd = PointOption.point(screenWidth / 2, screenHeight - edgeBorder);
            break;
        case "u": // center of header
            pointOptionEnd = PointOption.point(screenWidth / 2, edgeBorder);
            break;
        case "l": // center of left side
            pointOptionEnd = PointOption.point(edgeBorder, screenHeight / 2);
            break;
        case "r": // center of right side
            pointOptionEnd = PointOption.point(screenWidth - edgeBorder, screenHeight / 2);
            break;
        default:
            throw new IllegalArgumentException("swipeScreen(): dir: '" + dir + "' NOT supported");
    }

    // execute swipe using TouchAction
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


