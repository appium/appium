# @appium/universal-xml-plugin

> Appium plugin for transforming platform-specific XML into a universal syntax

[![NPM version](https://img.shields.io/npm/v/@appium/universal-xml-plugin.svg)](https://npmjs.org/package/@appium/universal-xml-plugin)
[![Downloads](https://img.shields.io/npm/dm/@appium/universal-xml-plugin.svg)](https://npmjs.org/package/@appium/universal-xml-plugin)

This plugin takes the XML page source retrieved using an iOS or Android driver, and changes various
node and attribute names to use common terminology that can apply to both platforms.

## Motivation

Having compatibility between iOS and Android XML sources can simplify creation of cross-platform tests.

## Installation

```
appium plugin install universal-xml
```

## Usage

Like all plugins, this plugin must be explicitly activated when launching the Appium server:

```
appium --use-plugins=universal-xml
```

Once the plugin is running, it will intercept and transform the app source retrieved by the Get Page
Source command, as well as element node/attribute names provided in Find Element-related commands.

## API

[Refer to the Appium documentation](https://appium.io/docs/en/latest/reference/api/plugins/#universal-xml-plugin).

## Examples

### Node names
|iOS|Android|Transformed|
|-|-|-|
|`XCUIElementTypeButton`|`android.widget.Button`|`Button`|
|`XCUIElementTypeAlert`|`android.widget.Toast`|`Alert`|
|`XCUIElementTypeSwitch`|`android.widget.Switch`|`SwitchInput`|

See [the mapping file](./lib/node-map.js) for a full list of node name translations. Any names not
specified are left as-is.

### Attribute names
|iOS|Android|Transformed|
|-|-|-|
|`name`|`content-desc`|`axId`|
|`label`|`text`|`text`|
|`visible`|`displayed`|`visible`|

Note that this plugin also removes a few attributes from the transformed XML. See
[the mapping file](./lib/attr-map.js) for a full list of attribute name translations and removed
attributes. Any names not specified are left as-is.

## License

Apache-2.0
