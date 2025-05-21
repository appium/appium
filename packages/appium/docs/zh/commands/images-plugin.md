# 插件: images

### `compareImages`

`POST` **`/session/:sessionId/appium/compare_images`**

#### 参数

| 名字 | 类型 |
| :------ | :------ |
| `mode` | `any`[] |
| `options?` | `any`[] |

#### 响应

`ComparisonResult`

### `findElement`

`POST` **`/session/:sessionId/element`**

在给定定位策略和选择器的情况下查找UI元素，如果找不到则报错

**`请参阅`**

[https://w3c.github.io/webdriver/#find-element](https://w3c.github.io/webdriver/#find-element)

<!-- comment source: method-signature -->

#### 参数

| 名字 | 类型 | 描述 |
| :------ | :------ | :------ |
| `using` | `any` | 定位策略 |
| `value` | `any` | 选择器与策略相结合，找到特定元素 |

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
| `using` | `any` | 定位策略 |
| `value` | `any` | 选择器与策略相结合，找到特定元素s |

#### 响应

`any`

可能为空的元素对象列表
