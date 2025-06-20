---
hide:
  - toc
title: Retrieving Event Timings
---

Appium comes with the ability to retrieve timing information about startup
information and command length. This is an advanced feature that is controlled
by the use of the `appium:eventTimings` capability (set it to `true` to log event
timings).

With this capability turned on, the `POST /session/:id/appium/events` response (i.e.,
the response to `driver.logs.events` or similar, depending on client) will be
decorated with an `events` property. This is the structure of that `events`
property:

```
{
    "<event_type>": [<occurence_timestamp_1>, ...],
    "commands": [
        {
            "cmd": "<command_name>",
            "startTime": <js_timestamp>,
            "endTime": <js_timestamp>
        },
        ...
    ]
}
```

In other words, the `events` property has 2 kinds of properties of its own:

- Properties which are the names of event types
- The `commands` property

Properties which are names of event types correspond to an array of timestamps
when that event happened. It's an array because events might happen multiple
times in the course of a session. Examples of event types include:

- `newSessionRequested`
- `newSessionStarted`

(Individual drivers will define their own event types, so we do not have an
exhaustive list to share here. It's best to actually get one of these responses
from a real session to inspect the possible event types.)

The `commands` property is an array of objects. Each object has the name of the
Appium-internal command (for example `click`), as well as the time the command
started processing and the time it finished processing.

With this data, you can calculate the time between events, or a strict timeline
of events, or statistical information about average length of a certain type of
command, and so on.

You can only receive data about events that have happened when you make the
call to `/session/:id/appium/events`, so the best time to get data about an entire session is
right before quitting it.

The Appium team maintains an event timings parser tool that can be used to
generate various kinds of reports from event timings output:
[appium/appium-event-parser](https://github.com/appium/appium-event-parser).

!!! note

```
In the past, events were available as a part of `GET /session/:id` response
```

## Add a custom event

You can add custom events that will show up in the event timings data. You can send a custom event
name to the Appium server using the [Log Custom Event API](../commands/base-driver.md#logcustomevent),
and the server will store the timestamp. The [Get Log Events](../commands/base-driver.md#getlogevents)
command can be used to retrieve named events' timestamps later on.
