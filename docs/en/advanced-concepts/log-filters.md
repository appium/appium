## Appium Logs Filtering

Sometimes it might be necessary to hide sensitive information, like passwords, identifiers, hashes, etc from the server log.
Since version 1.18.0 Appium supports `--log-filters` command line argument.
This argument allows to provide the path to a special config file, containing one or more log obfuscation rules.


### Config Format

The filtering config must be a valid JSON file containing array of filtering rules.
Each rule is an object with a set of predefined properties.
The following rule properties are supported:

- `pattern`: A valid Javascript RegExp pattern to replace. Must be a valid non-empty pattern.
- `text`: A simple non-empty exact text match to replace. Either this property or the above one must be provided. `pattern` has priority over `text` if both are provided.
- `flags`: Regular expression flags for the given pattern. Supported flags are the same as for the standard JavaScript RegExp constructor: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#Advanced_searching_with_flags_2. The 'g' (global matching) flag is always enabled though.
- `replacer`: The replacer value to use. By default equals to `**SECURE**`. Could also be an empty value.


### Config Examples

Replace all occurrences of `my.magic.app` string with the default replacer:

```json
[
    {
        "text": "my.magic.app"
    }
]
```

Replace all occurrences of `my.magic.<any char>` string with a custom replacer (case insensitive):

```json
[
    {
        "pattern": "my\\.magic\\.\\w",
        "flags": "i",
        "replacer": "***"
    }
]
```

Replace all occurrences of `my.magic.<any char>` and/or `your.magic` strings with a custom replacer (case insensitive):

```json
[
    {
        "pattern": "my\\.magic\\.\\w+",
        "flags": "i",
        "replacer": "***"
    },
    {
        "pattern": "your\\.magic",
        "flags": "i",
        "replacer": "***"
    }
]
```

Cut off all log lines to max 15 chars (advanced):

```json
[
	{
        "pattern": "(.{1,15}).*",
        "flags": "s",
        "replacer": "$1"
    }
]
```


### Config Errors Handling

If any of config rules contains invalid items (such as empty/invalid pattern, empty rule, etc.) then Appium will print the detailed report about collected errors and will fail to start until these errors are addressed.
