## iOS 'mobile:': Element search swipe

To search the element on screen or scrollView use:
- element id with 'name' argument
- or specify NSPredicate string using 'predicateString' argument

NSPredicate examples available [here](../../ios/ios-predicate.md)

NSPredicate covers element id search with 'name ==
accessibilityIdentifier' predicate string.

```java
String pre = "label == 'exact_text'";
MobileElement el = (MobileElement) driver.findElement(MobileBy.id("element_id"));

mobileScrollToElementIOS(el, pre);

/**
 * Performs element scroll by predicate string
 *
 * @param el  the element to scroll
 * @param pre the predicate string
 * @version java-client: 7.3.0
 **/
public void mobileScrollToElementIOS(MobileElement el, String pre) {
    System.out.println("mobileScrollToElementIOS(): pre: '" + pre + "'"); // always log your actions

    // Animation default time:
    //  - iOS: 200 ms
    // final value depends on your app and could be greater
    final int ANIMATION_TIME = 200; // ms
    final HashMap<String, String> scrollObject = new HashMap<String, String>();
    scrollObject.put("element", el.getId());
    scrollObject.put("predicateString", pre);
    try {
        driver.executeScript("mobile:scroll", scrollObject);
        Thread.sleep(ANIMATION_TIME); // always allow swipe action to complete
    } catch (Exception e) {
        System.err.println("mobileScrollToElementIOS(): FAILED\n" + e.getMessage());
        return;
    }
}
```

'mobileScrollToElementIOS' works UNRELIABLE and often missing needed
element while scrolling. Specially in complex views. Sometimes helps set
'simpleIsVisibleCheck' capability to true.

As workaround use combination of simple scroll(screen or element) and
check that needed element is visible.

Example of screen scroll and element visibility check.

```java
String pre = "label == 'exact_text'";
mobileScrollScreenByPredicateIOS(pre, Direction.DOWN);

/**
 * Performs screen scroll by predicate string
 *
 * @param pre the predicate string
 * @param dir the direction of swipe
 * @version java-client: 7.3.0
 **/
public void mobileScrollScreenByPredicateIOS(String pre, Direction dir) {
    System.out.println("mobileScrollScreenByPredicateIOS(): dir: '" + dir + "'"); // always log your actions
    final int MAX_SWIPES = 5; // limit maximum swipes

    for (int i = 0; i < MAX_SWIPES; i++) {
        try {
            if (driver.findElement(MobileBy.iOSNsPredicateString(pre)).isDisplayed())
                break;
        } catch (Exception e) {
            // ignore
        }
        mobileScrollScreenIOS(dir);
    }
}
```

