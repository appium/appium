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

#### Limits

A session can have up to 100 subscriptions. Every subscription covers a combination of each of its
events and each of its contexts (an event without contexts counts as one), and all the subscriptions
together, counted one by one, can cover up to 1000 combinations. Lists in the parameters can have up
to 1000 items, and the event names, contexts and subscription IDs can be up to 256 characters long.
A request that exceeds a limit fails with an `invalid argument` error without changing the subscriptions.

Unsubscribing by event names (`events`) removes the matching contexts of those events across all the
subscriptions (an event stays active in the contexts that are not listed), but the IDs of the
subscriptions that have no events left stay valid, so they can still be passed to `session.unsubscribe`.
The oldest such ID expires only when a new subscription needs its slot at the limit of 100 subscriptions.
An unknown or expired ID fails the whole `subscriptions` request, and none of its subscriptions are removed.

### bidiUnsubscribe

```
session.unsubscribe
```

> WebDriver BiDi documentation: [session.unsubscribe](https://w3c.github.io/webdriver-bidi/#command-session-unsubscribe)

Unsubscribes from one or more BiDi events using subscription IDs or event names. Event names can
also be scoped to contexts (legacy parameter). Removing a subscription ID preserves any overlapping
subscriptions.

#### Parameters

| Name             | Description                                                                                                                                                                    | Type                                                         | Default |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ | ------- |
| `subscriptions?` | Non-empty list of subscription IDs returned by `session.subscribe`. Cannot be combined with `events` or `contexts`.                            | string[] |         |
| `events?`        | Non-empty list of event names to unsubscribe from. Required when `subscriptions` is omitted.                                                   | string[] |         |
| `contexts?`      | Legacy parameter: contexts in which to unsubscribe from events specified in `events`. By default, the global scope is applied. | string[] | `['']`  |

All subscription IDs must be known to the current session. An unknown ID causes an `invalid argument`
error without removing any subscriptions. Subscription IDs are cleared when the session is deleted.

#### Response

`{}`
