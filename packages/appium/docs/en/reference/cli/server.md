---
hide:
  - toc

title: appium server
---

Launches an Appium server.

```
appium server
```

You can also omit the `server` subcommand:

```
appium
```

### Options

!!! note

    All of these options can also be set via a [Configuration File](../../guides/config.md). Options
    set on the command line will override any options found in a configuration file.

|<div style="width:15em">Argument</div>|Description|Type|<div style="width:7em">Default</div>|Alias|
|--|--|--|--|--|
|`--address`|IPv4/IPv6 address to listen on|string|`0.0.0.0`|`-a`|
|`--allow-cors`|Allow web browser connections from any host|boolean|`false`||
|`--allow-insecure`|List of [insecure features](../../guides/security.md) that should be allowed in this server's sessions. Individual features can be overridden by `--deny-insecure`. Has no effect in combination with `--relaxed-security`.|array<string>|`[]`||
|`--base-path`|Base path to use as the prefix for all webdriver routes running on the server|string|`""`|`-pa`|
|`--callback-address`|Callback IP address|string|`0.0.0.0`|`-ca`|
|`--callback-port`|Callback port|integer|`4723`|`-cp`|
|`--config`|Path to an [Appium configuration JSON file](../../guides/config.md)|string|||
|`--debug-log-spacing`|Add exaggerated spacing in logs to help with visual inspection|boolean|`false`||
|`--default-capabilities`|Capabilities that will be used for each session, unless overridden by received capabilities|object||`-dc`|
|`--deny-insecure`|List of [insecure features](../../guides/security.md) that should be disabled in this server's sessions. Since all insecure features are disabled by default, this argument has no effect without either `--allow-insecure` or `--relaxed-security`, and is applied after both.|array<string>|`[]`||
|`--driver`|Driver-specific configuration. Keys should correspond to driver package names|object|||
|`--drivers-import-chunk-size`|Maximum number of drivers that can be imported in parallel on server startup|number|`3`||
|`--keep-alive-timeout`|Timeout (in seconds) to use as both the keep-alive timeout and the connection timeout for all client requests. Disabled if set to `0`.|integer|`600`|`-ka`|
|`--request-timeout`|Timeout (in seconds) for waiting to receive the entire HTTP request from the client. Disabled if set to `0`. Requests exceeding this timeout will be rejected with the code `HTTP 408`.|integer|`3600`||
|`--local-timezone`|Use local timezone for log timestamps|boolean|`false`||
|`--log`|Path to a file where the server logs should be output. This does not affect output on the console.|string||`-g`|
|`--log-filters`|List of log filtering rules. See the [log filtering guide](../../guides/log-filters.md) for details.|array|||
|`--log-level`|The log level for the server logs. Supported values are `debug`, `info`, `warn`, or `error`. Combining two supported values using a colon (e.g. `warn:debug`) allows to set separate log levels for the console and file outputs, respectively.|string|`debug`||
|`--log-format`|The log format of the server logs. Supported values are `text`, `json`, or `pretty_json`. Setting the value to `json` disables colors.|string|`text`||
|`--log-no-colors`|Disable colors in the server log|boolean|`false`||
|`--log-timestamp`|Show timestamps in the server log|boolean|`false`||
|`--long-stacktrace`|Add long stack traces to log entries. Recommended for debugging only.|boolean|`false`||
|`--no-perms-check`|Skip various permission checks on the server startup|boolean|`false`||
|`--nodeconfig`|JSON configuration for registering Appium as a node with Selenium Grid 3|object|||
|`--plugin`|Plugin-specific configuration. Keys should correspond to plugin package names|object|||
|`--plugins-import-chunk-size`|Maximum number of plugins that can be imported in parallel on server startup|number|`7`||
|`--port`|Port to listen on|integer|`4723`|`-p`|
|`--relaxed-security`|Allow all [insecure features](../../guides/security.md). Only use this if all clients are in a trusted network and could not potentially break out of the session sandbox. Specific features can be overridden by using `--deny-insecure`.|boolean|`false`||
|`--session-override`|Enable session override (clobbering)|boolean|`false`||
|`--shutdown-timeout`|Timeout (in milliseconds) for waiting on all active connections to close, when shutting down the server|number|`5000`||
|`--ssl-cert-path`|Absolute path to the `.cert` file if TLS is used. Must be provided together with `--ssl-key-path`. See the [SSL/TLS/SPDY Support guide](../../guides/tls.md) for details.|string|||
|`--ssl-key-path`|Absolute path to the `.key` file if TLS is used. Must be provided together with `--ssl-cert-path`. See the [SSL/TLS/SPDY Support guide](../../guides/tls.md) for details.|string|||
|`--strict-caps`|Prevent creation of new client sessions that use unsupported capabilities|boolean|`false`||
|`--tmp`|Absolute path to the directory used for temporary files|string|[`os.tmpdir()`](https://nodejs.org/api/os.html#ostmpdir)||
|`--use-drivers`|List of drivers to activate. By default, all installed drivers are activated.|array<string>|`[]`||
|`--use-plugins`|List of plugins to activate. By default, no plugins are activated. Set to `["all"]` to activate all installed plugins.|array<string>|`[]`||
|`--webhook`|URL for an HTTP listener where the server logs should be output. This does not affect output on the console.|string||`-G`|

### Info Options

The following options are used for reference or debug purposes. They are only supported for the base `appium` command (not `appium server`), and will not launch the server.

|<div style="width:10em">Argument</div>|Description|Alias|
|--|--|--|
|`--help`|Print instructions on using the Appium command-line. This argument can also be used for any Appium subcommands.|`-h`|
|`--show-build-info`|Print detailed information on the Appium server version||
|`--show-config`|Print the current Appium server configuration details||
|`--show-debug-info`|Print information on the current environment: details about the operating system, Node.js, and Appium itself||
|`--version`|Print the Appium server version|`-v`|
