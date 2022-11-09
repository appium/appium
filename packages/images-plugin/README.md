# Appium Images Plugin

This is an official Appium plugin designed to facilitate image comparison, visual testing, and image-based functional testing.

## Features

1. **Image Comparison** ([docs](./docs/image-comparison.md)) - A new Appium command and route that allows sending in two different images and comparing them in various ways.
2. **Finding Elements by Image** ([docs](./docs/find-by-image.md)) - Using a template image, find a matching screen region of an app and interact with it via standard Appium element semantics.

## Prerequisites
* Appium Server 2.0+

## Installation - Server

Install the plugin using Appium's plugin CLI:

```
appium plugin install images
```

## Installation - Client

No special action is needed to make the features available in the various Appium clients, as this plugin used to be a core Appium feature and its commands are already supported in the official clients.

## Activation

The plugin will not be active unless turned on when invoking the Appium server:

```
appium --use-plugins=images
```

## Usage

Check the docs links above for usage for each of the features provided.
