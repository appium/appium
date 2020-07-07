## The Appium 2.0 Driver Command Line Interface (CLI)

Appium calls the bits of software that enable automation of a certain platform using a certain automation technology a "driver". There are drivers for iOS, Android, and other platforms. As of Appium 2.0, Appium does not download and install any drivers by default when you install Appium. There are too many drivers for this to be practical. Instead, you use a special command line interface to direct Appium to install and register drivers for you, to make them available for your use. This doc highlights the various commands available within this interface.

### Overview

All of these commands are available after typing `appium driver`. For example, in this doc, the command defined as `list` would be used in the following manner:

```
appium driver list
```

*Global Flags*

There are a number of flags available on all commands:

|Flag|Description|Default|
|----|-----------|-------|
|`-ah`, `--home`, `--appium-home`|Set the path of the APPIUM_HOME directory, where drivers and plugins will be installed and where the driver/plugin manifest will be maintained.|Defaults to the value of the `APPIUM_HOME` environment variable if set, otherwise `$HOME/.appium`|
|`--json`|Instead of outputting human-readable logs, just output a JSON representation of the command result|Defaults to false. Set to true by including this flag.|

### `list`

This command takes no positional arguments and lists drivers available to install by name, as well as any drivers that have been installed by any means.

|Flag|Description|Default|
|----|-----------|-------|
|`--installed`|Show only installed drivers|False|
|`--updates`|For drivers installed via NPM, check and display any updates|False|

|Example|Description|
|-------|-----------|
|`appium driver list`|List available drivers|
|`appium driver list --installed`|List installed drivers|
|`appium driver list --updates`|List available drivers including updates available for installed drivers|

### `install`

This command takes a driver name or specification as a positional argument, as well as a flag to define the source if it is not an official driver.

|Flag|Description|Default|
|----|-----------|-------|
|`--source`|Define the source if not attempting to install an official driver. Can be one of: `npm`, `local`, `github`, `git`|None|

Note that for any drivers installed via NPM (which counts official drivers, as well as drivers installed with `--source=npm`), you can use any valid NPM install spec after the driver name, e.g., `xcuitest@2.1.2` will install a specific version of the XCUITest driver.

|Example|Description|
|-------|-----------|
|`appium driver install xcuitest`|Install the official XCUITest driver|
|`appium driver install xcuitest@2.1.2`|Install the official XCUITest driver at a certain version|
|`appium driver install --source=npm appium-fake-driver`|Install the `appium-fake-driver` package from NPM|
|`appium driver install --source=github appium/appium-fake-driver|Install the driver located on GitHub at the 'appium' org and 'appium-fake-driver' repo|
|`appium driver install --source=local /path/to/driver/directory|Install a driver unpacked on your filesystem|

### `update`

This command takes an installed driver name, or the special term `installed`, to automatically update a single driver, or all drivers (if you use `installed`).

Note: this will update the driver(s) to the highest available minor version, but will *not* update to a new major version, since it might contain breaking changes. To update to a new major version, use the `--unsafe` flag.

|Flag|Description|Default|
|----|-----------|-------|
|`--unsafe`|Upgrade to a new major version if available|None|

|Example|Description|
|-------|-----------|
|`appium driver update xcuitest`|Update the XCUITest drivers to the latest safe version|
|`appium driver update installed`|Update all installed drivers to the latest safe version|
|`appium driver update --unsafe xcuitest`|Update the XCUITest driver to the latest version (even if it's a new major version)|

### `uninstall`

Uninstall an installed driver.

|Example|Description|
|-------|-----------|
|`appium driver uninstall xcuitest`|Uninstall the XCUITest driver|
