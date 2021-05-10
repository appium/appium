## Appium 客户端类库

Appium 支持以下语言的客户端类库：

|语言 | 源码|
|:---|---:|
| [Ruby][rubygems]              | [GitHub](https://github.com/appium/ruby_lib) |
| [Python][pypi]                | [GitHub](https://github.com/appium/python-client) |
| [Java][maven]                 | [GitHub](https://github.com/appium/java-client) |
| [JavaScript][npm]             | [GitHub](https://github.com/admc/wd) |
| [C#][nuget]                   | [GitHub](https://github.com/appium/appium-dotnet-driver) |
| [Objective-C][cocoapods]      | [GitHub](https://github.com/appium/selenium-objective-c) |

[rubygems]:       http://rubygems.org/gems/appium_lib
[pypi]:           https://pypi.python.org/pypi/Appium-Python-Client
[maven]:          https://search.maven.org/#search%7Cgav%7C1%7Cg%3A%22io.appium%22%20AND%20a%3A%22java-client%22
[npm]:            https://www.npmjs.org/package/wd
[nuget]:          https://www.nuget.org/packages/Appium.WebDriver/
[cocoapods]:      https://github.com/appium/selenium-objective-c


注意，一些方法类似 `endTestCoverage()` 目前并不能完全支持。当[这个问题](https://github.com/appium/appium/issues/2448)被解决后，覆盖率支持才会被添加。如果你仍然想使用这些方法，请参考 GitHub 上关于 bindings 的文档。

### 锁定

锁定屏幕。

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

### 将应用切换至后台

将当前的应用切换到后台，然后可以让其在指定时间内回到前台，或者让它一直留在后台。

传递给这个方法的参数有两种类型：

1. 一个整型（秒）：表示后台状态维持多久。-1 表示持续置于后台。这种风格的参数已经被废弃。
2. 一个看起来像 `{"timeout": secs}` 的对象。里面的 `secs` 是含义和第一个类型一样的整型数字（即表示置于后台多少秒），或者为 `null` （表示持续置于后台）。

```ruby
# ruby
background_app 5  # 置于后台，持续5秒
background_app -1  # 持续置于后台
```

```python
# python
driver.background_app(5)  # 置于后台，持续5秒
driver.background_app(-1) # 持续置于后台
driver.background_app({'timeout': None}) # 持续置于后台
```

```java
// java
driver.runAppInBackground(5);  // 置于后台，持续5秒
driver.runAppInBackground(-1);  // 持续置于后台
```

```javascript
// javascript
driver.backgroundApp(5);  // 置于后台，持续5秒
driver.backgroundApp(-1); // 持续置于后台
driver.backgroundApp({timeout: null}); // 持续置于后台
```

```csharp
// c#
driver.BackgroundApp(5);
driver.BackgroundApp(-1);
```

### 收起键盘

收起键盘。
*注意*: 在 iOS，这辅助功能并不能保证一定有效。因为没有用于隐藏键盘的自动化钩子方法（译者注：可以理解为 iOS 没有提供隐藏键盘的 API），而且应用是允许用户去使用各种策略去收起键盘的，无论是点击键盘以外的区域，还是向下滑动诸如此类...相比于使用该方法，我们更加鼓励你去思考 _用户_ 在应用中是如何收起键盘（如滑动，点击一个固定的坐标，等等...），并让 Appium 去执行这些方法，而不是调用这个 API 。话虽如此，但这里默认的行为还是可能帮助到你的。


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

### 启动 Activity

在当前 app 打开一个 activity，或者新打开一个应用并启动一个 acticity， *仅支持 Android*。

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

### 打开通知栏

打开通知栏，*仅支持 Android*。

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

### 应用是否已安装

检测应用是否已被安装。

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

### 安装应用

在设备上安装应用。

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


### 卸载应用

卸载设备上的应用。

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

### 摇一摇

模拟摇晃设备的操作。

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

### 关闭应用

关闭应用。

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

### 启动（Launch）

为 desired capabilities 启动一个 session。请注意只有设置了 autoLaunch=false 关键字时才会生效。这不是为了随意启动一个应用或 activities ——如果你想这么做，请使用 `start_activity` 这个 desired capability 的参数。这个方法的使用场景是在你设置了 autoLaunch=false 后，用来继续执行初始化（"launch"）流程的。（译者注：举个例子，国产系统经常会在应用安装时弹出提示窗阻碍安装，此时可以通过 autoLaunch=false 来让应用安装后先执行你的脚本来关掉弹窗，然后再用这个函数来继续启动应用。）

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

### 重置

重置应用。（译者注：类似于清除缓存）

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

### 可用的上下文（Contexts）

列出所有可用的上下文（contexts）。

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

### 当前上下文（context）

列出当前的上下文（context）。

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

### 切换至默认的上下文（context）

切换回默认的上下文（context）。（译者注：一般就是原生上下文 “NATIVE_APP”）

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

### 应用的字符串

获得应用的字符串。（译者注：这里实际指的是返回应用的多语言文本，即每个 string 变量及在指定语言上的显示内容。例如 `{"action_forgot_password":"Forgot your password?"}` 。在 android 上对应的是项目中的 `strings.xml` 多语言配置文件）

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

### 按键事件

给设备发送按键事件。

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

### 当前 Activity

获取当前的 Acticity。仅支持 Android。

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

### 当前包名（package）

获取当前包名（package）。仅支持 Android 。

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

### 点击操作 / 多点触控操作

用于生成点击操作的 API。这部分文档的内容将会很快被补充进来。


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

### 滑动屏幕

模拟用户滑动屏幕的操作。

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

### 捏（Pinch）手势

在屏幕上使用捏（Pinch）手势。

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

### 放大屏幕（Zoom）

在屏幕上使用放大手势。

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


### 滚动到

滚动到指定的元素。

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

### 拉取（pull）文件

从设备上拉取文件。

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

### 推送（push）文件

推送文件到设备。

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

### 设置

在这你会找到关于获取或设置 appium 服务器设置的示例代码。如果想了解工作原理，以及支持哪些设置，请查看[设置文档](/docs/en/advanced-concepts/settings.md)

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
// java 客户端不支持设置任意的设置项，只能设置 appium 当前支持的部分。
// 所以对于 `ignoreUnimportantViews`（译者注：忽略不重要的视图，即 android uiautomator 上的压缩后 xml ）这个设置项，对应存在下面这个设置方法：
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
// .net 客户端不支持设置任意的设置项，只能设置 appium 当前支持的部分。
// 所以对于 `ignoreUnimportantViews`（译者注：忽略不重要的视图，即 android uiautomator 上的压缩后 xml ）这个设置项，对应存在下面这个设置方法：
driver.IgnoreUnimportantViews(true);
```

### Appium 桌面应用

Appium 的桌面应用支持 OS X, Windows 及 Linux.

- [Appium Desktop](https://www.github.com/appium/appium-desktop/releases/latest)


本文由 [thanksdanny](https://github.com/thanksdanny) 翻译，由 [chenhengjie123](https://github.com/chenhengjie123) 校验。
