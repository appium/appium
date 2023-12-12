# Plugin: execute-driver

### `executeDriverScript`

`POST` **`/session/:sessionId/appium/execute_driver`**

Implementation of a command within a plugin

At minimum, `D` must be `ExternalDriver`, but a plugin can be more narrow about which drivers it supports.

<!-- comment source: method-signature -->

#### Parameters

| Name | Type |
| :------ | :------ |
| `script` | [script: string, scriptType: string, timeoutMs: number] |
| `type?` | [script: string, scriptType: string, timeoutMs: number] |

#### Response

`unknown`
