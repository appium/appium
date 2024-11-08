# 插件: relaxed-caps

### `createSession`

`POST` **`/session`**

开始新的自动化会话

**`请参阅`**

[https://w3c.github.io/webdriver/#new-session](https://w3c.github.io/webdriver/#new-session)

<!-- comment source: multiple -->

#### 参数

| 名字 | 类型 | 描述 |
| :------ | :------ | :------ |
| `desiredCapabilities?` | `any` | 新的会话功能 |
| `requiredCapabilities?` | `any` | 另一个可以发送新会话功能的地方（通常未定义） |
| `capabilities?` | `any` | 另一个可以发送新会话功能的地方（通常未定义） |

#### 响应

`any`

所创建会话的能力对象
