# `@appium/typedoc-plugin-appium`

> TypeDoc plugin for [Appium](https://appium.io) & its extensions

## Overview

This package leverages [TypeDoc](https://typedoc.org) to generate command documentation (HTTP endpoints, payload information, etc.) for Appium v2+ drivers and plugins.

## Installation

```bash
npm install appium@next typedoc @appium/typedoc-plugin-appium --save-dev
```

`typedoc` and `appium` are peer dependencies of this package. Newer versions of `npm` will install these automatically (if possible).

## Usage

TypeDoc is configured via a `typedoc.json` or `typedoc.js` file ([read the docs](https://typedoc.org/guides/options/) for more information).

An Appium extension author wishing to generate documentation for their extension will need to create a `typedoc.json`.  At minimum, it should contain:

> TODO: The plugin should be able to detect the entry points automatically, so this should not be necessary

```json
{
  "entryPointStrategy": "packages",
  "entryPoints": [
    "./node_modules/appium",
    "./node_modules/@appium/base-driver",
    "./node_modules/@appium/types",
    "."
  ],
  "name": "<name of extension>",
  "out": "<path to output directory>"
}
```

Once this file is created, you can run `typedoc` to generate the documentation, and it will be output into the `out` directory as configured above.

## Options

This plugin supports all of the options from [typedoc-plugin-markdown](https://npm.im/typedoc-plugin-markdown), as well as the following:

### `commandsDir`

> TODO

### `forceBreadcrumbs`

> TODO

### `outputBuiltinCommands`

> TODO

### `outputModules`

> TODO

## License

Copyright © 2022 OpenJS Foundation. Licensed Apache-2.0

