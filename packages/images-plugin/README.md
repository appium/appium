# @appium/images-plugin

> Appium plugin for image comparison, visual testing, and image-based functional testing

[![NPM version](https://img.shields.io/npm/v/@appium/images-plugin.svg)](https://npmjs.org/package/@appium/images-plugin)
[![Downloads](https://img.shields.io/npm/dm/@appium/images-plugin.svg)](https://npmjs.org/package/@appium/images-plugin)

This plugin provides two features for image-based testing:

1. [**Image Comparison**](./docs/image-comparison.md) - A new Appium endpoint that allows accepts two images and allows comparing them in various ways
2. [**Finding Elements by Image**](./docs/find-by-image.md) - Using a template image, find a matching screen region of an app, and interact with it using standard Appium element commands

## Installation

```
appium plugin install images
```

## Usage

Like all plugins, this plugin must be explicitly activated when launching the Appium server:

```
appium --use-plugins=images
```

Once the plugin is running, you can use its new and modified endpoints as described in the
aforementioned guides.

## API

[Refer to the Appium documentation](https://appium.io/docs/en/latest/reference/api/plugins/#images-plugin).

## License

Apache-2.0
