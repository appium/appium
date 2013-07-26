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

```java
    JSONArray json = new JSONArray();
    json.put("scroll");
    json.put(new JSONArray().put(new JSONArray().put(3).put("Gallery")));
    json.put(new JSONArray().put(new JSONArray().put(7).put("Gallery")));
    // json is now: ["scroll",[[3,"Gallery"]],[[7,"Gallery"]]]
    ((JavascriptExecutor) driver).executeScript("mobile: find", json);
```

Ruby + [appium_lib gem](https://github.com/appium/ruby_lib)

```ruby
scroll_to 'Gallery'
```
