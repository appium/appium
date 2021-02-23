# Appium Plugins

This is a monorepo containing code and documentation for Appium plugins maintained by the core Appium team. Plugins are little programs which can be added to an Appium installation and activated, for the purpose of extending or modifying the behavior of pretty much any aspect of Appium. Plugins are available with Appium as of Appium 2.0.

To install an Appium plugin, use the Plugin CLI, for example:

```
appium plugin list
appium plugin install images
```

The above commands will list officially-supported plugins, which you can then install via name. You can install unofficial plugins from pretty much any source as well. For more information check out the [Appium Extension CLI docs](#TODO). To activate an installed plugin so that it has an effect for the running server, make sure to include it in the list of activated plugins when starting the server:

```
appium --plugins=images,fake
```

For information and documentation about each plugin hosted in this repo, head to the individual READMEs:

* [Base plugin](packages/base) - A plugin designed to facilitate the building of other plugins--not to be installed directly by end users
* [Images plugin](packages/images) - A plugin containing image-related functionality, such as the ability to compare images or to find screen regions based on image templates
* [Fake plugin](package/fake) - A minimal plugin that does nothing useful but demonstrates how plugins are built. Mostly used for testing.

# Developer

To run:

```
npm run clean
```

or

```
npm run bootstrap
npm install
npm run build
```