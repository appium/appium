# 获取当前的包名

得到当前的Android应用的包名

## 使用样例

```java
// Java
String package = driver.getCurrentPackage();

```

```python
# Python
package = self.driver.current_package;

```

```javascript
// Javascript
// webdriver.io example
let package = driver.getCurrentPackage();

// wd example
let package = await driver.getCurrentPackage();

```

```ruby
# Ruby
# ruby_lib example
current_package

# ruby_lib_core example
@driver.current_package

```

```php
# PHP
// TODO PHP sample

```

```csharp
// C#
string package = driver.CurrentPackage;

```

## 支持

### Appium Server

|平台|Driver|平台版本| Appium版本 |Driver版本|
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
|[Java](https://github.com/appium/java-client/releases/latest)| All | [appium.github.io](https://appium.github.io/java-client/io/appium/java_client/android/StartsActivity.html#getCurrentPackage--) |
|[Python](https://github.com/appium/python-client/releases/latest)| All | [appium.github.io](https://appium.github.io/python-client-sphinx/webdriver.extensions.android.html#webdriver.extensions.android.common.Common.current_package) |
|[Javascript (WebdriverIO)](http://webdriver.io/index.html)| None |  |
|[Javascript (WD)](https://github.com/admc/wd/releases/latest)| All | [github.com](https://github.com/admc/wd/blob/master/lib/commands.js#L2526) |
|[Ruby](https://github.com/appium/ruby_lib/releases/latest)| All | [www.rubydoc.info](https://www.rubydoc.info/github/appium/ruby_lib_core/Appium/Core/Device#current_package-instance_method) |
|[PHP](https://github.com/appium/php-client/releases/latest)| All | [github.com](https://github.com/appium/php-client/) |
|[C#](https://github.com/appium/appium-dotnet-driver/releases/latest)| All | [github.com](https://github.com/appium/appium-dotnet-driver/blob/master/src/Appium.Net/Appium/Android/AndroidDriver.cs) |

## HTTP API 规范

### 终端

`GET /session/:session_id/appium/device/current_package`

### URL参数

|名称|描述|
|----|-----------|
|session_id|将指令发往的会话（session）的ID|

### JSON参数

None

### 响应

当前 应用的[包](https://developer.android.com/reference/java/lang/Package.html)名(`string`)

## 参考

* [JSONWP Specification](https://github.com/appium/appium-base-driver/blob/master/lib/protocol/routes.js#L432)



本文由 [KangarooChen](https://github.com/KangarooChen) 翻译，Last english version: a11f693bbe2bcf2e47fa6a40872a7580ab45d6bb, 6 Jun 2020