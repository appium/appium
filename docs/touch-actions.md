# Touch Actions

WebDriver provides an API to send some kinds of touch gestures to the devices,
for example, to long press an element you can do:

```java
final WebElement imageView = searchResults.findElement(By.tagName("ImageView"));
new TouchActions(driver).longPress(imageView).perform();
```

Currently Appium support some of the gestures in the Touch Actions API:

* flick
* long press
* single tap

Some other gestures are supported through the "Alternative access method"
explained in [Automating mobile gestures](gestures.md)

