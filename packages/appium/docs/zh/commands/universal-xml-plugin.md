# 插件: universal-xml

### `findElement`

`POST` **`/session/:sessionId/element`**

在给定定位策略和选择器的情况下查找UI元素，如果找不到则报错

**`请参阅`**

[https://w3c.github.io/webdriver/#find-element](https://w3c.github.io/webdriver/#find-element)

<!-- comment source: method-signature -->

#### 参数

| 名字 | 类型 | 描述 |
| :------ | :------ | :------ |
| `using` | `any`[] | 定位策略 |

#### 响应

`any`

对元素id进行编码的元素对象，可用于元素相关命令

### `findElements`

`POST` **`/session/:sessionId/elements`**

查找与给定定位策略和选择器匹配的所有UI元素的列表

**`请参阅`**

[https://w3c.github.io/webdriver/#find-elements](https://w3c.github.io/webdriver/#find-elements)

<!-- comment source: method-signature -->

#### 参数

| 名字 | 类型 | 描述 |
| :------ | :------ | :------ |
| `using` | `any`[] | 定位策略 |

#### 响应

`any`

可能为空的元素对象列表

### `getPageSource`

`GET` **`/session/:sessionId/source`**

以HTML/XML格式获取当前页面/应用程序源代码

**`请参阅`**

[https://w3c.github.io/webdriver/#get-page-source](https://w3c.github.io/webdriver/#get-page-source)

<!-- comment source: method-signature -->

#### 响应

`string`

以适合平台的格式呈现的用户界面层次结构（例如，对于网页使用HTML）
