# Cross platform mobile methods

## Reset

Mobile reset will reset the app's state.

Ruby + [appium_lib gem](https://github.com/appium/ruby_lib)

```ruby
mobile :reset
```

Ruby without the gem

```ruby
@driver.execute_script 'mobile: reset'
```

## pullFile

Fetch a file from the device's filesystem, returning it base64 encoded.

Takes a single argument, `path`. On Android and iOS, this is either the path
to the file (relative to the root of the app's file system).  On iOS only,
if path starts with `/AppName.app`, which will be replaced with the
application's .app directory

```ruby
# Android and iOS
@driver.execute_script 'mobile: pullFile', {path: '/Library/AddressBook/AddressBook.sqlitedb'} #=> /Library/AddressBook/AddressBook.sqlitedb

# iOS only
@driver.execute_script 'mobile: pullFile, {path: '/UICatalog.app/logfile.log'} #=> /Applications/12323-452262-24241-23-124124/UICatalog.app/logfile.log
```

Ruby

```ruby
@driver.execute_script('mobile: pullFile', {path: '/Library/AddressBook/AddressBook.sqlitedb'})
```

## Android mobile methods

## KeyEvent

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

## Mobile find

Java

See [MobileFindJavaTest.java](https://github.com/appium/appium/blob/master/sample-code/examples/java/junit/src/test/java/com/saucelabs/appium/MobileFindJavaTest.java)

Ruby + [appium_lib gem](https://github.com/appium/ruby_lib)

```ruby
scroll_to 'Gallery'
```