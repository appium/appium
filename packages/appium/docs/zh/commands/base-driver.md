# 驱动: base-driver

### `createSession`

`POST` **`/session`**

从历史上看，前两个参数是专门用于JSONWP功能的，但是Appium2已经放弃了对这些参数的支持。
现在我们只接受W3C格式的功能对象，这种对象可以通过三个参数中的任意一个来传递。

**`请参阅`**

[https://w3c.github.io/webdriver/#new-session](https://w3c.github.io/webdriver/#new-session)

<!-- comment source: multiple -->

#### 参数

| 名字 | 类型 | 描述 |
| :------ | :------ | :------ |
| `desiredCapabilities?` | `W3CDriverCaps`<`C`\> | 新的会话功能 |
| `requiredCapabilities?` | `W3CDriverCaps`<`C`\> | 另一个可以发送新会话功能的地方（通常未定义） |
| `capabilities?` | `W3CDriverCaps`<`C`\> | 另一个可以发送新会话功能的地方（通常未定义） |

#### 响应

`CreateResult`

表示所创建会话的能力对象

### `deleteSession`

`DELETE` **`/session/:sessionId`**

返回会话和事件历史记录的功能（如果可用）

<!-- comment source: method-signature -->

#### 响应

`SingularSessionData`<`C`, `SessionData`\>

会话数据对象

### `getSession`

`GET` **`/session/:sessionId`**

返回会话和事件历史记录的功能（如果可用）

<!-- comment source: multiple -->

#### 响应

`SingularSessionData`<`C`, `SessionData`\>

会话数据对象

### `findElement`

`POST` **`/session/:sessionId/element`**

在给定定位策略和选择器的情况下查找UI元素，如果找不到则报错

**`请参阅`**

[https://w3c.github.io/webdriver/#find-element](https://w3c.github.io/webdriver/#find-element)

<!-- comment source: method-signature -->

#### 参数

| 名字 | 类型 | 描述 |
| :------ | :------ | :------ |
| `using` | `string` | 定位策略 |
| `value` | `string` | 选择器与策略相结合，找到特定元素 |

#### 响应

`Element`<`string`\>

对元素id进行编码的元素对象，可用于元素相关命令

### `findElementFromElement`

`POST` **`/session/:sessionId/element/:elementId/element`**

在给定定位策略和选择器的情况下查找UI元素，如果找不到则会报错，仅在给定元素的子元素中查找。

**`请参阅`**

[https://w3c.github.io/webdriver/#find-element-from-element](https://w3c.github.io/webdriver/#find-element-from-element)

<!-- comment source: method-signature -->

#### 参数

| 名字 | 类型 | 描述 |
| :------ | :------ | :------ |
| `using` | `string` | 定位策略 |
| `value` | `string` | 选择器与策略相结合，找到特定元素 |

#### 响应

`Element`<`string`\>

对元素id进行编码的元素对象，可用于元素相关命令

### `findElementFromShadowRoot`

`POST` **`/session/:sessionId/shadow/:shadowId/element`**

从阴影根中查找元素。

**`请参阅`**

[https://w3c.github.io/webdriver/#find-element-from-shadow-root](https://w3c.github.io/webdriver/#find-element-from-shadow-root)

<!-- comment source: method-signature -->

#### 参数

| 名字 | 类型 | 描述 |
| :------ | :------ | :------ |
| `using` | `string` | 定位策略 |
| `value` | `string` | 选择器与策略相结合，找到特定元素 |

#### 响应

`Element`<`string`\>

阴影根内与选择器匹配的元素

### `findElements`

`POST` **`/session/:sessionId/elements`**

查找与给定定位策略和选择器匹配的所有UI元素的列表

**`请参阅`**

[https://w3c.github.io/webdriver/#find-elements](https://w3c.github.io/webdriver/#find-elements)

<!-- comment source: method-signature -->

#### 参数

| 名字 | 类型 | 描述 |
| :------ | :------ | :------ |
| `using` | `string` | 定位策略 |
| `value` | `string` | 选择器与策略相结合，找到特定元素 |

#### 响应

`Element`<`string`\>[]

仅在给定元素的子元素中查找。

### `findElementsFromElement`

`POST` **`/session/:sessionId/element/:elementId/elements`**

查找与给定定位策略和选择器匹配的所有UI元素的列表，仅在给定元素的子元素中查找。

**`请参阅`**

[https://w3c.github.io/webdriver/#find-elements-from-element](https://w3c.github.io/webdriver/#find-elements-from-element)

<!-- comment source: method-signature -->

#### 参数

| 名字 | 类型 | 描述 |
| :------ | :------ | :------ |
| `using` | `string` | 定位策略 |
| `value` | `string` | 选择器与策略相结合，找到特定元素 |

#### 响应

`Element`<`string`\>[]

仅在给定元素的子元素中查找。

### `findElementsFromShadowRoot`

`POST` **`/session/:sessionId/shadow/:shadowId/elements`**

从阴影根中查找元素。

**`请参阅`**

[https://w3c.github.io/webdriver/#find-element-from-shadow-root](https://w3c.github.io/webdriver/#find-element-from-shadow-root)

<!-- comment source: method-signature -->

#### 参数

| 名字 | 类型 | 描述 |
| :------ | :------ | :------ |
| `using` | `string` | 定位策略 |
| `value` | `string` | 选择器与策略相结合，找到特定元素 |

#### 响应

`Element`<`string`\>[]

在阴影根内与选择器匹配的可能为空的元素列表。

### `getLog`

`POST` **`/session/:sessionId/log`**

获取给定日志类型的日志。

!!! warning "已弃用"

    请使用`/session/:sessionId/se/log`代替

<!-- comment source: method-signature -->

#### 参数

| 名字 | 类型 | 描述 |
| :------ | :------ | :------ |
| `type` | `string` | ILogCommands.supportedLogTypes中定义的日志类型的名称/密钥。 |

#### 响应

`any`

### `getLog`

`POST` **`/session/:sessionId/se/log`**

获取给定日志类型的日志。

<!-- comment source: method-signature -->

#### 参数

| 名字 | 类型 | 描述 |
| :------ | :------ | :------ |
| `type` | `string` | ILogCommands.supportedLogTypes中定义的日志类型的名称/密钥。 |

#### 响应

`any`

### `getLogEvents`

`POST` **`/session/:sessionId/appium/events`**

获取当前会话中发生的事件列表。

<!-- comment source: method-signature -->

#### 参数

| 名字 | 类型 | 描述 |
| :------ | :------ | :------ |
| `type?` | `string` \| `string`[] | 通过包含一个或多个类型筛选返回的事件 |

#### 响应

`EventHistory` \| `Record`<`string`, `number`\>

会话的事件历史记录。

### `getLogTypes`

`GET` **`/session/:sessionId/log/types`**

以字符串列表的形式获取可用日志类型。

!!! warning "已弃用"

    请使用`/session/:sessionId/se/log/types`代替

<!-- comment source: method-signature -->

#### 响应

`string`[]

### `getLogTypes`

`GET` **`/session/:sessionId/se/log/types`**

以字符串列表的形式获取可用日志类型。

<!-- comment source: method-signature -->

#### 响应

`string`[]

### `getPageSource`

`GET` **`/session/:sessionId/source`**

以HTML/XML格式获取当前页面/应用程序源代码。

**`请参阅`**

[https://w3c.github.io/webdriver/#get-page-source](https://w3c.github.io/webdriver/#get-page-source)

<!-- comment source: method-signature -->

#### 响应

`string`

以适合平台的格式呈现的用户界面层次结构（例如，对于网页使用HTML）。

### `getSessions`

`GET` **`/sessions`**

获取Appium服务器上运行的所有会话的数据。

<!-- comment source: method-signature -->

#### 响应

会话数据对象列表。每个会话数据对象都将返回`id`和会话的功能作为`capabilities`键，如下所示：

```json
[
  {
    "id":"ba30c6da-c266-4734-8ddb-c16f5bb53e16",
    "capabilities":{ "platformName":"ios","browserName":"safari","automationName":"xcuitest","platformVersion":"17.2","deviceName":"iPhone 15" }
  },
  {
    "id":"1441110c-1ece-4e45-abbf-ebf404f45f0a",
    "capabilities":{ "platformName":"ios","browserName":"safari","automationName":"xcuitest","platformVersion":"17.0","deviceName":"iPhone 14" }
  },
  ...
]
```

### `getSettings`

`GET` **`/session/:sessionId/appium/settings`**

使用新的设置对象更新会话的设置字典。

<!-- comment source: method-signature -->

#### 响应

``null``

### `updateSettings`

`POST` **`/session/:sessionId/appium/settings`**

使用新的设置对象更新会话的设置字典。

<!-- comment source: method-signature -->

#### 参数

| 名字 | 类型 | 描述 |
| :------ | :------ | :------ |
| `settings` | `Settings` | 一个包含设置名称和值的键值映射，映射中未列出的名称将不会修改其值。 |

#### 响应

``null``

### `getStatus`

`GET` **`/status`**

**`概述`**

检索服务器的当前状态。

**`描述`**

返回关于远程端是否处于可以创建新会话的状态的信息，并且还可以包含特定于实现的任意元信息。

就绪状态由主体的ready属性表示，如果当前尝试创建会话会失败，则该属性为false。然而值为true并不能保证新建会话命令一定会成功。

实现可以选择将额外的元信息作为主体的一部分包含进来，但顶级属性ready和message是保留的，并且不能被覆盖。

<!-- comment source: builtin-interface -->

#### 示例

<!-- BEGIN:EXAMPLES -->
##### JavaScript
<!-- BEGIN:EXAMPLE lang=JavaScript -->

```js
// webdriver.io example
await driver.status();
```

<!-- END:EXAMPLE -->
##### Python
<!-- BEGIN:EXAMPLE lang=Python -->

```python
driver.get_status()
```

<!-- END:EXAMPLE -->
##### Java
<!-- BEGIN:EXAMPLE lang=Java -->

```java
driver.getStatus();
```

<!-- END:EXAMPLE -->
##### Ruby
<!-- BEGIN:EXAMPLE lang=Ruby -->

```ruby
# ruby_lib example
remote_status

# ruby_lib_core example
@driver.remote_status
```

<!-- END:EXAMPLE -->
<!-- END:EXAMPLES -->

#### 响应

`Object`

### `getTimeouts`

`GET` **`/session/:sessionId/timeouts`**

设置与会话相关的各种超时。

**`请参阅`**

[https://w3c.github.io/webdriver/#set-timeouts](https://w3c.github.io/webdriver/#set-timeouts)

<!-- comment source: method-signature -->

#### 响应

``null``

### `timeouts`

`POST` **`/session/:sessionId/timeouts`**

设置与会话相关的各种超时。

**`请参阅`**

[https://w3c.github.io/webdriver/#set-timeouts](https://w3c.github.io/webdriver/#set-timeouts)

<!-- comment source: method-signature -->

#### 参数

| 名字 | 类型 | 描述 |
| :------ | :------ | :------ |
| `type?` | `string` | 仅用于旧的（JSONWP）命令，超时的类型 |
| `ms?` | `string` \| `number` | 仅用于旧的（JSONWP）命令，表示超时的毫秒数 |
| `script?` | `number` | 用于W3C命令的脚本超时时间（以毫秒为单位） |
| `pageLoad?` | `number` | 用于W3C命令的页面加载超时时间（以毫秒为单位） |
| `implicit?` | `string` \| `number` | 用于W3C命令的隐式等待超时时间（以毫秒为单位） |

#### 响应

``null``

### `implicitWait`

`POST` **`/session/:sessionId/timeouts/implicit_wait`**

设置隐式等待超时时间

!!! warning "已弃用"

    请使用`/session/:sessionId/timeouts`代替

使用`timeouts`代替

<!-- comment source: method-signature -->

#### 参数

| 名字 | 类型 | 描述 |
| :------ | :------ | :------ |
| `ms` | `string` \| `number` | the timeout in ms |

#### 响应

``null``

### `logCustomEvent`

`POST` **`/session/:sessionId/appium/log_event`**

将自定义命名事件添加到Appium事件日志中

<!-- comment source: method-signature -->

#### 参数

| 名字 | 类型 | 描述 |
| :------ | :------ | :------ |
| `vendor` | `string` | 事件所属的供应商或工具的名称，用于为事件命名 |
| `event` | `string` | 事件本身的名称 |

#### 响应

``null``

### `reset`

`POST` **`/session/:sessionId/appium/app/reset`**

重置当前会话（运行删除会话并创建会话子程序）

!!! warning "已弃用"

    请使用每个驱动程序的启动、激活、终止或清理方法。

改用显式会话管理命令代替

<!-- comment source: method-signature -->

#### 响应

``null``
