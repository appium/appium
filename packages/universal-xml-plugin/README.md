# @appium/universal-xml-plugin

> Appium plugin for transforming platform-specific XML into a universal syntax

[![NPM version](http://img.shields.io/npm/v/@appium/universal-xml-plugin.svg)](https://npmjs.org/package/@appium/universal-xml-plugin)
[![Downloads](http://img.shields.io/npm/dm/@appium/universal-xml-plugin.svg)](https://npmjs.org/package/@appium/universal-xml-plugin)

This plugin takes the XML page source retrieved using an iOS or Android driver, and changes various
node and attribute names to use common terminology that can apply to both platforms. This is
achieved by altering the behavior of the `getPageSource` and `findElement` methods.

## Motivation

Having compatibility between iOS and Android XML sources can simplify creation of cross-platform tests.

## Installation

```
appium plugin install universal-xml
```

The plugin must be explicitly activated when launching the Appium server:

```
appium --use-plugins=universal-xml
```

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
