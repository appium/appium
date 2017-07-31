## Settings
Settings是appium引入的一个新概念。 它们目前不是Mobile JSON Wire协议或Webdriver规范的一部分。

Settings是用来指定appium server的工作方式。

Settings有以下特点:
 - 可变性，Settings在一个会话中是可以被修改的。
 - 临时性，Settings只对当前会话生效，新建立的会话会被重置。
 - 局限性，Settings只用来控制appium server，不能用于控制被测应用或设备。

以Android的`ignoreUnimportantViews`为例。Android中可以设置`ignoreUnimportantViews`用来忽略所有与当前视图无关的元素，这样可以让用例执行的更快。注意，当用户需要访问这些被忽略的元素时，需要禁用`ignoreUnimportantViews`后并重新启用。 

另外一个例子是Settings让appium忽略当前不可见的元素。

Settings通过下面的API实现：

**POST** /session/:sessionId/appium/settings

>Settings使用键值对(name:value)的JSON格式，name为setting的名字，value是setting的取值。
```
{
  settings: {
   ignoreUnimportantViews : true
  }
}
```

**GET** /session/:sessionId/appium/settings

>以JSON格式返回当前所有配置。
```
{
  ignoreUnimportantViews : true
}
```

注意，实际的命令因您的脚本所使用的语言而异; 请参阅具体的Appium客户端文档以获取更多信息。

### 支持的Settings

**"ignoreUnimportantViews"** - 布尔类型。设置为false时，Android设备不会忽略任何视图；被设置为true时，会使用`setCompressedLayoutHeirarchy()`忽略标记了IMPORTANT_FOR_ACCESSIBILITY_NO或IMPORTANT_FOR_ACCESSIBILITY_AUTO（以及被系统认为不重要的）的视图，从而尽量让脚本变得简单或执行的更快。

#### Android UiAutomator Configurator

设置[UiAutomator Configurator](https://developer.android.com/reference/android/support/test/uiautomator/Configurator.html) 的超时时间和延迟. 只支持Android API 18 及以上版本。

**"actionAcknowledgmentTimeout"** - Int类型，与[setActionAcknowledgmentTimeout](https://developer.android.com/reference/android/support/test/uiautomator/Configurator.html#setActionAcknowledgmentTimeout(long))相同。被设置为负数时将取默认值(3 * 1000 毫秒)

**"keyInjectionDelay"** - Int类型，与[setKeyInjectionDelay](https://developer.android.com/reference/android/support/test/uiautomator/Configurator.html#setKeyInjectionDelay(long))相同。被设置为负数时将取默认值(0 毫秒)

**"scrollAcknowledgmentTimeout"** - Int类型，与[setScrollAcknowledgmentTimeout](https://developer.android.com/reference/android/support/test/uiautomator/Configurator.html#setScrollAcknowledgmentTimeout(long))相同。被设置为负数时将取默认值(200 毫秒)

**"waitForIdleTimeout"** - Int类型，与[setWaitForIdleTimeout](https://developer.android.com/reference/android/support/test/uiautomator/Configurator.html#setWaitForIdleTimeout(long))相同。被设置为负数时将取默认值(10 * 1000 毫秒)

**"waitForSelectorTimeout"** - Int类型，与[setWaitForSelectorTimeout](https://developer.android.com/reference/android/support/test/uiautomator/Configurator.html#setWaitForSelectorTimeout(long))相同。被设置为负数时将取默认值(10 * 1000 毫秒)


本文由 [ghost62184](https://github.com/ghost62184) 翻译， 由 [chenhengjie123](https://github.com/chenhengjie123) 校验
