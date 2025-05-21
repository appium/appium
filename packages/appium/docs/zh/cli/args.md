---
hide:
  - toc

title: 服务器命令行参数
---

要启动Appium服务器，您可以运行`appium`或`appium server`。`server`子命令是他的默认命令，因此如果省略它，Appium会将认为您想要运行Appium服务器。

`appium`（或`appium server`）的调用可以接受多个参数，详细信息如下。

!!! 注意

    如果您愿意，所有这些参数都可以通过[配置文件](../guides/config.md)设置。命令行上设置的任何参数都将覆盖配置文件中的参数。
    
|<div style="width:12em">参数</div>|描述|类型|<div style="width:8em">默认值</div>|别名|
|--|--|--|--|--|
|`--address`|要监听的IP地址|string|`0.0.0.0`|`-a`|
|`--allow-cors`|Appium服务器是否允许来自任何主机的web浏览器连接|boolean|`false`||
|`--allow-insecure`|设置允许在此服务器的会话中运行哪些不安全功能。功能是在驱动程序层定义的；有关更多详细信息，请参阅文档。请注意，通过`--deny-insecure`指定的功能即使在这里列出也将被禁用。如果值是字符串，则表示是包含策略或逗号分隔列表的文本文件的路径。|array<string>|`[]`||
|`--base-path`|用作服务器上运行的所有WebDriver路由的前置路径|string|`""`|`-pa`|
|`--callback-address`|回调IP地址（默认值：与`--address`相同)|string||`-ca`|
|`--callback-port`|回调端口（默认值：与`--port`相同)（值必须介于`1`和`65535`)|integer|`4723`|`-cp`|
|`--config`|[Appium JSON格式配置文件](../guides/config.md)的路径|string|||
|`--debug-log-spacing`|在日志中添加夸张的间距以便于进行查看。|boolean|`false`||
|`--default-capabilities`|设置默认的所需功能，将在每个会话上设置这些功能，除非被新的配置覆盖。如果值是字符串，则表示包含功能的JSON文件的路径，或原始JSON字符串。|object||`-dc`|
|`--deny-insecure`|设置禁止在此服务器的会话中运行的哪些不安全功能。功能是在驱动程序层定义的；有关更多详细信息，请参阅文档。即使在`--allow-insecure`中列出，并且启用了`--relaxed-securities`，此处列出的功能也会被禁用。如果值是字符串，则表示是包含策略或逗号分隔列表的文本文件的路径。|array<string>|`[]`||
|`--driver`|驱动程序特定配置。键名应与驱动程序包名称相对应|object|||
|`--drivers-import-chunk-size`|服务器启动时可以并行导入的最大驱动程序数量|number|`3`||
|`--keep-alive-timeout`|Appium服务器应该将所有请求的保持活跃超时（keep-alive timeout）和连接超时（connection timeout）都设置为多少秒。如果将其设置为0，则会禁用超时设置。|integer|`600`|`-ka`|
|`--local-timezone`|使用本地时区来记录时间戳|boolean|`false`||
|`--log`|同时将日志输出发送到文件|string||`-g`|
|`--log-filters`|一个或多个日志过滤规则|array|||
|`--log-level`|日志级别（console[:file]），值必须是以下之一：`info`, `info:debug`, `info:info`, `info:warn`, `info:error`, `warn`, `warn:debug`, `warn:info`, `warn:warn`, `warn:error`, `error`, `error:debug`, `error:info`, `error:warn`, `error:error`, `debug`, `debug:debug`, `debug:info`, `debug:warn`, `debug:error`)|string|`debug`||
|`--log-format`|日志格式（值必须是以下之一：`text`, `json`, `pretty_json`）。如果日志以JSON格式打印，则会始终禁用文本着色。|string|`text`||
|`--log-no-colors`|不要在控制台输出中使用颜色|boolean|`false`||
|`--log-timestamp`|在控制台输出中显示时间戳|boolean|`false`||
|`--long-stacktrace`|在日志条目中添加长堆栈跟踪，建议仅用于调试|boolean|`false`||
|`--no-perms-check`|跳过服务器启动时的各种权限检查|boolean|`false`||
|`--nodeconfig`|将Appium注册为Selenium Grid 3节点的JSON配置文件的路径；否则配置本身|string|||
|`--plugin`|插件特定配置，键名应与插件包名称相对应|object|||
|`--plugins-import-chunk-size`|服务器启动时可以并行导入的插件的最大数量|number|`7`||
|`--port`|要监听的端口（值必须介于`1`和`65535`之间）|integer|`4723`|`-p`|
|`--relaxed-security`|禁用附加的安全检查，以便使用支持此选项的驱动程序提供的一些高级功能。只有当所有客户端都在受信任的网络中时才启用它，如果客户端有可能脱离会话沙盒，则不会启用它。可以使用`--deny-insecure`覆盖特定功能|boolean|`false`||
|`--session-override`|启用会话覆盖（覆盖现有会话）|boolean|`false`||
|`--ssl-cert-path`|如果使用TLS，则指向`.cert`文件的绝对路径。必须与`--ssl-key-path`一起使用。有关详细信息，请参阅[SSL/TLS/SPDY支持指南](../guides/tls.md)|string|||
|`--ssl-key-path`|如果使用TLS，则指向`.key`文件的绝对路径。必须与`--ssl-cert-path`一起使用。有关详细信息，请参阅[SSL/TLS/SPDY支持指南](../guides/tls.md)|string|||
|`--strict-caps`|如果发送了Appium认为对于选定设备无效的能力则使会话失败。|boolean|`false`||
|`--tmp`|Appium可用于管理临时文件的目录的绝对路径|string|Windows: `C:\Windows\Temp`<br>其他: `/tmp`||
|`--trace-dir`|Appium用于保存iOS Instruments跟踪数据的目录的绝对路径|string|`<tmp>/appium-instruments`||
|`--use-drivers`|要激活的驱动程序列表，默认情况下，所有已安装的驱动程序都将被激活|array<string>|`[]`||
|`--use-plugins`|要激活的插件列表，要激活所有插件，该值应该是一个包含单个项`"all"`的数组|array<string>|`[]`||
|`--webhook`|同时将日志输出发送到此http侦听器|string||`-G`|

以下参数用于信息检索，运行之后服务器将自动退出。因此，它们仅供参考或调试使用。

|<div style="width:10em">Argument</div>|Description|Alias|
|--|--|--|
|`--help`|打印使用Appium命令行的说明，此参数也可用于Appium子命令|`-h`|
|`--show-build-info`|打印Appium服务器版本的详细信息||
|`--show-config`|打印当前Appium服务器配置详细信息||
|`--show-debug-info`|打印当前环境的信息：操作系统、Node.js和Appium本身的详细信息||
|`--version`|打印Appium服务器版本|`-v`|
