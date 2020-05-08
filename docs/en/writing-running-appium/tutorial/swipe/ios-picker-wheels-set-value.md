## iOS pickerWheels: Fast '.setValue()' example

PickerWheels in XCTest framework is powerful and weak side. Powerful
when '.setValue()' works and weak when not. It is breaking and restoring
quite often.

General rules:
- when PickerWheel view is simple e.g. any text: month name, date or
  country name in most cases '.setValue()' works.
- when PickerWheel value complex e.g. country flag image and country
  text then possibility of fail increases.

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

