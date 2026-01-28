---
title: appium driver/plugin
---
<style>
  ul[data-md-component="toc"] .md-nav {
    display: none;
  }
</style>

Provides management options for a specific extension (driver or plugin). Both the `appium driver` and
`appium plugin` subcommands support the same options.

The following sub-subcommands are supported: `doctor`, `install`, `list`, `run`, `update`,
and `uninstall`.

## `doctor`

Runs doctor checks for an installed extension, which validate whether the extension has its prerequisites
configured correctly. Note that not all extensions include doctor checks.

!!! note

    If you maintain an Appium extension and would like to add Appium Doctor support for it, check
    out the documentation on [Building Doctor Checks](../../developing/build-doctor-checks.md).

#### Usage

```
appium {driver|plugin} doctor <extension-name>
```

|Argument|Description|
|--|--|
|`extension-name`|The short name of the installed extension|

#### Options

|Argument|Description|Type|
|--|--|--|
|`--json`|Return the result in JSON format|boolean|

#### Example

- Run doctor checks for the UiAutomator2 driver:

    ```
    appium driver doctor uiautomator2
    ```

## `install`

Installs an extension.

#### Usage

```
appium {driver|plugin} install <install-spec>
```

|<div style="width:7em">Argument</div>|Description|
|--|--|
|`install-spec`|The short name of an official extension, with optional `npm` version or tag modifier. If using the `--source` option, the expected format of this argument will change ([see below](#source-vs-install-spec)).|

#### Options

|Argument|Description|Type|
|--|--|--|
|`--json`|Return the result in JSON format|boolean|
|`--package`|The Node.js package name of the extension. Required if `--source` is set to `git` or `github`.|string|
|`--source`|The location where Appium should look for the given extension. Supported values are `git`, `github`, `local`, or `npm`. Changes the expected format of `install-spec` ([see below](#source-vs-install-spec)).|string|

#### Source vs Install Spec

|`source`|Format of `<install-spec>`|
|--|--|
|None|The short name of an official extension, with optional modifiers as supported by `npm install` (e.g. version or tag)|
|`git`|The Git URL of the extension|
|`github`|The GitHub repository URL of the extension|
|`local`|The local path to the extension containing its `package.json` file|
|`npm`|The name of the `npm` package, with optional modifiers as supported by `npm install` (e.g. version or tag)|

#### Examples

- Install the latest XCUITest driver:

    ```
    appium driver install xcuitest
    ```

- Install the XCUITest driver at version 9.0.0:

    ```
    appium driver install xcuitest@9.0.0
    ```

- Install the `beta` version of `@appium/fake-driver` from `npm`:

    ```
    appium driver install @appium/fake-driver@beta --source=npm
    ```

- Install a locally-developed plugin:

    ```
    appium plugin install /path/to/my/plugin --source=local
    ```

- Install the XCUITest driver from GitHub:

    ```
    appium driver install https://github.com/appium/appium-xcuitest-driver --source=github --package=appium-xcuitest-driver
    ```

- Install the XCUITest driver using a Git URL:

    ```
    appium driver install git://github.com/appium/appium-xcuitest-driver.git --source=git --package=appium-xcuitest-driver
    ```

- Install a branch of XCUITest driver repository using a Git URL:

    ```
    appium driver install git://github.com/appium/appium-xcuitest-driver.git#specific-branch --source=git --package=appium-xcuitest-driver
    ```

## `list`

Lists all installed extensions, plus all official extensions that are not installed.

#### Usage

```
appium {driver|plugin} list
```

#### Options

|<div style="width:7em">Argument</div>|Description|Type|
|--|--|--|
|`--installed`|Only list all installed extensions|boolean|
|`--json`|Return the result in JSON format|boolean|
|`--updates`|List all extensions along with information on whether newer versions are available. Only supported for extensions installed via `npm`.|boolean|
|`--verbose`|Show additional details for each extension|boolean|

#### Example

- List all installed drivers and check if they have newer versions available:

    ```
    appium driver list --installed --updates
    ```

## `run`

Runs an extension script, which can assist with setup or perform other tasks. Note that not all
extensions include scripts.

#### Usage

```
appium {driver|plugin} run <extension-name> <script-name> [script-args]
```

|Argument|Description|
|--|--|
|`extension-name`|The short name of the installed extension|
|`script-name`|The name of the script to be run|
|`script-args`|Any additional arguments passed to the script|

#### Options

|Argument|Description|Type|
|--|--|--|
|`--json`|Return the result in JSON format|boolean|

#### Example

- Run the `reset` script included in the UiAutomator2 driver:

    ```
    appium driver run uiautomator2 reset
    ```

## `update`

Updates one or more extensions. Only supported for extensions installed via `npm`. By default,
Appium will only update minor and patch versions, in order to prevent any breaking changes.

#### Usage

```
appium {driver|plugin} update <extension-name>
```

|Argument|Description|
|--|--|
|`extension-name`|The short name of the installed extension, or `installed` to update all installed extensions|

#### Options

|Argument|Description|Type|
|--|--|--|
|`--json`|Return the result in JSON format|boolean|
|`--unsafe`|Allow updates of major versions, which may cause breaking changes|boolean|

#### Examples

- Update the UiAutomator2 driver to its latest major version:

    ```
    appium driver update uiautomator2 --unsafe
    ```

- Update all installed plugins:

    ```
    appium plugin update installed
    ```

## `uninstall`

Removes an installed extension.

#### Usage

```
appium {driver|plugin} uninstall <extension-name>
```

|Argument|Description|
|--|--|
|`extension-name`|The short name of the installed extension|

#### Options

|Argument|Description|Type|
|--|--|--|
|`--json`|Return the result in JSON format|boolean|

#### Example

- Remove the `images` plugin:

    ```
    appium plugin uninstall images
    ```
