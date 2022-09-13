---
title: The Extension CLI
---

Appium allows for the flexible installation and management of _drivers_ (which provide Appium with
the capability to automate a given platform) and *plugins* (which can augment or alter the way
individual Appium commands work). For a conceptual understanding of these entities, please review
the [Introduction](../intro/index.md). Management of drivers and plugins is handled by Appium's
Extension CLI.

!!! note

    This reference uses placeholders to refer to various options. Anywhere you see one of these
    placeholders in the reference, ensure you replace it with the correct type of actual content.

|Placeholder|Meaning|
|--|--|
|`<ext-type>`|"Extension type". It should be either `driver` or `plugin`. All the Extension CLI commands can be used with either drivers or plugins, so you must specify which type of extension will be used|
|`<ext-name>`|"Extension name". This is the short name of the extension found in a call to `appium <ext-type> list`. This is distinct from the NPM package name of the extension or, in general, the "install spec" of the extension.|
|`<install-spec>`|"Install specification". This refers to the string used to indicate what extension Appium should install.|
|`<install-source>`|This refers to the method that Appium should use to install an extension.|

## Commands

All Extension CLI commands begin with `appium <ext-type>`, i.e., either `appium driver` or `appium
plugin`.

All Extension CLI commands can take an optional `--json` argument, which will return the result of
the command as a machine-readable JSON string rather than the standard output, which is colourized
and tuned for human consumption.

### `list`

List installed and available extensions. "Available" extensions include those which are officially
recognized by the Appium team, but you are not limited to installing only the extensions displayed
in this list.

Usage:

```
appium <ext-type> list [--installed] [--updates] [--json]
```

Required arguments:

- `<ext-type>`: must be `driver` or `plugin`

Optional arguments:

- `--installed`: show only installed extensions, not installed plus available extensions
- `--updates`: for extensions installed via NPM, display a message if there are any updates
- `--json`: return the result in JSON format

### `install`

Install an extension. If successful, respond with the short name of the extension which can be used
in other invocations of the Extension CLI. If the extension is a driver, also note which platforms
may be used with the driver.

Usage:

```
appium <ext-type> install <install-spec> [--source=<install-source>] [--package=<package-name>] [--json]
```

Required arguments:

- `<ext-type>`: must be `driver` or `plugin`
- `<install-spec>`: this is the name, location, and/or version of the extension you want to
  install. Its possible values are dependent on the `<install-source>` (see below).

Optional arguments:

- `--source`: this directs Appium where to find your extension. See below for a table of possible
  source types and corresponding install specification.
- `--package`: when `<install-source>` is `git` or `github`, `--package` is required. It should be
  the Node.js package name of the extension. Without this information, Appium will not be able to
  find the installed package.
- `--json`: return the result in JSON format

|Install source type|Behaviour|
|--|--|
|None|This is the default behaviour when no `--source` is used. In this case, Appium will look at `<install-spec>` and match it against the name of extensions available when running `appium <ext-type> list`, i.e., against the officially recognized extension names. If found, it will install that extension at the latest version via NPM|
|`npm`|Install an extension based on its NPM package name. Here, `<install-spec>` must be the NPM package name with any additional NPM installation modifiers, like version (see below)|
|`github`|Install an extension via a GitHub spec of the form `<org>/<repo>`|
|`git`|Install an extension via a Git URL (e.g., `git+ssh://git-host.com/repo.git`)|
|`local`|Install an extension via a local path. This must be a path to the directory where the Node.js package information for the driver is located.|

#### NPM-based `<install-spec>`

When Appium is installing an extension via NPM (as is the case when `--source` is either omitted or
set to `npm`), the `<install-spec>` can be complex, and can include any kind of information allowed
by `npm install`:

- `[@scope]/<name>`
- `[@scope]/<name>@<version>`
- `[@scope]/<name>@<tag>`
- `[@scope]/<name>@<version range>`

#### Examples

- Install the latest XCUITest driver:

    ```
    appium driver install xcuitest
    ```

- Install the XCUITest driver at version 4.11.1:

    ```
    appium driver install xcuitest@4.11.1
    ```

- Install the `beta` version of the `@appium/fake-driver` from NPM:

    ```
    appium driver install --source=npm @appium/fake-driver@beta
    ```

- Install a locally-developed plugin:

    ```
    appium plugin install --source=local /path/to/my/plugin
    ```

### `update`

Update one or more extensions that have been installed via NPM. By default, Appium will not
automatically update any extension that has a revision in its major version, so as to prevent
unintended breaking changes.

Usage:

```
appium <ext-type> update <ext-name> [--unsafe] [--json]
```

Required arguments:

- `<ext-type>`: must be `driver` or `plugin`
- `<ext-name>`: the name of the extension to update, or the string `installed` (which will update
  all installed extensions)

Optional arguments:

- `--unsafe`: direct Appium to go ahead and update passed a major version boundary
- `--json`: return the result in JSON format

### `uninstall`

Remove an installed extension.

Usage:

```
appium <ext-type> uninstall <ext-name> [--json]
```

Required arguments:

- `<ext-type>`: must be `driver` or `plugin`
- `<ext-name>`: the name of the extension to uninstall

Optional arguments:

- `--json`: return the result in JSON format

### `run`

Run a script included in an extension package. Extension authors can include runnable scripts that
assist with setup or perform other tasks. These scripts are given names (called the `<script-name>`
in this reference) by extension authors and will generally be documented in extension
documentation.

Usage:

```
appium <ext-type> run <ext-name> [--json] <script-name> [script-args]
```

Required arguments:

- `<ext-type>`: must be `driver` or `plugin`
- `<ext-name>`: the name of the extension whose script you want to run
- `<script-name>`: the name of the script the extension has published

Optional arguments:

* `script-args`: any arguments that Appium does not interpret as belonging to its own set of
  arguments will be passed along to the extension script
- `--json`: return the result in JSON format

Example (run the `reset` script included with the UiAutomator2 driver):

```
appium driver run uiautomator2 reset
```
