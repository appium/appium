## iOS pickerWheels: Slow 'mobile:selectPickerWheelValue' example

If '.setValue()' fails then 'mobile: selectPickerWheelValue' helper
could be used as a workaround.

This mobile method allows to select the next or the previous picker
value.

It is necessary to keep changing picker wheel values until the current
one is equal the desired one or the count of retries exceeds.

[documentation](../../ios/ios-xctest-mobile-gestures.md#mobile-selectPickerWheelValue)

### Select PickerWheel example

```java

Assert.assertTrue(setPickerWheel("my_text", Order.NEXT), "setPickerWheel(): FAILED");

/**
 * Set PickerWheel value
 *
 * @param text  the text to select
 * @param order the direction of search
 * @return result of set
 * @version java-client: 7.3.0
 **/
public boolean setPickerWheel(String text, Order order) {
    System.out.println("setPickerWheel(): text: '" + text
        + "',order: '" + order + "'"); // always log your actions

    // find pickerWheel
    MobileElement pickerWheel =
        (MobileElement) driver.findElement(MobileBy.className("XCUIElementTypePickerWheel"));

    // limit search time to avoid infinite loops
    String resultText;
    Long startTime = System.currentTimeMillis();
    do {
        resultText = pickerWheel.getText();
        if (resultText.equals(text))
            return true;
        if (!selectPickerWheelIOS(pickerWheel, order))
            return false;
    } while (System.currentTimeMillis() < startTime + 60 * 1000); // 60 sec MAX
    return false;
}

/**
 * Performs set next or previous value
 *
 * @param el    the pickerWheel element
 * @param order the order to select
 * @return result of select
 * @version java-client: 7.3.0
 **/
public boolean selectPickerWheelIOS(MobileElement el, Order order) {
    System.out.println("selectPickerWheelIOS(): order: '" + order + "'"); // always log your actions

    HashMap<String, Object> params = new HashMap<>();
    params.put("order", order.name().toLowerCase());
    params.put("offset", "0.2"); // tap offset
    params.put("element", el.getId()); // pickerWheel element
    try {
        driver.executeScript("mobile: selectPickerWheelValue", params);
        return true;
    } catch (InvalidElementStateException e1) {
        System.out.println("selectPickerWheelIOS(): FAILED\n" + e1.getMessage());
    } catch (InvalidArgumentException e2) {
        System.out.println("selectPickerWheelIOS(): FAILED\n" + e2.getMessage());
    }
    return false;
}

public enum Order {
    NEXT,
    PREVIOUS;
}
```

