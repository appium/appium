#### Cross platform mobile methods

##### Reset

Mobile reset will reset the app's state.

Ruby + [appium_lib gem](https://github.com/appium/ruby_lib)
```ruby
mobile :reset
```

Ruby without the gem
```ruby
@driver.execute_script 'mobile: reset'
```

#### Android mobile methods

##### KeyEvent

[KeyEvent](http://developer.android.com/reference/android/view/KeyEvent.html) enables sending a keycode to Android.

Press the system menu button in Java.

```java
HashMap<String, Integer> keycode = new HashMap<String, Integer>();
keycode.put("keycode", 82);
((JavascriptExecutor)driver).executeScript("mobile: keyevent", keycode);
```

Ruby + [appium_lib gem](https://github.com/appium/ruby_lib)

```ruby
mobile :keyevent, keycode: 82
```

Ruby without the gem
```ruby
@driver.execute_script 'mobile: keyevent', :keycode => 82
```

#### Mobile find

Java

See [MobileFindJavaTest.java](./../sample-code/examples/java/junit/src/test/java/com/saucelabs/appium/MobileFindJavaTest.java)

Ruby + [appium_lib gem](https://github.com/appium/ruby_lib)

```ruby
scroll_to 'Gallery'
```
