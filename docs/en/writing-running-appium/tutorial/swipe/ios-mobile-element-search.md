## iOS 'mobile:': Element search swipe

To search an element or a scroll view use:
- element id with <code>name</code> argument
- or specify NSPredicate string using <code>predicateString</code>
  argument

NSPredicate examples available [here](../../ios/ios-predicate.md) or
[https://kapeli.com/cheat_sheets/NSPredicate.docset/Contents/Resources/Documents/index](https://kapeli.com/cheat_sheets/NSPredicate.docset/Contents/Resources/Documents/index)
is a good NSPredicate cheat sheet.

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
element while scrolling (especially in complex views). Sometimes helps
set <code>simpleIsVisibleCheck'</code> capability to true.

As workaround try use combination of simple scroll(screen or element)
and check that the destination element is visible on each step.

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

