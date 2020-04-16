## Simple Screen swipe

Phone applications have interface. Interface, in most cases, blocks your
swipe actions when you start from it. Historically it uses header and/or
footer. To make screen swipe more reliable - it is better to start swipe
action from center of screen.

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

    int screenHeight, screenWidth;
    int edgeBorder = 10; // better avoid edges
    PointOption pointOptionStart, pointOptionEnd;

    // init screen height and width
    screenHeight = driver.manage().window().getSize().height;
    screenWidth = driver.manage().window().getSize().width;

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
            System.err.println("swipeScreen(): dir: '" + dir + "' NOT supported");
            return;
    }

    // execute swipe using TouchAction
    try {
        new TouchAction(driver)
                .press(pointOptionStart)
                .waitAction(WaitOptions.waitOptions(Duration.ofMillis(200)))
                .moveTo(pointOptionEnd)
                .release().perform();
    } catch (Exception e) {
        System.err.println("swipeScreen(): TouchAction FAILED\n" + e.getMessage());
        return;
    }

    // always allow swipe action to complete
    try {
        Thread.sleep(200);
    } catch (Exception e) {
        // ignore
    }
}
```


