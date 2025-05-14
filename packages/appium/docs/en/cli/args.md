---
hide:
  - toc

title: Server Command-Line Arguments
---

To start the Appium server, you may either run `appium` or `appium server`. The `server` subcommand
is considered to be the default, so if you omit it, Appium will interpret this as your request to
run the Appium server.

The invocation of `appium` (or `appium server`) can take a number of arguments, which are detailed
below.

!!! note

    All of these arguments can be set via a [Configuration File](../guides/config.md) instead if
    you want. Any arguments set on the command line will override any arguments found in
    a configuration file.


|<div style="width:12em">Argument</div>|Description|Type|<div style="width:8em">Default</div>|Aliases|
|--|--|--|--|--|
|`--address`|IP address to listen on|string|`0.0.0.0`|`-a`|
|`--allow-cors`|Whether the Appium server should allow web browser connections from any host|boolean|`false`||
|`--allow-insecure`|Set which [insecure features](../guides/security.md) are allowed to run in this server's sessions. Most features are defined on a driver level; see driver documentation for more details. Individual features can be overridden by `--deny-insecure`. Has no effect in combination with `--relaxed-security`.|array<string>|`[]`||
|`--base-path`|Base path to use as the prefix for all webdriver routes running on the server|string|`""`|`-pa`|
|`--callback-address`|Callback IP address (default: same as `--address`)|string||`-ca`|
|`--callback-port`|Callback port (default: same as `--port`) (Value must be between `1` and `65535`)|integer|`4723`|`-cp`|
|`--config`|Path to an [Appium configuration JSON file](../guides/config.md)|string|||
|`--debug-log-spacing`|Add exaggerated spacing in logs to help with visual inspection|boolean|`false`||
|`--default-capabilities`|Set the default desired capabilities, which will be set on each session unless overridden by received capabilities. If a string, a path to a JSON file containing the capabilities, or raw JSON.|object||`-dc`|
|`--deny-insecure`|Set which [insecure features](../guides/security.md) are not allowed to run in this server's sessions. Most features are defined on a driver level; see driver documentation for more details. Since all insecure features are disabled by default, this argument has no effect without either `--allow-insecure` or `--relaxed-security`, and is applied after both.|array<string>|`[]`||
|`--driver`|Driver-specific configuration. Keys should correspond to driver package names|object|||
|`--drivers-import-chunk-size`|The maximum amount of drivers that could be imported in parallel on server startup|number|`3`||
|`--keep-alive-timeout`|Number of seconds the Appium server should apply as both the keep-alive timeout and the connection timeout for all requests. Setting this to `0` disables the timeout.|integer|`600`|`-ka`|
|`--request-timeout`|Number of seconds the Appium server should apply for receiving the entire HTTP request from the client. A value of 0 disables the timeout. Set it to a non-zero value to protect against potential Denial-of-Service attacks in case the server is deployed without a reverse proxy in front. HTTP requests that are running longer than allowed by this timeout would be rejected with the status code 408.|integer|`3600`||
|`--local-timezone`|Use local timezone for timestamps|boolean|`false`||
|`--log`|Also send log output to this file|string||`-g`|
|`--log-filters`|One or more log filtering rules|array|||
|`--log-level`|Log level (console[:file]) (Value must be one of: `info`, `info:debug`, `info:info`, `info:warn`, `info:error`, `warn`, `warn:debug`, `warn:info`, `warn:warn`, `warn:error`, `error`, `error:debug`, `error:info`, `error:warn`, `error:error`, `debug`, `debug:debug`, `debug:info`, `debug:warn`, `debug:error`)|string|`debug`||
|`--log-format`|Log format (Value must be to one of: `text`, `json`, `pretty_json`). If logs are printed as JSON then the text coloring is always disabled.|string|`text`||
|`--log-no-colors`|Do not use color in console output|boolean|`false`||
|`--log-timestamp`|Show timestamps in console output|boolean|`false`||
|`--long-stacktrace`|Add long stack traces to log entries. Recommended for debugging only.|boolean|`false`||
|`--no-perms-check`|Skip various permission checks on the server startup|boolean|`false`||
|`--nodeconfig`|Path to configuration JSON file to register Appium as a node with Selenium Grid 3; otherwise the configuration itself|string|||
|`--plugin`|Plugin-specific configuration. Keys should correspond to plugin package names|object|||
|`--plugins-import-chunk-size`|The maximum amount of plugins that could be imported in parallel on server startup|number|`7`||
|`--port`|Port to listen on (Value must be between `1` and `65535`)|integer|`4723`|`-p`|
|`--relaxed-security`|Allow all [insecure features](../guides/security.md). Only use this if all clients are in a trusted network and could not potentially break out of the session sandbox. Specific features can be overridden by using `--deny-insecure`.|boolean|`false`||
|`--session-override`|Enables session override (clobbering)|boolean|`false`||
|`--ssl-cert-path`|Absolute path to the `.cert` file if TLS is used. Must be provided together with `--ssl-key-path`. See the [SSL/TLS/SPDY Support guide](../guides/tls.md) for details|string|||
|`--ssl-key-path`|Absolute path to the `.key` file if TLS is used. Must be provided together with `--ssl-cert-path`. See the [SSL/TLS/SPDY Support guide](../guides/tls.md) for details|string|||
|`--strict-caps`|Cause sessions to fail if desired caps are sent in that Appium does not recognize as valid for the selected device|boolean|`false`||
|`--tmp`|Absolute path to directory Appium can use to manage temp files|string|Windows: `C:\Windows\Temp`<br>Others: `/tmp`||
|`--trace-dir`|Absolute path to directory Appium can use to save iOS instrument traces|string|`<tmp>/appium-instruments`||
|`--use-drivers`|A list of drivers to activate. By default, all installed drivers will be activated.|array<string>|`[]`||
|`--use-plugins`|A list of plugins to activate. To activate all plugins, the value should be an array with a single item `"all"`.|array<string>|`[]`||
|`--webhook`|Also send log output to this http listener|string||`-G`|

The following arguments are used for information retrieval, after which the server will automatically exit. They are therefore meant for reference or debug purposes.

|<div style="width:10em">Argument</div>|Description|Alias|
|--|--|--|
|`--help`|Print instructions on using the Appium command-line. This argument can also be used for any Appium subcommands.|`-h`|
|`--show-build-info`|Print detailed information on the Appium server version||
|`--show-config`|Print the current Appium server configuration details||
|`--show-debug-info`|Print information on the current environment: details about the operating system, Node.js, and Appium itself||
|`--version`|Print the Appium server version|`-v`|
