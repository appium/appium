## Settings

Settings 是 Appium 引入的一个新的概念。 它目前还没有被纳入 Mobile JSON Wire Protocol 及 Webdriver 标准之中。

Settings 是一种用来配置 Appium 服务器的方式。

Settings 有以下特点：
 - 可变的，它在同一会话中是可以被修改的。
 - 唯一的，它在被测应用会话中是唯一的。 它在每创建一个新会话时会被重置。
 - 可控的，它在自动化测试过程中控制着 Appium 服务器的运行。 它们不会被用来控制被测应用或被测终端。

在 Android 环境中 以 `ignoreUnimportantViews` 设置举例，该参数在 Android 环境中可以被设置成忽略所有与当前视图无关的元素，它将使测试过程更加有效率。 然而当我们希望能够访问被忽略的元素时，我们必须在将 `ignoreUnimportantViews` 设置成 *true* 后，重新修改成 *false* 。

另外也可以通过 Settings 配置让 Appium 忽略所有当前不可见的元素。

Settings 可以通过以下 API 方法进行配置：

**POST** /session/:sessionId/appium/settings

>以 JSON 格式提交 key:value 键值对形式的Settings配置。
```
{
  settings: {
   ignoreUnimportantViews : true  
  }  
}
```

**GET** /session/:sessionId/appium/settings

>以 JSON 格式返回当前所有 Settings 配置。
```
{
  ignoreUnimportantViews : true  
}
```

### 其它 Settings 配置参考

**"ignoreUnimportantViews"** -该参数值为 *true* 或 *false*。 如果你希望能够尽量减少测试过程的交互确认过程，或希望测试脚本能更快的执行，可以在 Android 终端环境下使用 `setCompressedLayoutHeirarchy()` 参数。它将忽略所有被标记为 IMPORTANT_FOR_ACCESSIBILITY_NO 或 IMPORTANT_FOR_ACCESSIBILITY_AUTO（以及那些被认为不是很重要的系统元素）的元素。
