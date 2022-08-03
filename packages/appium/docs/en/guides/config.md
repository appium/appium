---
title: The Appium Config File
---

Instead of passing arguments on the command line to Appium, you may add them to a special config
file. Appium will read values from this config file when it runs. (Please note that CLI arguments
have _precedence_ over configuration files; if a value is set in a config file _and_ via CLI
argument, the CLI argument is preferred.)

## Supported Config File Formats

You can store your config data in the following kinds of files:

- JSON
- YAML
- JS (a JavaScript file exporting a JS object)
- CJS (the same as above; the extension is for common JS)

!!! warning

    Note: Configuration files in ESM format are not currently supported.

## Supported Config File Locations

Configuration files can be named anything, but the following filenames will be automatically
discovered and loaded by Appium:

- `.appiumrc.json` (recommended)
- `.appiumrc.yaml`
- `.appiumrc.yml`
- `.appiumrc.js`
- `.appiumrc.cjs`
- `appium.config.js`
- `appium.config.cjs`
- `.appiumrc` (which is considered to be JSON)

Further, _if your project uses Node.js,_ you can use store the configuration inside an `appium` property in your `package.json` and it will be automatically discovered.

### Config File Search

Appium will search _up_ the directory tree from the current working directory for one of these
files. If it reaches the current user's home directory or filesystem root, it will stop looking.

To specify a _custom_ location for your config file, use `appium --config-file /path/to/config/file`.

#### Configuration File Format

First, you might want to look at some examples:

- [Appium Configuration - JSON](https://github.com/appium/appium/blob/master/packages/appium/sample-code/appium.config.sample.json)
- [Appium Configuration - YAML](https://github.com/appium/appium/blob/master/packages/appium/sample-code/appium.config.sample.yaml)
- [Appium Configuration - JS](https://github.com/appium/appium/blob/master/packages/appium/sample-code/appium.config.sample.js)

A description of the format is available, as well:

- [Appium Configuration File JSON Schema](https://github.com/appium/appium/blob/master/packages/schema/lib/appium-config.schema.json)
- [TypeScript declarations for Appium Configuration](https://github.com/appium/appium/blob/master/packages/types/lib/config.ts)

To describe in words, the config file will have a root `server` property, and all arguments are
child properties. For certain properties which must be supplied on the command-line as comma-delimited lists, JSON strings, and/or external filepaths, these instead will be of their "native" type. For example,
`--use-plugins <value>` needs `<value>` to be comma-delimited string or path to a delimited file.
However, the config file just wants an array, e.g.,:

```json
{
  "server": {
    "use-plugins": ["my-plugin", "some-other-plugin"]
  }
}
```

## Configuring extensions (drivers and plugins)

For `driver`-and-`plugin`-specific configuration, these live under the `server.driver` and
`server.plugin` properties, respectively. Each driver or plugin will have its own named property,
and the values of any specific configuration it provides are under this. For example:

```json
{
  "server": {
    "driver": {
      "xcuitest": {
        "webkit-debug-proxy-port": 5400
      }
    }
  }
}
```

!!! note

    The above configuration corresponds to the `--driver-xcuitest-webkit-debug-proxy-port` CLI argument.

All properties are case-sensitive and will be in [kebab-case](https://en.wikipedia.org/wiki/Naming_convention_(programming)#Delimiter-separated_words). For example, `callback-port` is
allowed, but `callbackPort` is not.
