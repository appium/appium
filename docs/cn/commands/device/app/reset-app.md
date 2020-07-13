
# 重置应用

重置此会话的当前正在运行的应用

## 用法示例

```java
// Java
driver.resetApp();

```

```python
# Python
self.driver.reset()

```

```javascript
// Javascript
// webdriver.io示例
driver.reset();

// wd示例
await driver.resetApp();

```

```ruby
# Ruby
# ruby_lib示例
reset

# ruby_lib_core示例
@driver.reset

```

```php
# PHP
$driver->reset();

```

```csharp
// C#
// TODO C#示例

```



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
|[Java](https://github.com/appium/java-client/releases/latest)| All | [appium.github.io](https://appium.github.io/java-client/io/appium/java_client/InteractsWithApps.html#resetApp--) |
|[Python](https://github.com/appium/python-client/releases/latest)| All | [github.com](https://github.com/appium/python-client/blob/master/README.md#resetting-an-application) |
|[Javascript (WebdriverIO)](http://webdriver.io/index.html)| All |  |
|[Javascript (WD)](https://github.com/admc/wd/releases/latest)| All | [github.com](https://github.com/admc/wd/blob/master/lib/commands.js#L2827) |
|[Ruby](https://github.com/appium/ruby_lib/releases/latest)| All | [www.rubydoc.info](https://www.rubydoc.info/github/appium/ruby_lib_core/Appium/Core/Device#reset-instance_method) |
|[PHP](https://github.com/appium/php-client/releases/latest)| All | [github.com](https://github.com/appium/php-client/) |
|[C#](https://github.com/appium/appium-dotnet-driver/releases/latest)| All | [github.com](https://github.com/appium/appium-dotnet-driver/) |


## HTTP API规范


### 终端

`POST /session/:session_id/appium/app/reset`


### URL参数

|名称|描述|
|----|-----------|
|session_id|将指令发往的会话（session）ID|


### JSON参数

无


### 响应

null


## 参考

* [JSONWP规范](https://github.com/appium/appium-base-driver/blob/master/lib/protocol/routes.js#L545)

---
EOF.

本文由 [zhangfeng](https://github.com/zhangfeng91)翻译，Last english version: a11f693bbe2bcf2e47fa6a40872a7580ab45d6bb, 6 Jun 2020

