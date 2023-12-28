# @appium/images-plugin

> Appium plugin for image comparison, visual testing, and image-based functional testing

## Features

1. **Image Comparison** ([docs](./docs/image-comparison.md)) - A new Appium command and route that allows sending in two different images and comparing them in various ways.
2. **Finding Elements by Image** ([docs](./docs/find-by-image.md)) - Using a template image, find a matching screen region of an app and interact with it via standard Appium element semantics.

## Installation

```
appium plugin install images
```

The plugin must be explicitly activated when launching the Appium server:

```
appium --use-plugins=images
```

## License

Apache-2.0
