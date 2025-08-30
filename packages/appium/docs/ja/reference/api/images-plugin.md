# Plugin: images

### `compareImages`

`POST` **`/session/:sessionId/appium/compare_images`**

#### Parameters

| Name       | Type                                                        |
| :--------- | :---------------------------------------------------------- |
| `mode`     | `any`[] |
| `options?` | `any`[] |

#### Response

`ComparisonResult`

### `findElement`

`POST` **`/session/:sessionId/element`**

Find a UI element given a locator strategy and a selector, erroring if it can't be found

**`See`**

[https://w3c.github.io/webdriver/#find-element](https://w3c.github.io/webdriver/#find-element)

<!-- comment source: method-signature -->

#### Parameters

| Name    | Type  | Description                                                            |
| :------ | :---- | :--------------------------------------------------------------------- |
| `using` | `any` | the locator strategy                                                   |
| `value` | `any` | the selector to combine with the strategy to find the specific element |

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

| Name    | Type  | Description                                                             |
| :------ | :---- | :---------------------------------------------------------------------- |
| `using` | `any` | the locator strategy                                                    |
| `value` | `any` | the selector to combine with the strategy to find the specific elements |

#### Response

`any`

A possibly-empty list of element objects

### `performActions`

`POST` **`/session/:sessionId/actions`**

If the actions contains image elements as origin, convert them to viewport coordinates before sending it to the external driver

**`See`**

[https://w3c.github.io/webdriver/#perform-actions](https://w3c.github.io/webdriver/#perform-actions)

<!-- comment source: method-signature -->

#### Parameters

| Name      | Type               | Description                  |
| :-------- | :----------------- | :--------------------------- |
| `actions` | `ActionSequence[]` | an array of action sequences |

#### Response

`null`
