## Appium 客户端库

Appium 有对应以下语言的客户端库:

语言 | 代码
      :--|--:
[Ruby][rubygems]              | [GitHub](https://github.com/appium/ruby_lib)
[Python][pypi]                | [GitHub](https://github.com/appium/python-client)
[Java][maven]                 | [GitHub](https://github.com/appium/java-client)
[JavaScript][npm]             | [GitHub](https://github.com/admc/wd)
[PHP][php]                    | [GitHub](https://github.com/appium/php-client)
[C#][nuget]                   | [GitHub](https://github.com/appium/appium-dotnet-driver)
[Objective-C][cocoapods]      | [GitHub](https://github.com/appium/selenium-objective-c)


[rubygems]:       http://rubygems.org/gems/appium_lib
[pypi]:           https://pypi.python.org/pypi/Appium-Python-Client
[maven]:          https://search.maven.org/#search%7Cga%7C1%7Cg%3Aio.appium%20a%3Ajava-client
[npm]:            https://www.npmjs.org/package/wd
[php]:            https://github.com/appium/php-client
[nuget]:          http://www.nuget.org/packages/Appium.WebDriver/
[cocoapods]:      https://github.com/appium/selenium-objective-c

请注意：有些方法，比如 `endTestCoverage()` 目前不能提供完整支持。
只有[这个问题](https://github.com/appium/appium/issues/2448)修复， 完整的覆盖率支持才会被添加。
如果你一定要用这些方法，请先查看 Github 上关于 bindings 的文档。

### 锁定

锁定屏幕


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

```php
// php
$this->lock(3);
```

```csharp
// c#
driver.LockDevice(3);
```

```objectivec
// objective c
[driver lockDeviceScreen:3];
```

### 将 app 置于后台

把当前应用放到后台去

```ruby
# ruby
background_app 5
```

```python
# python
driver.background_app(5)
```

```java
// java
driver.runAppInBackground(5);
```

```javascript
// javascript
driver.backgroundApp(5)
```

```php
// php
$this->backgroundApp(5);
```

```csharp
// c#
driver.BackgroundApp(5);
```

```objectivec
// objective c
[driver runAppInBackground:3];
```
 
### 收起键盘

收起键盘

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

```php
// php
$this->hideKeyboard();
$this->hideKeyboard(array('strategy' => 'pressKey', 'key' => 'Done'));
```

```csharp
// c#
driver.HideKeyboard("Done");
```

```objectivec
// objective c
[driver hideKeyboard];
```

### 启动 Activity

在当前应用中打开一个 activity 或者启动一个新应用并打开一个 activity 。 *只能在 Android 上使用*

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

```php
// php
$this->startActivity(array("appPackage" => "com.example.android.apis",
                            "appActivity" => ".Foo"));
```

```objectivec
// objective c
[driver startActivity:@"com.example.android.apis" package:@".Foo"];
```

### 打开通知栏 (Notifications)

打开下拉通知栏 *只能在 Android 上使用*

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
openNotifications
```

```csharp
// c#
driver.OpenNotifications();
```

```php
// php
$this->openNotifications();
```

```objectivec
// objective c
[driver openNotifications];
```

### 是否已经安装

检查应用是否已经安装

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

```php
// php
$this->isAppInstalled('com.example.android.apis');
```

```csharp
// c#
driver.IsAppInstalled("com.example.android.apis-");
```

```objectivec
// objective c
[driver isAppInstalled:@"com.example.android.apis-"];
```

### 安装应用

安装应用到设备中去

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

```php
// php
$this->installApp('path/to/my.apk');
```

```csharp
// c#
driver.InstallApp("path/to/my.apk");
```

```objectivec
// objective c
[driver installAppAtPath:@"path/to/my.apk"];
```

### 删除应用

从设备中删除一个应用

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

```php
// php
$this->removeApp('com.example.android.apis');
```

```csharp
// c#
driver.RemoveApp("com.example.android.apis");
```

```objectivec
// objective c
[driver removeApp:@"com.example.android.apis"];
```

### 摇晃 (Shake)

模拟设备摇晃

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

```php
// php
$this->shake();
```

```csharp
// c#
driver.ShakeDevice();
```

```objectivec
// objective c
[driver shakeDevice];
```

### 关闭应用

关闭应用

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

```php
// php
$this->closeApp();
```

```csharp
// c#
driver.CloseApp();
```

```objectivec
// objective c
[driver closeApp];
```

### 启动 (Launch)

根据服务关键字 (desired capabilities) 启动会话 (session) 。请注意这必须在设定 `autoLaunch=false` 关键字时才能生效。这不是用于启动指定的 app/activities ————你可以使用 `start_activity` 做到这个效果————这是用来继续进行使用了 `autoLaunch=false` 关键字时的初始化 (Launch) 流程的。

```ruby
# ruby
launch
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

```php
// php
$this->launchApp();
```

```csharp
// c#
driver.LaunchApp();
```

```objectivec
// objective c
[driver launchApp];
```

### 重置 (Reset)

应用重置

 (翻译者注：相当于卸载重装应用) 

```ruby
# ruby
reset
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

```php
// php
$this->reset();
```

```csharp
// c#
driver.ResetApp();
```

```objectivec
// objective c
[driver resetApp];
```

### 可用上下文 (context)

列出所有的可用上下文

翻译备注：context可以理解为 可进入的窗口 。例如，对于原生应用，可用的context和默认context均为`NATIVE_APP`。详情可查看[对混合应用进行自动化测试](http://appium.io/slate/en/v1.3.4/?ruby#automating-hybrid-apps)

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

```php
// php
$this->contexts();
```

```csharp
// c#
driver.GetContexts()
```

```objectivec
// objective c
NSArray *contexts = driver.allContexts;
```

### 当前上下文 (context)

列出当前上下文

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

```php
// php
$this->context();
```

```csharp
// c#
driver.GetContext()
```

```objectivec
// objective c
NSString *context = driver.context;
```

### 切换到默认的上下文 (context)

将上下文切换到默认上下文

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

```php
// php
$this->context(NULL);
```

```csharp
// c#
driver.SetContext();
```

```objectivec
// objective c
[driver setContext:nil];
```

### 应用的字符串 (App Strings)

获取应用的字符串

```ruby
# ruby
strings = app_strings
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

```php
// php
$this->appStrings();
$this->appStrings('ru');
```

```csharp
// c#
driver.GetAppStrings();
```

```objectivec
// objective c
[driver appStrings];
[driver appStringsForLanguage:"@ru"];
```

### 按键事件 (Key Event)

给设备发送一个按键事件

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

```php
// php
$this->keyEvent('176');
```

```csharp
// c#
driver.KeyEvent("176");
```

```objectivec
// objective c
NSError *err;
[driver triggerKeyEvent:176 metastate:0 error:&err];
```

### 当前 Activity

获取当前 activity。只能在 Android 上使用

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

```php
// php
$this->currentActivity();
```

```csharp
// c#
driver.GetCurrentActivity();
```

```objectivec
// objective c
NSError *err;
[driver currentActivity];
```

### 触摸动作(TouchAction) / 多点触摸动作(MultiTouchAction)

生成触摸动作的接口。这部分文档很快将会补充更多的内容进来。

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

```php
// php
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
// c#
ITouchAction action = new TouchAction(driver);
action.Press(el, 10, 10).Release();
action.Perform ();
```

### 滑动(Swipe)

模拟用户滑动

```ruby
# ruby
swipe start_x: 75, start_y: 500, end_x: 75, end_y: 0, duration: 0.8
```

```python
# python
driver.swipe(start=75, starty=500, endx=75, endy=0, duration=800)
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

```php
// php
$this->swipe(75, 500, 75, 0, 800);
```

```csharp
// c#
todo: c#
```

### 捏 (Pinch) 

捏屏幕 (双指往内移动来缩小屏幕) 

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

```php
$this->pinch($el);
```

```csharp
// c#
driver.Pinch(25, 25)
```

### 放大 (Zoom) 

放大屏幕 (双指往外移动来放大屏幕) 

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

```php
// php
$this->zoom($el);
```

```csharp
// c#
driver.Zoom(100, 200);
```

### 滑动到 (Scroll To) 

滑动到某个元素。

```ruby
# ruby
element = find_element :accessibility_id, 'Element ID'
execute_script "mobile: scrollTo", :element => element.ref
```

```python
# python
todo: python
```

```java
// java
WebElement element = driver.findElementByAccessibilityId("Element ID");
HashMap<String, String> arguments = new HashMap<String, String>();
arguments.put("element", element.getId());
(JavascriptExecutor)driver.executeScript("mobile: scrollTo", arguments);
```

```javascript
// javascript
return driver.elementByAccessibilityId().then(function (el) {
  return driver.execute('mobile: scrollTo', {element: el.value});
});
```

```php
// php
$els = $this->elements($this->using('class name')->value('android.widget.TextView'));
$this->scroll($els[count($els) - 1], $els[0]);
```

```csharp
// c#
todo: csharp
```

### 拉出文件 (Pull File) 

从设备中拉出文件

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

```php
// php
$this->pullFile('Library/AddressBook/AddressBook.sqlitedb');
```

```csharp
// c#
driver.PullFile("Library/AddressBook/AddressBook.sqlitedb");
```

### 推送文件(Push file)

推送文件到设备中去

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

```php
// php
$path = 'data/local/tmp/test_push_file.txt';
$data = 'This is the contents of the file to push to the device.';
$this->pushFile($path, base64_encode($data));
```

```csharp
// c#
driver.PushFile("/data/local/tmp/file.txt", "some data for the file");
```

### 设置


从这里你可以获取/设置 appium 的服务器设置。
想知道它如何工作，以及它支持哪些设置，请查看[关于设置的文档](/docs/en/advanced-concepts/settings.cn.md)

```ruby
current_settings = get_settings
update_settings someSetting: true
```

```python
current_settings = driver.get_settings()
driver.update_settings({"someSetting": true})
```

```java
JsonObject settings = driver.getSettings()
// java-client doesn't support setting arbitrary settings, just settings which are already provided by appium.
// So for the 'ignoreUnimportantViews' setting, the following method exists:
driver.ignoreUnimportantViews(true);
```

```javascript
var settings = driver.settings();
browser.updateSettings({'someSetting': true});
```

```php
$settings = $this->getSettings();
$this->updateSettings(array('cyberdelia' => "open"));
```

```csharp
Dictionary<String, Object>settings = driver.GetSettings();
// dotnet-driver doesn't support setting arbitrary settings, just settings which are already provided by appium.
// So for the 'ignoreUnimportantViews' setting, the following method exists:
driver.IgnoreUnimportantViews(true);
```

### Appium 桌面应用

Appium 的桌面应用支持 OS X 和 Windows.

- [Appium.app for OS X][bitbucket]
- [Appium.exe for Windows][bitbucket]

[bitbucket]: https://bitbucket.org/appium/appium.app/downloads/
