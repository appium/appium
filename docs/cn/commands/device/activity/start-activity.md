# 启动Activity

通过提供package名和Activity名来启动一个Android Activity
## 使用样例

```java
// Java
driver.startActivity(new Activity("com.example", "ActivityName"));

```

```python
# Python
self.driver.start_activity("com.example", "ActivityName");

```

```javascript
// Javascript
// webdriver.io example
driver.startActivity("com.example", "ActivityName");

// wd example
await driver.startActivity({
  appPackage: "com.example",
  appActivity: "ActivityName"
});

```

```ruby
# Ruby
# ruby_lib example
start_activity app_package: "com.example", app_activity: "ActivityName"

# ruby_lib_core example
@driver.start_activity app_package: "com.example", app_activity: "ActivityName"

```

```php
# PHP
$driver->startActivity(array('appPackage' => 'com.example',
                             'appActivity' => 'ActivityName'));

```

```csharp
// C#
driver.StartActivity("com.example", "ActivityName");

```

## 支持

### Appium Server

|平台|Driver|平台版本|Appium版本|Driver版本|
|--------|----------------|------|--------------|--------------|
| iOS | [XCUITest](/docs/en/drivers/ios-xcuitest.md) | None | None | None |
|  | [UIAutomation](/docs/en/drivers/ios-uiautomation.md) | None | None | None |
| Android | [Espresso](/docs/en/drivers/android-espresso.md) | ?+ | 1.9.0+ | All |
|  | [UiAutomator2](/docs/en/drivers/android-uiautomator2.md) | ?+ | 1.6.0+ | All |
|  | [UiAutomator](/docs/en/drivers/android-uiautomator.md) | 4.3+ | All | All |
| Mac | [Mac](/docs/en/drivers/mac.md) | None | None | None |
| Windows | [Windows](/docs/en/drivers/windows.md) | None | None | None |

### Appium客户端

|语言|支持版本|文档|
|--------|-------|-------------|
|[Java](https://github.com/appium/java-client/releases/latest)| All | [appium.github.io](https://appium.github.io/java-client/io/appium/java_client/android/AndroidMobileCommandHelper.html#startActivityCommand-java.lang.String-java.lang.String-java.lang.String-java.lang.String-java.lang.String-java.lang.String-java.lang.String-java.lang.String-boolean-) |
|[Python](https://github.com/appium/python-client/releases/latest)| All | [appium.github.io](https://appium.github.io/python-client-sphinx/webdriver.extensions.android.html#webdriver.extensions.android.activities.Activities.start_activity) |
|[Javascript (WebdriverIO)](http://webdriver.io/index.html)| All |  |
|[Javascript (WD)](https://github.com/admc/wd/releases/latest)| All | [github.com](https://github.com/admc/wd/blob/master/lib/commands.js#L2948) |
|[Ruby](https://github.com/appium/ruby_lib/releases/latest)| All | [www.rubydoc.info](https://www.rubydoc.info/github/appium/ruby_lib_core/Appium/Core/Android/Device#start_activity-instance_method) |
|[PHP](https://github.com/appium/php-client/releases/latest)| All | [github.com](https://github.com/appium/php-client/) |
|[C#](https://github.com/appium/appium-dotnet-driver/releases/latest)| All | [github.com](https://github.com/appium/appium-dotnet-driver/blob/master/src/Appium.Net/Appium/Android/AndroidDriver.cs) |



## HTTP API 规范

### 终端

`POST /session/:session_id/appium/device/start_activity`

### URL参数

|名称|描述|
|----|-----------|
|session_id|将指令发往的会话（session）的ID|

### JSON参数

|name|类型|描述|
|----|----|-----------|
| appPackage | `string` | [包](https://developer.android.com/reference/java/lang/Package.html)名 |
| appActivity | `string` | [Activity](https://developer.android.com/reference/android/app/Activity.html)名 |
| appWaitPackage | `string` | 在这个参数指定的包启动后，自动化才会开始 |
| intentAction | `string` | 启动活动时使用的[action](https://developer.android.com/reference/android/content/Intent.html) |
| intentCategory | `string` | 启动活动时使用的Category |
| intentFlags | `string` | 启动活动时使用的标记 |
| optionalIntentArguments | `string` | 启动活动时使用的附加参数 |
| dontStopAppOnReset | `boolean` | 重置活动时是否需要杀掉App |

### 响应

null

## 参考

* [JSONWP Specification](https://github.com/appium/appium-base-driver/blob/master/lib/protocol/routes.js#L525)



本文由 [KangarooChen](https://github.com/KangarooChen) 翻译，Last english version: a11f693bbe2bcf2e47fa6a40872a7580ab45d6bb, 6 Jun 2020
