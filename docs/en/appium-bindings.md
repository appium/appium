# Appium Client Libraries

Appium has libraries for:

Language | Source
      :--|--:
[Ruby][rubygems]  | [GitHub](https://github.com/appium/ruby_lib)
[Python][pypi]    | [GitHub](https://github.com/appium/python-client)
[Java][maven]     | [GitHub](https://github.com/appium/java-client)
[JavaScript][npm] | [GitHub](https://github.com/admc/wd)
[PHP][php]        | [GitHub](https://github.com/appium/php-client)
[C#][nuget]       | [GitHub](https://github.com/appium/appium-dotnet-driver)

[rubygems]: http://rubygems.org/gems/appium_lib
[pypi]:     https://pypi.python.org/pypi/Appium-Python-Client
[maven]:    https://search.maven.org/#search%7Cga%7C1%7Cg%3Aio.appium%20a%3Ajava-client
[npm]:      https://www.npmjs.org/package/wd
[php]:      https://github.com/appium/php-client
[nuget]:    http://www.nuget.org/packages/Appium.WebDriver/

Note that some methods such as `endTestCoverage()` and `complexFind()` are
not generally useful. Proper coverage support will be added once [this issue](https://github.com/appium/appium/issues/2448)
is resolved. `complexFind()` will be removed once [this issue](https://github.com/appium/appium/issues/2264)
is resolved. If you want to use them anyway, consult the documentation for the bindings on GitHub.

## Lock

Lock the screen.

```ruby
lock 5
```

```python
driver.lock(5)
```

```java
driver.lockScreen(3);
```

```javascript
driver.lock(3)
```

```php
$this->lock(3);
```

```csharp
driver.LockDevice(3);
```

## Background app

Send the currently active app to the background.

```ruby
background_app 5
```

```python
driver.background_app(5)
```

```java
driver.runAppInBackground(5);
```

```javascript
driver.backgroundApp(5)
```

```php
$this->backgroundApp(5);
```

```csharp
driver.BackgroundApp(5);
```

## Hide Keyboard

Hide the keyboard.

```ruby
hide_keyboard
```

```python
driver.hide_keyboard()
```

```java
driver.hideKeyboard();
```

```javascript
driver.hideKeyboard()
```

```php
$this->hideKeyboard();
$this->hideKeyboard(array('strategy' => 'pressKey', 'key' => 'Done'));
```

```csharp
driver.HideKeyboard("Done");
```

## Is installed

Check if an app is installed

```ruby
is_installed? "com.example.android.apis"
```

```python
driver.is_app_installed('com.example.android.apis')
```

```java
driver.isAppInstalled("com.example.android.apis")
```

```javascript
driver.isAppInstalled("com.example.android.apis")
  .then(function (isAppInstalled) { /*...*/ })
```

```php
$this->isAppInstalled('com.example.android.apis');
```

```csharp
driver.IsAppInstalled("com.example.android.apis-");
```

## Install App

Install an app to the device.

```ruby
install 'path/to/my.apk'
```

```python
driver.install_app('path/to/my.apk')
```

```java
driver.installApp("path/to/my.apk")
```

```javascript
driver.installApp("path/to/my.apk")
```

```php
$this->installApp('path/to/my.apk');
```

```csharp
driver.InstallApp("path/to/my.apk");
```

## Remove App

Remove an app from the device.

```ruby
remove 'com.example.android.apis'
```

```python
driver.remove_app('com.example.android.apis')
```

```java
driver.removeApp("com.example.android.apis")
```

```javascript
driver.removeApp("com.example.android.apis")
```

```php
$this->removeApp('com.example.android.apis');
```

```csharp
driver.RemoveApp("com.example.android.apis");
```

## Shake

Simulate the device shaking.

```ruby
shake
```

```python
driver.shake()
```

```java
driver.shake()
```

```javascript
driver.shake()
```

```php
$this->shake();
```

```csharp
driver.ShakeDevice();
```

## Close app

Close the app

```ruby
close_app
```

```python
driver.close_app();
```

```java
driver.closeApp()
```

```javascript
driver.closeApp()
```

```php
$this->closeApp();
```

```csharp
driver.CloseApp();
```

## Launch

Launch the app

```ruby
launch
```

```python
driver.launch_app()
```

```java
driver.launchApp()
```

```javascript
driver.launchApp()
```

```php
$this->launchApp();
```

```csharp
driver.LaunchApp();
```

## Reset

Reset the app.

```ruby
reset
```

```python
driver.reset()
```

```java
driver.resetApp()
```

```javascript
driver.resetApp()
```

```php
$this->reset();
```

```csharp
driver.ResetApp();
```

## Available Contexts

List all available contexts

```ruby
context_array = available_contexts
```

```python
driver.contexts
```

```java
driver.getContextHandles()
```

```javascript
driver.contexts().then(function (contexts) { /*...*/ })
```

```php
$this->contexts();
```

```csharp
driver.GetContexts()
```

## Current context

List the current context


```ruby
context = current_context
```

```python
driver.current_context
```

```java
driver.getContext()
```

```javascript
driver.currentContext().then(function (context) { /*...*/ })
```

```php
$this->context();
```

```csharp
driver.GetContext()
```

## Switch to default context

Change the context to the default.

```ruby
switch_to_default_context
```

```python
driver.switch_to.context(None)
```

```java
driver.context();
```

```javascript
driver.context()
```

```php
$this->context(NULL);
```

```csharp
driver.SetContext();
```

## App Strings

Get the app's strings.

```ruby
strings = app_strings
```

```python
driver.app_strings
```

```java
driver.getAppString();
```

```javascript
driver.getAppStrings().then(function (appStrings) { /*...*/ })
```

```php
$this->appStrings();
$this->appStrings('ru');
```

```csharp
driver.GetAppStrings();
```

## Key Event

Send a key event to the device.

```ruby
key_event 176
```

```python
driver.keyevent(176)
```

```java
driver.sendKeyEvent(AndroidKeyCode.HOME);
```

```javascript
driver.deviceKeyEvent(wd.SPECIAL_KEYS.Home)
```

```php
$this->keyEvent('176');
```

```csharp
driver.KeyEvent("176");
```

## Current Activity

Android only. Get the current activity.

```ruby
current_activity
```

```python
driver.current_activity
```

```java
driver.currentActivity();
```

```javascript
driver.getCurrentActivity().then(function (activity) { /*...*/ })
```

```php
$this->currentActivity();
```

```csharp
driver.GetCurrentActivity();
```

## TouchAction / MultiTouchAction

An API for generating touch actions. This section of the documentation will be
expanded upon soon.

```ruby
touch_action = Appium::TouchAction.new
element  = find_element :name, 'Buttons, Various uses of UIButton'
touch_action.press(element: element, x: 10, y: 10).perform
```

```python
action = TouchAction(driver)
action.press(element=el, x=10, y=10).release().perform()
```

```java
TouchAction action = new TouchAction(driver)
.press(mapview, 10, 10)
.release().
perform();
```

```javascript
var action = new wd.TouchAction(driver);
action
  .tap({el: el, x: 10, y: 10})
  .release();
return action.perform(); // returns a promise
```

```php
$action = $this->initiateTouchAction();
               ->press(array('element' => $el))
               ->release()
               ->perform();

$action1 = $this->initiateTouchAction();
$action1->press(array('element' => $els[0]))
        ->moveTo(array('x' => 10, 'y' => 0))
        ->moveTo(array('x' => 10, 'y' => -75))
        ->moveTo(array('x' => 10, 'y' => -600))
        ->release();

$action2 = $this->initiateTouchAction();
$action2->press(array('element' => $els[1]))
        ->moveTo(array('x' => 10, 'y' => 10))
        ->moveTo(array('x' => 10, 'y' => -300))
        ->moveTo(array('x' => 10, 'y' => -600))
        ->release();

$multiAction = $this->initiateMultiAction();
$multiAction->add($action1);
$multiAction->add($action2);
$multiAction->perform();
```

```csharp
ITouchAction action = new TouchAction(driver);
action.Press(el, 10, 10).Release();
action.Perform ();
```

## Swipe

Simulate a user swipe.

```ruby
swipe start_x: 75, start_y: 500, end_x: 75, end_y: 0, duration: 0.8
```

```python
driver.swipe(75, 500, 75, 0, 0.8)
```

```java
driver.swipe(startx=75, starty=500, endx=75, endy=0, duration=800)
```

```javascript
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

```php
$this->swipe(75, 500, 75, 0, 800);
```

```csharp
todo: c#
```

## Pinch

Pinch the screen.

```ruby
pinch 75
```

```python
driver.pinch(element=el)
```

```java
driver.pinch(element);
```

```javascript
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

```php
$this->pinch($el);
```

```csharp
driver.Pinch(25, 25)
```

## Zoom

Zoom the screen.

```ruby
zoom 200
```

```python
driver.zoom(element=el)
```

```java
driver.zoom(element);
```

```javascript
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

```php
$this->zoom($el);
```

```csharp
driver.Zoom(100, 200);
```

## Scroll To

Scroll to an element.

```ruby
element = find_element :name, 'Element Name'
execute_script "mobile: scrollTo", :element => element.ref
```

```python
todo: python
```

```java
WebElement element = driver.findElement(By.name("Element Name"));
HashMap<String, String> arguments = new HashMap<String, String>();
arguments.put("element", element.getId());
(JavascriptExecutor)driver.executeScript("mobile: scrollTo", arguments);
```

```javascript
todo: javascript
```

```php
$els = $this->elements($this->using('class name')->value('android.widget.TextView'));
$this->scroll($els[count($els) - 1], $els[0]);
```

```csharp
todo: csharp
```

## Pull file

Pulls a file from the device.

```ruby
pull_file 'Library/AddressBook/AddressBook.sqlitedb'
```

```python
driver.pull_file('Library/AddressBook/AddressBook.sqlitedb')
```

```java
driver.pullFile("Library/AddressBook/AddressBook.sqlitedb");
```

```javascript
driver.pullFile("Library/AddressBook/AddressBook.sqlitedb")
  .then(function (base64File) { /*...*/ })
```

```php
$this->pullFile('Library/AddressBook/AddressBook.sqlitedb');
```

```csharp
driver.PullFile("Library/AddressBook/AddressBook.sqlitedb");
```

## Push File

Pushes a file to the device.

```ruby
data = "some data for the file"
path = "/data/local/tmp/file.txt"
push_file path, data
```

```python
data = "some data for the file"
path = "/data/local/tmp/file.txt"
driver.push_file(path, data.encode('base64'))
```

```java
byte[] data = Base64.encodeBase64("some data for the file".getBytes());
String path = "/data/local/tmp/file.txt";
driver.pushFile(path, data)
```

```javascript
driver.pushFile(path, data)
```

```php
$path = 'data/local/tmp/test_push_file.txt';
$data = 'This is the contents of the file to push to the device.';
$this->pushFile($path, base64_encode($data));
```

```csharp
driver.PushFile("/data/local/tmp/file.txt", "some data for the file");
```

## Appium Desktop Apps

Appium's desktop app supports OS X and Windows.

- [Appium.app for OS X][bitbucket]
- [Appium.exe for Windows][bitbucket]

[bitbucket]: https://bitbucket.org/appium/appium.app/downloads/
