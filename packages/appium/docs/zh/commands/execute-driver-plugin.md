# 插件: execute-driver

### `executeDriverScript`

`POST` **`/session/:sessionId/appium/execute_driver`**

在插件中执行命令

至少，`D`必须是`ExternalDriver`，但插件可以更严格地限制它支持哪些驱动程序。

<!-- comment source: method-signature -->

#### 参数

| 名字 | 类型 |
| :------ | :------ |
| `script` | [script: string, scriptType: string, timeoutMs: number] |
| `type?` | [script: string, scriptType: string, timeoutMs: number] |

#### 响应

`unknown`
