# `@appium/typedoc-plugin-appium`

> TypeDoc plugin for [Appium](https://appium.io) & its extensions

## Overview

This package leverages [TypeDoc](https://typedoc.org) to generate command documentation (HTTP endpoints, payload information, etc.) for Appium v2+ drivers and plugins.

## Important Note

_If you are an Appium extension author and just want to build HTML docs_, **don't install this directly**--instead, install [`@appium/docutils`](https://github.com/appium/appium/tree/master/packages/docutils), which is a higher-level package that configures everything for you.

If you _only_ want to build markdown docs for your extension, then you can use this package directly.

## Installation

`npm` v8+ is required to install this package.

```bash
npm install @appium/typedoc-plugin-appium --save-dev
```

The above command installs the plugin as well as all necessary peer dependencies.  See [`package.json`](https://github.com/appium/appium/blob/master/packages/docutils/package.json) for the full list of dependencies.

## Usage

TypeDoc is configured via a `typedoc.json` or `typedoc.js` file ([read the docs](https://typedoc.org/guides/options/) for more information).

An Appium extension author wishing to generate markdown documentation for their extension will need to create a `typedoc.json`.  At minimum, it should contain:

```json
{
  "entryPointStrategy": "packages",
  "entryPoints": ["."],
  "name": "<name of extension>",
  "theme": "appium",
  "out": "<path to output directory>"
}
```

Once this file is created, you can run `typedoc` to generate the documentation, and it will be output into the `out` directory as configured above.

## Options

This plugin supports all of the options from [typedoc-plugin-markdown](https://npm.im/typedoc-plugin-markdown), as well as the following:

### `outputModules`

`boolean` - Output module, class, interface, and other type information (the usual TypeDoc output) in addition to command documentation. This is needed for full documentation of types. _Default value: `true`_

### `outputBuiltinCommands`

`boolean` - Outputs _all_ commands and types from Appium builtins--not just your extension. This is intended to be used by Appium itself.  _Default value: `false`_

### `packageTitles`

`Array<{name: string, title: string}>`: An array of objects containing module name `name` and display name `title`. By default, the module name is used for the title; use this to override that behavior.  _Default value: `undefined`_

### `commandsDir`

`string` - The name of the "commands" directory relative to the TypeDoc output directory (`out`).  _Default value: `commands`_

### `forceBreadcrumbs`

`boolean` - Forces breadcrumbs to be output; overrides `hideBreadcrumbs` from `typedoc-plugin-markdown`.  _Default value: `false`_

## Development

This packages uses snapshot tests to assert the generated markdown is correct.  If you have made changes which affect the plugin's output, you will need to update the snapshots.

To update the snapshots, execute:

```bash
UPDATE_SNAPSHOT=1 npm run test:e2e
```

This will (likely) modify the snapshots in your working copy, so you will then need to commit them.

## License

Copyright © 2022 OpenJS Foundation. Licensed Apache-2.0

