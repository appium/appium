## Appium Client Libraries

Please read [List of client libraries with Appium server support](/docs/en/about-appium/appium-clients.md) about clients.

### Lock

Lock the screen.

```ruby
# ruby
lock 5
```

```python
# python
driver.lock(5)
```

```java
// java
driver.lockScreen(3);
```

```javascript
// javascript
driver.lock(3)
```

```csharp
// c#
driver.LockDevice(3);
```

### Background app

Send the currently active app to the background, and either return after a certain amount of time, or leave the app deactivated.

There are 2 types of parameters which may be passed to this method:

1. An integer (in seconds): how long to background the app for. -1 means to deactivate the app entirely. This style of parameter is deprecated.
2. An object that looks like `{"timeout": secs}`, where `secs` is again an integer with the semantics mentioned just above in 1, or `null` (which means to deactivate entirely).

```ruby
# ruby
background_app 5  # background app for 5 seconds
background_app -1  # deactivate app
```

```python
# python
driver.background_app(5)  # background for 5 seconds
driver.background_app(-1) # deactivate app
driver.background_app({'timeout': None}) # deactivate app
```

```java
// java
driver.runAppInBackground(5);  // for 5 seconds
driver.runAppInBackground(-1);  // deactivate completely
```

```javascript
// javascript
driver.backgroundApp(5);  // for 5 seconds
driver.backgroundApp(-1); // deactivate app
driver.backgroundApp({timeout: null}); // deactivate app
```

```csharp
// c#
driver.BackgroundApp(5);
driver.BackgroundApp(-1);
```

### Hide Keyboard

Hide the keyboard. *Note*: on iOS, this helper function is not guaranteed to
work. There is no automation hook for hiding the keyboard, and apps are free to
allow the user to hide the keyboard using any of a variety of different
strategies, whether that is tapping outside the keyboard, swiping down, etc...
We encourage you, rather than using this method, to think about how a _user_
would hide the keyboard in your app, and tell Appium to do that instead (swipe,
tap on a certain coordinate, etc...). That being said, the default behavior
here might help you.

```ruby
# ruby
hide_keyboard
```

```python
# python
driver.hide_keyboard()
```

```java
// java
driver.hideKeyboard();
```

```javascript
// javascript
driver.hideKeyboard()
```

```csharp
// c#
driver.HideKeyboard("Done");
```

### Start Activity

Open an activity in the current app or start a new app and open an activity *Android only*

```java
// java
driver.startActivity("appPackage","com.example.android.apis", null, null);
```

```javascript
// javascript
driver.startActivity({appPackage: 'com.example.android.apis', appActivity: '.Foo'}, cb);
```

```python
# python
driver.start_activity('com.example.android.apis', '.Foo')
```

```ruby
# ruby
start_activity app_package: 'io.appium.android.apis', app_activity: '.accessibility.AccessibilityNodeProviderActivity'
```

```csharp
// c#
driver.StartActivity("com.example.android.apis", ".Foo");
```

### Open Notifications

Open the notification shade *Android only*

```java
// java
driver.openNotifications();
```

```javascript
// javascript
driver.openNotifications(cb);
```

```python
# python
driver.open_notifications()
```

```ruby
# ruby
open_notifications
```

```csharp
// c#
driver.OpenNotifications();
```

### Is installed

Check if an app is installed

```ruby
# ruby
is_installed? "com.example.android.apis"
```

```python
# python
driver.is_app_installed('com.example.android.apis')
```

```java
// java
driver.isAppInstalled("com.example.android.apis")
```

```javascript
// javascript
driver.isAppInstalled("com.example.android.apis")
  .then(function (isAppInstalled) { /*...*/ })
```

```csharp
// c#
driver.IsAppInstalled("com.example.android.apis-");
```

### Install App

Install an app to the device.

```ruby
# ruby
install 'path/to/my.apk'
```

```python
# python
driver.install_app('path/to/my.apk')
```

```java
// java
driver.installApp("path/to/my.apk")
```

```javascript
// javascript
driver.installApp("path/to/my.apk")
```

```csharp
// c#
driver.InstallApp("path/to/my.apk");
```

### Remove App

Remove an app from the device.

```ruby
# ruby
remove 'com.example.android.apis'
```

```python
# python
driver.remove_app('com.example.android.apis')
```

```java
// java
driver.removeApp("com.example.android.apis")
```

```javascript
// javascript
driver.removeApp("com.example.android.apis")
```

```csharp
// c#
driver.RemoveApp("com.example.android.apis");
```

### Shake

Simulate the device shaking.

```ruby
# ruby
shake
```

```python
# python
driver.shake()
```

```java
// java
driver.shake()
```

```javascript
// javascript
driver.shake()
```

```csharp
// c#
driver.ShakeDevice();
```

### Close app

Close the app

```ruby
# ruby
close_app
```

```python
# python
driver.close_app();
```

```java
// java
driver.closeApp()
```

```javascript
// javascript
driver.closeApp()
```

```csharp
// c#
driver.CloseApp();
```

### Launch

Launch the session for the desired capabilities. Note that this is the
companion to the autoLaunch=false capability. This is not for launching
arbitrary apps/activities---for that use `start_activity`. This is for
continuing the initialization ("launch") process if you have used
autoLaunch=false.

```ruby
# ruby
launch_app
```

```python
# python
driver.launch_app()
```

```java
// java
driver.launchApp()
```

```javascript
// javascript
driver.launchApp()
```

```csharp
// c#
driver.LaunchApp();
```

### Reset

Reset the app.

```ruby
# ruby
driver.reset
```

```python
# python
driver.reset()
```

```java
// java
driver.resetApp()
```

```javascript
// javascript
driver.resetApp()
```

```csharp
// c#
driver.ResetApp();
```

### Available Contexts

List all available contexts

```ruby
# ruby
context_array = available_contexts
```

```python
# python
driver.contexts
```

```java
// java
driver.getContextHandles()
```

```javascript
// javascript
driver.contexts().then(function (contexts) { /*...*/ })
```

```csharp
// c#
driver.GetContexts()
```

### Current context

List the current context


```ruby
# ruby
context = current_context
```

```python
# python
driver.current_context
```

```java
// java
driver.getContext()
```

```javascript
// javascript
driver.currentContext().then(function (context) { /*...*/ })
```

```csharp
// c#
driver.GetContext()
```

### Switch to default context

Change the context to the default.

```ruby
# ruby
switch_to_default_context
```

```python
# python
driver.switch_to.context(None)
```

```java
// java
driver.context();
```

```javascript
// javascript
driver.context()
```

```csharp
// c#
driver.SetContext();
```

### App Strings

Get the app's strings.

```ruby
# ruby
app_strings
```

```python
# python
driver.app_strings
```

```java
// java
driver.getAppStrings();
```

```javascript
// javascript
driver.getAppStrings().then(function (appStrings) { /*...*/ })
```

```csharp
// c#
driver.GetAppStrings();
```

### Key Event

Send a key event to the device.

```ruby
# ruby
key_event 176
```

```python
# python
driver.keyevent(176)
```

```java
// java
driver.sendKeyEvent(AndroidKeyCode.HOME);
```

```javascript
// javascript
driver.deviceKeyEvent(wd.SPECIAL_KEYS.Home)
```

```csharp
// c#
driver.KeyEvent("176");
```

### Current Activity

Android only. Get the current activity.

```ruby
# ruby
current_activity
```

```python
# python
driver.current_activity
```

```java
// java
driver.currentActivity();
```

```javascript
// javascript
driver.getCurrentActivity().then(function (activity) { /*...*/ })
```

```csharp
// c#
driver.GetCurrentActivity();
```

### Current Package

Android only. Get the current package.

```ruby
# ruby
current_package
```

```python
# python
driver.current_package
```

```java
// java
driver.getCurrentPackage();
```

```javascript
// javascript
driver.getCurrentPackage().then(function (package) { /*...*/ })
```

```csharp
// c#
driver.GetCurrentPackage();
```

### TouchAction / MultiTouchAction

An API for generating touch actions. This section of the documentation will be
expanded upon soon.

```ruby
# ruby
touch_action = Appium::TouchAction.new
element  = find_element :accessibility_id, 'Buttons, Various uses of UIButton'
touch_action.press(element: element, x: 10, y: 10).perform
```

```python
# python
action = TouchAction(driver)
action.press(element=el, x=10, y=10).release().perform()
```

```java
// java
TouchAction action = new TouchAction(driver)
.press(mapview, 10, 10)
.release().
perform();
```

```javascript
// javascript
var action = new wd.TouchAction(driver);
action
  .tap({el: el, x: 10, y: 10})
  .release();
return action.perform(); // returns a promise
```

```csharp
// c#
ITouchAction action = new TouchAction(driver);
action.Press(el, 10, 10).Release();
action.Perform ();
```

### Swipe

Simulate a user swipe.

```ruby
# ruby
swipe start_x: 75, start_y: 500, end_x: 75, end_y: 0, duration: 0.8
```

```python
# python
driver.swipe(start_x=75, start_y=500, end_x=75, end_y=0, duration=800)
```

```java
// java
driver.swipe(75, 500, 75, 0, 0.8)
```

```javascript
// javascript
function swipe(opts) {
  var action = new wd.TouchAction(this);
  action
    .press({x: opts.startX, y: opts.startY})
    .wait(opts.duration)
    .moveTo({x: opts.endX, y: opts.endY})
    .release();
  return action.perform();
}
wd.addPromiseChainMethod('swipe', swipe);
// ...
return driver.swipe({ startX: 75, startY: 500,
  endX: 75,  endY: 0, duration: 800 });
```

```csharp
// c#
todo: c#
```

### Pinch

Pinch the screen.

```ruby
# ruby
pinch 75
```

```python
# python
driver.pinch(element=el)
```

```java
// java
driver.pinch(element);
```

```javascript
// javascript
function pinch(el) {
  return Q.all([
    el.getSize(),
    el.getLocation(),
  ]).then(function(res) {
    var size = res[0];
    var loc = res[1];
    var center = {
      x: loc.x + size.width / 2,
      y: loc.y + size.height / 2
    };
    var a1 = new wd.TouchAction(this);
    a1.press({el: el, x: center.x, y:center.y - 100}).moveTo({el: el}).release();
    var a2 = new wd.TouchAction(this);
    a2.press({el: el, x: center.x, y: center.y + 100}).moveTo({el: el}).release();
    var m = new wd.MultiAction(this);
    m.add(a1, a2);
    return m.perform();
  }.bind(this));
};
wd.addPromiseChainMethod('pinch', pinch);
wd.addElementPromiseChainMethod('pinch', function() {
  return this.browser.pinch(this);
});
// ...
return driver.pinch(el);
// ...
return el.pinch();
```

```csharp
// c#
driver.Pinch(25, 25)
```

### Zoom

Zoom the screen.

```ruby
# ruby
zoom 200
```

```python
# python
driver.zoom(element=el)
```

```java
// java
driver.zoom(element);
```

```javascript
// javascript
function zoom(el) {
  return Q.all([
    this.getWindowSize(),
    this.getLocation(el),
  ]).then(function(res) {
    var size = res[0];
    var loc = res[1];
    var center = {
      x: loc.x + size.width / 2,
      y: loc.y + size.height / 2
    };
    var a1 = new wd.TouchAction(this);
    a1.press({el: el}).moveTo({el: el, x: center.x, y: center.y - 100}).release();
    var a2 = new wd.TouchAction(this);
    a2.press({el: el}).moveTo({el: el, x: center.x, y: center.y + 100}).release();
    var m = new wd.MultiAction(this);
    m.add(a1, a2);
    return m.perform();
  }.bind(this));
};
wd.addPromiseChainMethod('zoom', zoom);
wd.addElementPromiseChainMethod('zoom', function() {
  return this.browser.zoom(this);
});
// ...
return driver.zoom(el);
// ...
return el.zoom();
```

```csharp
// c#
driver.Zoom(100, 200);
```

### Scroll To

Scroll to an element.

```ruby
# ruby
element = find_element :accessibility_id, "Element ID"
execute_script "mobile: scroll", direction: "down", element: element.ref
```

```python
# python
driver.execute_script("mobile: scroll", {"direction": "down", "element": element.id})
```

```java
// java
JavascriptExecutor js = (JavascriptExecutor) driver;
HashMap<String, String> scrollObject = new HashMap<String, String>();
scrollObject.put("direction", "down");
scrollObject.put("element", ((RemoteWebElement) element).getId());
js.executeScript("mobile: scroll", scrollObject);
```

```javascript
// javascript
return driver.elementByAccessibilityId().then(function (el) {
  driver.execute("mobile: scroll", [{direction: "down", element: el.value}]);
});
```

```csharp
// c#
Dictionary<string, string> scrollObject = new Dictionary<string, string>();
scrollObject.Add("direction", "down");
scrollObject.Add("element", <element_id>);
((IJavaScriptExecutor)driver).ExecuteScript("mobile: scroll", scrollObject));
```

### Pull file

Pulls a file from the device.

```ruby
# ruby
pull_file 'Library/AddressBook/AddressBook.sqlitedb'
```

```python
# python
driver.pull_file('Library/AddressBook/AddressBook.sqlitedb')
```

```java
// java
driver.pullFile("Library/AddressBook/AddressBook.sqlitedb");
```

```javascript
// javascript
driver.pullFile("Library/AddressBook/AddressBook.sqlitedb")
  .then(function (base64File) { /*...*/ })
```

```csharp
// c#
driver.PullFile("Library/AddressBook/AddressBook.sqlitedb");
```

### Push File

Pushes a file to the device.

```ruby
# ruby
data = "some data for the file"
path = "/data/local/tmp/file.txt"
push_file path, data
```

```python
# python
data = "some data for the file"
path = "/data/local/tmp/file.txt"
driver.push_file(path, data.encode('base64'))
```

```java
// java
byte[] data = Base64.encodeBase64("some data for the file".getBytes());
String path = "/data/local/tmp/file.txt";
driver.pushFile(path, data)
```

```javascript
// javascript
driver.pushFile(path, data)
```

```csharp
// c#
driver.PushFile("/data/local/tmp/file.txt", "some data for the file");
```

### Settings

Here you will find sample code for getting/setting appium serverSetting.
For more information on how they work, and which settings are supported, see
[the settings docs](/docs/en/advanced-concepts/settings.md).

```ruby
# ruby
current_settings = get_settings
update_settings someSetting: true
```

```python
# python
current_settings = driver.get_settings()
driver.update_settings({"someSetting": true})
```

```java
// java
JsonObject settings = driver.getSettings()
// java-client doesn't support setting arbitrary settings, just settings which are already provided by appium.
// So for the 'ignoreUnimportantViews' setting, the following method exists:
driver.ignoreUnimportantViews(true);
```

```javascript
// javascript
var settings = driver.settings();
browser.updateSettings({'someSetting': true});
```

```csharp
// c#
Dictionary<String, Object>settings = driver.GetSettings();
// dotnet-driver doesn't support setting arbitrary settings, just settings which are already provided by appium.
// So for the 'ignoreUnimportantViews' setting, the following method exists:
driver.IgnoreUnimportantViews(true);
```

### Appium Desktop Apps

Appium's desktop app supports OS X, Windows and Linux.

- [Appium Desktop](https://www.github.com/appium/appium-desktop/releases/latest)
