
## Appium 事件计时

Appium 提供了一个能力，可以获取关于启动信息和命令执行时间的计时信息。这是由 `eventTimings` 这个初始化参数控制的高级功能（把这个参数设置为 `true` 来记录事件的计时信息）

打开这个参数，`GET /session/:id` 这个接口的响应结果（也就是，`driver.getSessionDetails()` 的响应结果，或者类似的，取决于客户端实现）中会包含 `events` 属性。下面是 `events` 属性的结构

```json
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

换句话说，`events` 属性包含两种类别的属性。

* 事件类型的名字属性
* `commands` 属性

事件类型的名字属性对应的是事件发生时的时间戳列表。因为在一个会话周期内，事件可能发生多次，所以时间戳是个列表。事件的类型包含：

* `newSessionRequested`
* `newSessionStarted`

（个别 driver 会定义属于它们自己的事件类型，所以在这里我们没法列出一个完整的事件列表。最好是从一个会话得到响应结果之后去检查各种可能的事件类型。）

`commands` 属性是一个对象列表。每个对象都包括一个 appium 的内部命令的名字（例如 `click`），也包括这个命令执行的开始时间和结束时间。

通过这些数据，你可以计算出时间之间的间隔，或者事件的精确时间轴，或者某个事件的平均时间的统计信息等等。

你只能获得调用 `/session/:id` 这个接口期间发生的事件数据，所以获取会话周期数据的最佳时间是在你正好要退出会话之前。

Appium团队维护了一个事件计时解析工具，这个工具可以解析事件计时的输出，然后生成各种报告：
[appium/appium-event-parser](https://github.com/appium/appium-event-parser).



本文由 yanqiang@douban.com 翻译，由 [lihuazhang](https://github.com/lihuazhang) 校验。