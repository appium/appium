#### 跨平台的移动测试方法

##### 移动测试的重置方法reset

reset方法会重置待测应用的状态

Ruby + [appium_lib gem](https://github.com/appium/ruby_lib)
```ruby
mobile :reset
```

不使用其他gem的方式

```ruby
@driver.execute_script 'mobile: reset'
```

#### Android下的移动测试方法

##### 移动测试的按键事件keyevent

[KeyEvent](http://developer.android.com/reference/android/view/KeyEvent.html) 提供了发送按键码(keycode)到Android的能力.

在java中按下系统菜单键的演示

```java
HashMap<String, Integer> keycode = new HashMap<String, Integer>();
keycode.put("keycode", 82);
((JavascriptExecutor)driver).executeScript("mobile: keyevent", keycode);
```

Ruby + [appium_lib gem](https://github.com/appium/ruby_lib)

```ruby
mobile :keyevent, keycode: 82
```

不使用第三方gem的方式

```ruby
@driver.execute_script 'mobile: keyevent', :keycode => 82
```

#### 移动测试的Find方法

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
