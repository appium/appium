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
todo: javascript
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
todo: javascript
```

```php
$this->backgroundApp(5);
```

```csharp
driver.BackgroundApp(5);
```

## Hide Keyboard (iOS only)

Hide the keyboard on iOS

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
todo: javascript
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
todo: javascript
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
todo: javascript
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
todo: javascript
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
todo: javascript
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
todo: javascript
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
todo: javascript
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
todo: javascript
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
todo: javascript
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
todo: javascript
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
todo: javascript
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
todo: javascript
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
todo: javascript
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
todo: javascript
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
todo: javascript
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
var touchAction1 = new TouchActions(this);
touchAction1.Down(10, 10).Up(10, 10);

var multiTouchAction = new MultiTouchAction(this);
multiTouchAction.Add(touchAction1);

PerformMultiTouchAction(multiTouchAction);
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
todo: javascript
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
todo: javascript
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
todo: javascript
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
todo: javascript
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
todo: javascript
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
