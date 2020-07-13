
# 是否已安装应用程序

检查设备上是否安装了指定的应用程序

## 示例用法

```java
// Java
driver.isAppInstalled("com.example.AppName");

```

```python
# Python
self.driver.is_app_installed('com.example.AppName');

```

```javascript
// Javascript
// webdriver.io示例
driver.isAppInstalled('com.example.AppName')

// wd示例
await driver.isAppInstalledOnDevice('com.example.AppName');

```

```ruby
# Ruby
# ruby_lib示例
app_installed?('com.example.AppName')

# ruby_lib_core示例
@driver.app_installed?('com.example.AppName')

```

```php
# PHP
$driver->isAppInstalled('com.example.AppName')

```

```csharp
// C#
// TODO C# 示例

```


## 描述

使用XCUITest的iOS测试也可以使用`mobile: isAppInstalled` 方法. 详见[文档](/docs/cn/writing-running-appium/ios/ios-xctest-mobile-apps-management.md#mobile-isappinstalled).


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
|[Java](https://github.com/appium/java-client/releases/latest)| All | [appium.github.io](https://appium.github.io/java-client/io/appium/java_client/InteractsWithApps.html#isAppInstalled-java.lang.String-) |
|[Python](https://github.com/appium/python-client/releases/latest)| All | [github.com](https://github.com/appium/python-client/blob/master/README.md#checking-if-an-application-is-installed) |
|[Javascript (WebdriverIO)](http://webdriver.io/index.html)| All |  |
|[Javascript (WD)](https://github.com/admc/wd/releases/latest)| All | [github.com](https://github.com/admc/wd/blob/master/lib/commands.js#L2586) |
|[Ruby](https://github.com/appium/ruby_lib/releases/latest)| All | [www.rubydoc.info](https://www.rubydoc.info/github/appium/ruby_lib_core/Appium/Core/Device#app_installed%3F-instance_method) |
|[PHP](https://github.com/appium/php-client/releases/latest)| All | [github.com](https://github.com/appium/php-client/) |
|[C#](https://github.com/appium/appium-dotnet-driver/releases/latest)| All | [github.com](https://github.com/appium/appium-dotnet-driver/) |


## HTTP API 规范


### 终端

`POST /wd/hub/session/:session_id/appium/device/app_installed`


### URL参数

|名称|描述|
|----|-----------|
|session_id|将指令发往的会话（session）ID|


### JSON参数

|名称|类型|描述|
|----|----|-----------|
| bundleId | `string` | iOS bundleID或Android包名 |


### 响应

如果已安装，则返回true；否则，则返回false（`boolean`）

## 参考

* [JSONWP 规范](https://github.com/appium/appium-base-driver/blob/master/lib/protocol/routes.js#L464)

---
EOF.

本文由 [zhangfeng](https://github.com/zhangfeng91)翻译，Last english version: a11f693bbe2bcf2e47fa6a40872a7580ab45d6bb, 6 Jun 2020
