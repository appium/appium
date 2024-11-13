# Plugin: relaxed-caps

### `createSession`

`POST` **`/session`**

Start a new automation session

**`See`**

[https://w3c.github.io/webdriver/#new-session](https://w3c.github.io/webdriver/#new-session)

<!-- comment source: multiple -->

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `desiredCapabilities?` | `any` | the new session capabilities |
| `requiredCapabilities?` | `any` | another place the new session capabilities could be sent (typically left undefined) |
| `capabilities?` | `any` | another place the new session capabilities could be sent (typically left undefined) |

#### Response

`any`

The capabilities object representing the created session
