# Appium server arguments

Since Appium 1.5, many server arguments have been deprecated in favor of the [--default-capabilities flag](/docs/en/writing-running-appium/default-capabilities-arg.md).

Usage: `node . [flags]`

## Server flags
All flags are optional, but some are required in conjunction with certain others.



<expand_table>

|Flag|Default|Description|Example|
|----|-------|-----------|-------|
|`--shell`|null|Enter REPL mode||
|`--allow-cors`|false|Turn on CORS compatibility mode, which will allow connections to the Appium server from within websites hosted on any domain. Be careful when enabling this feature, since there is a potential security risk if you visit a website that uses a cross-domain request to initiate or introspect sessions on your running Appium server.||
|`-a`, `--address`|0.0.0.0|IP Address to listen on|`--address 0.0.0.0`|
|`-p`, `--port`|4723|port to listen on|`--port 4723`|
|`-pa`, `--base-path`|null|Initial path segment where the Appium/WebDriver API will be hosted. Every endpoint will be behind this segment.|`--base-path /wd/hub`|
|`-ca`, `--callback-address`|null|callback IP Address (default: same as --address)|`--callback-address 127.0.0.1`|
|`-cp`, `--callback-port`|null|callback port (default: same as port)|`--callback-port 4723`|
|`--session-override`|false|Enables session override (clobbering)||
|`-g`, `--log`|null|Also send log output to this file|`--log /path/to/appium.log`|
|`--log-level`|debug|Set the server log level for console and logfile (specified as `console-level:logfile-level`, with both being the same if only one value is supplied). Possible values are `debug`, `info`, `warn`, `error`, which are progressively less verbose.|`--log-level error:debug`|
|`--log-timestamp`|false|Show timestamps in console output||
|`--local-timezone`|false|Use local timezone for timestamps||
|`--log-no-colors`|false|Do not use colors in console output||
|`-G`, `--webhook`|null|Also send log output to this HTTP listener|`--webhook localhost:9876`|
|`--nodeconfig`|null|Configuration JSON file to register appium with selenium grid|`--nodeconfig /abs/path/to/nodeconfig.json`|

|`--show-config`|false|Show info about the appium server configuration and exit||
|`--no-perms-check`|false|Bypass Appium's checks to ensure we can read/write necessary files||
|`--strict-caps`|false|Cause sessions to fail if desired caps are sent in that Appium does not recognize as valid for the selected device||
|`--tmp`|null|Absolute path to directory Appium can use to manage temporary files, like built-in iOS apps it needs to move around. On *nix/Mac defaults to /tmp, on Windows defaults to C:\Windows\Temp||
|`--trace-dir`|null|Absolute path to directory Appium use to save ios instruments traces, defaults to <tmp dir>/appium-instruments||
|`--debug-log-spacing`|false|Add exaggerated spacing in logs to help with visual inspection||

|`-dc`, `--default-capabilities`|{}|Set the default desired capabilities, which will be set on each session unless overridden by received capabilities.|`--default-capabilities [ '{"app": "myapp.app", "deviceName": "iPhone Simulator"}' | /path/to/caps.json ]`|
|`--relaxed-security`|false|Disable additional security checks, so it is possible to use some advanced features, provided by drivers supporting this option. Only enable it if all the clients are in the trusted network and it is not the case if a client could potentially break out of the session sandbox. Can override enabling of specific features with --deny-insecure. See also the [security doc](/docs/en/writing-running-appium/security.md)||
|`--allow-insecure`|[]|Allow a list of features which are considered insecure and must be turned on explicitly by system administrators. Feature names are documented by the relevant server/driver. Should be a comma-separated list, or a path to a filename containing one feature name per line. Features listed in --deny-insecure will override anything listed here. Does not make sense to use in conjunction with --relaxed-security. See also the [security doc](/docs/en/writing-running-appium/security.md)|`--allow-insecure=foo,bar`|
|`--deny-insecure`|[]|Specify a list of features which will never be allowed to run, even if --relaxed-security is turned on, and even if feature names are listed with --allow-insecure. Should be a comma-separated list, or a path to a filename containing one feature name per line. See also the [security doc](/docs/en/writing-running-appium/security.md)|`--deny-insecure=foo,bar`|
|`--log-filters`|null|Specify a full path to a JSON file containing one or more log filtering rules. This feature is useful for cases when it is necessary to obfuscate sensitive information, which may be present in server log records, like passwords or access tokens. The format of each rule is described in https://github.com/appium/appium-support/blob/master/lib/log-internal.js. An exception will be thrown on server startup if any of the rules has issues.|`--log-filters=/home/config.json`|
