
# 启动应用

在设备上启动被测应用

## 用法示例

```java
// Java
driver.launchApp();

```

```python
# Python
self.driver.launch_app()

```

```javascript
// Javascript
// webdriver.io example
driver.launchApp();

// wd example
await driver.launchApp();

```

```ruby
# Ruby
# ruby_lib example
launch_app

# ruby_lib_core example
@driver.launch_app

```

```php
# PHP
$driver->launchApp();

```

```csharp
// C#
// TODO C# sample

```


## 描述

如果被测应用（AUT）已关闭或在后台运行，它将启动它。如果AUT已打开，它将使其放到后台并重新启动。
使用XCUITest的iOS测试也可以使用“ mobile：launchApp”方法。详见[文档](/docs/cn/writing-running-appium/ios/ios-xctest-mobile-apps-management.md#mobile-launchapp).



## 支持


### Appium服务器

|平台|Driver|平台版本|Appium版本|Driver版本|
|--------|----------------|------|--------------|--------------|
| iOS | [XCUITest](/docs/en/drivers/ios-xcuitest.md) | 9.3+ | 1.6.0+ | All |
|  | [UIAutomation](/docs/en/drivers/ios-uiautomation.md) | 8.0 to 9.3 | All | All |
| Android | [Espresso](/docs/en/drivers/android-espresso.md) | ?+ | 1.9.0+ | All |
|  | [UiAutomator2](/docs/en/drivers/android-uiautomator2.md) | ?+ | 1.6.0+ | All |
|  | [UiAutomator](/docs/en/drivers/android-uiautomator.md) | 4.2+ | All | All |
| Mac | [Mac](/docs/en/drivers/mac.md) | None | None | None |
| Windows | [Windows](/docs/en/drivers/windows.md) | None | None | None |



### Appium客户端

|语言|支持|文档|
|--------|-------|-------------|
|[Java](https://github.com/appium/java-client/releases/latest)| All | [appium.github.io](https://appium.github.io/java-client/io/appium/java_client/InteractsWithApps.html#launchApp--) |
|[Python](https://github.com/appium/python-client/releases/latest)| All | [github.com](https://github.com/appium/python-client/blob/master/README.md#closing-and-launching-an-application) |
|[Javascript (WebdriverIO)](http://webdriver.io/index.html)| All |  |
|[Javascript (WD)](https://github.com/admc/wd/releases/latest)| All | [github.com](https://github.com/admc/wd/blob/master/lib/commands.js#L2798) |
|[Ruby](https://github.com/appium/ruby_lib/releases/latest)| All | [www.rubydoc.info](https://www.rubydoc.info/github/appium/ruby_lib_core/Appium/Core/Device#launch_app-instance_method) |
|[PHP](https://github.com/appium/php-client/releases/latest)| All | [github.com](https://github.com/appium/php-client/) |
|[C#](https://github.com/appium/appium-dotnet-driver/releases/latest)| All | [github.com](https://github.com/appium/appium-dotnet-driver/) |


## HTTP API规范


### 终端

`POST /session/:session_id/appium/app/launch`


### URL参数

|名称|描述|
|----|-----------|
|session_id|将指令发往的会话（session）ID|


### JSON参数

无


### 响应

null


## 参考

* [JSONWP 规范](https://github.com/appium/appium-base-driver/blob/master/lib/protocol/routes.js#L539)

---
EOF.

本文由 [zhangfeng](https://github.com/zhangfeng91)翻译，Last english version: a11f693bbe2bcf2e47fa6a40872a7580ab45d6bb, 6 Jun 2020
