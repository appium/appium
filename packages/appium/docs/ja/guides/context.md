---
hide:
  - toc

title: Managing Contexts
---

A common feature of many app platforms is the ability for developers to embed web content inside of
the platform-native app frame. This allows developers to leverage web technologies or existing web
content for some or all of the app functionality. However, the additional complexity of mixing
"modes" within a single application can make it difficult for automation tools that are designed to
target the "native" elements and behaviours.

Appium provides a set of APIs for working with different app modes, called "contexts", that Appium
drivers can implement if they support automation commands in these different modes. There are three
basic commands that Appium has added to the W3C WebDriver spec for this purpose:

| Command Name          | Method/Route                | Params                               | Description                                   | Returns         |
| --------------------- | --------------------------- | ------------------------------------ | --------------------------------------------- | --------------- |
| `Get Contexts`        | `GET /session/:id/contexts` |                                      | Get a list of the available contexts          | `array<string>` |
| `Get Current Context` | `GET /session/:id/context`  |                                      | Get the name of the active context            | `string`        |
| `Set Context`         | `POST /session/:id/context` | `name` (`string`) | Switch into the context with the given `name` | `null`          |

This API is flexible enough to handle a variety of semantic interpretations on the part of the
driver. For example, the XCUITest driver includes two kinds of contexts: the native app context and
any active webviews, as one context per webview. A call to `Get Contexts` will return the list of
names, which you as a test author can sift through and use to switch into the appropriate context.
As another example, the Appium Altunity
Plugin introduces the concept of a `UNITY`
context, which encapsulates all the plugin's specific behaviour to ensure that when outside of the
`UNITY` context, the active driver's usual command implementations are used.

It is important to note that a call to `Get Contexts` will always contain at least one context,
conventionally but not necessarily named `NATIVE_APP`. This is the default active context.

Depending on the type of context you're in, the operation of the driver might change. The XCUITest
driver, when targeting a webview context, will not run its typical routines for finding and
interacting with elements. Instead, it will run a different set of routines appropriate to web
elements. This might have a variety of consequences, like supporting a different set of locator
strategies.

The command names in the table above are generic references to the commands and not code examples.
For examples of how to access the Context API in the language-specific client libraries, please
visit the documentation for a given library.
