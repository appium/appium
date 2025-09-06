---
title: JSON Wire Protocol
---
<style>
  ul[data-md-component="toc"] .md-nav {
    display: none;
  }
</style>

The following is a list of legacy [JSON Wire Protocol (JSONWP)](https://www.selenium.dev/documentation/legacy/json_wire_protocol/)
endpoints used in Appium.

### `getSession`

```
GET /session/:sessionId
```

> JSONWP documentation: [/session/:sessionId](https://www.selenium.dev/documentation/legacy/json_wire_protocol/#sessionsessionid)

Returns the capabilities of the current session.

Appium implements a modified version of this endpoint. If the `appium:eventTimings` capability is
set to `true`, the returned result will additionally include the `events` key, whose value contains
the event history and timings.

!!! warning "Deprecated"

    For retrieving capabilities, please use [`getAppiumSessionCapabilities`](./appium.md#getappiumsessioncapabilities).<br />
    For retrieving event history, please use [`getLogEvents`](./appium.md#getlogevents).

#### Response

`Capabilities` - an object containing the session capabilities, and the event history (if applicable)
