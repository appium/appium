## iOS pickerWheels: Fast '.setValue()' example

Unfortunately, XCTest cannot always properly interact with picker wheel
controls. Sometimes the setValue() call might not have any effect.

How to make picker wheel controls more compatible to XCTest:
- if PickerWheel view is simple e.g. any text: month name, date or
  country name in most cases '.setValue()' works.
- if PickerWheel value complicated e.g. country flag image and country
  text then the probability of failure increases.

### One PickerWheel

```java
String txt = "exact_text";
MobileElement el = (MobileElement) driver.findElement(MobileBy.className("XCUIElementTypePickerWheel"));
el.setValue(txt);
```

### Multiple PickerWheels

```java
String txt = "exact_text";
List<MobileElement> el = driver.findElements(MobileBy.className("XCUIElementTypePickerWheel"));

// set first PickerWheel
el.get(0).setValue(txt);

// set second PickerWheel
el.get(1).setValue(txt);
```

