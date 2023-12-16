# Plugin: universal-xml

### `findElement`

`POST` **`/session/:sessionId/element`**

Find a UI element given a locator strategy and a selector, erroring if it can't be found

**`See`**

[https://w3c.github.io/webdriver/#find-element](https://w3c.github.io/webdriver/#find-element)

<!-- comment source: method-signature -->

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `using` | `any`[] | the locator strategy |

#### Response

`any`

The element object encoding the element id which can be used in element-related
commands

### `findElements`

`POST` **`/session/:sessionId/elements`**

Find a a list of all UI elements matching a given a locator strategy and a selector

**`See`**

[https://w3c.github.io/webdriver/#find-elements](https://w3c.github.io/webdriver/#find-elements)

<!-- comment source: method-signature -->

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `using` | `any`[] | the locator strategy |

#### Response

`any`

A possibly-empty list of element objects

### `getPageSource`

`GET` **`/session/:sessionId/source`**

Get the current page/app source as HTML/XML

**`See`**

[https://w3c.github.io/webdriver/#get-page-source](https://w3c.github.io/webdriver/#get-page-source)

<!-- comment source: method-signature -->

#### Response

`string`

The UI hierarchy in a platform-appropriate format (e.g., HTML for a web page)
