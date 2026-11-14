---
title: WebDriver BiDi Protocol
---

<style>
  ul[data-md-component="toc"] .md-nav {
    display: none;
  }
</style>

The following is a list of [W3C WebDriver BiDi protocol](https://w3c.github.io/webdriver-bidi/)
commands supported in Appium.

Unlike other protocols that specify URL endpoints, the WebDriver BiDi protocol specifies commands
sent as a websocket event, that both drivers and clients can emit or listen to.

### bidiStatus

```
session.status
```

> WebDriver BiDi documentation: [session.status](https://w3c.github.io/webdriver-bidi/#command-session-status)

Retrieves the current status of the Appium server.

#### Response

[`GetStatusResult`](./webdriver.md#response_2)

### bidiSubscribe

```
session.subscribe
```

> WebDriver BiDi documentation: [session.subscribe](https://w3c.github.io/webdriver-bidi/#command-session-subscribe)

Subscribes to one or more BiDi events.

#### Parameters

| Name        | Description                                                                                                                              | Type                                                         | Default |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------- |
| `contexts?` | Contexts in which to subscribe to the specified events. By default, the global context scope is applied. | string[] | `['']`  |
| `events`    | Names of events to subscribe to                                                                                                          | string[] |         |

#### Response

`{subscription: string}` — a unique subscription ID that can be passed to `session.unsubscribe`.

### bidiUnsubscribe

```
session.unsubscribe
```

> WebDriver BiDi documentation: [session.unsubscribe](https://w3c.github.io/webdriver-bidi/#command-session-unsubscribe)

Unsubscribes using either previously returned subscription IDs or event names.
Removing a subscription ID preserves any overlapping subscriptions.

#### Parameters

| Name             | Description                                                                                                                                                                                     | Type                                                         | Default |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------- |
| `subscriptions?` | Non-empty list of subscription IDs returned by `session.subscribe`. Cannot be combined with `events` or `contexts`.                                             | string[] |         |
| `contexts?`      | Non-standard, only together with `events`: contexts in which to unsubscribe from the specified events. By default, the global scope is applied. | string[] | `['']`  |
| `events?`        | Non-empty list of event names to unsubscribe from. Required when `subscriptions` is omitted.                                                                    | string[] |         |

All subscription IDs must be known to the current session. An unknown ID causes an `invalid argument`
error without removing any subscriptions. Subscription IDs are cleared when the session is deleted.

#### Response

`{}`
