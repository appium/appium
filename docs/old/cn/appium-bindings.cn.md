# Appium 客户端库

Appium 有以下语言的库:

语言 | 代码
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

注意有些方法，比如 `endTestCoverage()` 和 `complexFind()` 目前还没有什么用。
只有[这个问题](https://github.com/appium/appium/issues/2448)修复， 完整的覆盖率支持才会添加。
一旦[这个问题](https://github.com/appium/appium/issues/2264)修复，`complexFind()` 将被移除。
如果你一定想要用这些方法，请查看相应的文档。

## 锁定

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
todo: javascript
```

```php
todo: php
```

```csharp
// csharp
driver.LockDevice(3);
```

## 将 app 置于后台

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
todo: javascript
```

```php
todo: php
```

```csharp
// csharp
driver.BackgroundApp(5);
```

## 收起键盘(iOS only)

在 iOS 上收起键盘

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
todo: javascript
```

```php
todo: php
```

```csharp
// csharp
driver.HideKeyboard("Done");
```

## 是否已经安装

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
todo: javascript
```

```php
todo: php
```

```csharp
// csharp
driver.IsAppInstalled("com.example.android.apis-");
```

## 安装应用

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
todo: javascript
```

```php
todo: php
```

```csharp
//csharp
driver.InstallApp("path/to/my.apk");
```

## 删除应用

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
todo: javascript
```

```php
todo: php
```

```csharp
// csharp
driver.RemoveApp("com.example.android.apis");
```

## 摇晃

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
todo: javascript
```

```php
todo: php
```

```csharp
// csharp
driver.ShakeDevice();
```

## 关闭应用

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
todo: javascript
```

```php
todo: php
```

```csharp
// csharp
driver.CloseApp();
```

## 启动

启动应用

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
todo: javascript
```

```php
todo: php
```

```csharp
// csharp
driver.LaunchApp();
```

## 重置

应用重置

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
todo: javascript
```

```php
todo: php
```

```csharp
// csharp
driver.ResetApp();
```

## 可用上下文

列出所有的可用上下文

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
todo: javascript
```

```php
todo: php
```

```csharp
// csharp
driver.GetContexts()
```

## 当前上下文

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
todo: javascript
```

```php
todo: php
```

```csharp
// csharp
driver.GetContext()
```

## 切换到默认的上下文

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
todo: javascript
```

```php
todo: php
```

```csharp
// csharp
driver.SetContext();
```

## 应用的字符串

iOS 里是 Localizable.strings
Android 里是 strings.xml


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
driver.getAppString();
```

```javascript
todo: javascript
```

```php
todo: php
```

```csharp
// csharp
driver.GetAppStrings();
```

## 按键事件

发送一个按键事件给设备

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
todo: javascript
```

```php
todo: php
```

```csharp
// csharp
driver.KeyEvent("176");
```

## 当前 Activity

Android only
得到当前 activity。

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
todo: javascript
```

```php
todo: php
```

```csharp
// csharp
driver.GetCurrentActivity();
```

## 触摸动作 / 多点触摸动作

An API for generating touch actions. This section of the documentation will be
expanded upon soon.

生成触摸动作的接口。这部分文档很快将会补充更多的内容进来。

```ruby
# ruby
touch_action = Appium::TouchAction.new
element  = find_element :name, 'Buttons, Various uses of UIButton'
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
todo: javascript
```

```php
todo: php
```

```csharp
// csharp
var touchAction1 = new TouchActions(this);
touchAction1.Down(10, 10).Up(10, 10);

var multiTouchAction = new MultiTouchAction(this);
multiTouchAction.Add(touchAction1);

PerformMultiTouchAction(multiTouchAction);
```

## 滑动

模拟用户滑动

```ruby
# ruby
swipe start_x: 75, start_y: 500, end_x: 75, end_y: 0, duration: 0.8
```

```python
# python
driver.swipe(75, 500, 75, 0, 0.8)
```

```java
// java
driver.swipe(startx=75, starty=500, endx=75, endy=0, duration=800)
```

```javascript
todo: javascript
```

```php
todo: php
```

```csharp
todo: c#
```

## Pinch

Places two fingers at the edges of the screen and brings them together.
在 0% 到 100% 内双指缩放屏幕，

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
todo: javascript
```

```php
todo: php
```

```csharp
// csharp
driver.Pinch(25, 25)
```

## Zoom

放大屏幕
在 100% 以上放大屏幕

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
todo: javascript
```

```php
todo: php
```

```csharp
# csharp
driver.Zoom(100, 200);
```

## 拉出文件

从设备中拉出文件

```ruby
# ruby
pull_file 'Library/AddressBook/AddressBook.sqlitedb'
```

```python
// python
driver.pull_file('Library/AddressBook/AddressBook.sqlitedb')
```

```java
// java
driver.pullFile("Library/AddressBook/AddressBook.sqlitedb");
```

```javascript
todo: javascript
```

```php
todo: php
```

```csharp
// csharp
driver.PullFile("Library/AddressBook/AddressBook.sqlitedb");
```

## 推送文件

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
todo: javascript
```

```php
todo: php
```

```csharp
// csharp
driver.PushFile("/data/local/tmp/file.txt", "some data for the file");
```

## Appium 桌面应用

Appium 的桌面应用支持 OS X 和 Windows.

- [Appium.app for OS X][bitbucket]
- [Appium.exe for Windows][bitbucket]

[bitbucket]: https://bitbucket.org/appium/appium.app/downloads/
