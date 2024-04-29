---
hide:
  - toc

title: Server Environment Variables
---

The primary way of configuring the Appium server is via [Command-Line Arguments](./args.md). However, some more
advanced features are toggled or configured via environment variables. To set environment
variables, refer to the documentation for your operating system and terminal. These are the
environment variables that the Appium server understands:

|Variable&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|Description|
|--------|-----------|
|`APPIUM_HOME`|By default, Appium creates a directory called `.appium` in the home directory for your system user. You can adjust the directory with this variable, as detailed in the [Managing Extensions](../guides/managing-exts.md) guide.|
|`APPIUM_TMP_DIR`|By default, Appium uses a random temporary directory for many of its operations. If you wish to use a specific directory, you may do so by including an absolute path as the value of this variable. The behaviour is equivalent to using the `--tmp` CLI arg.|
|`APPIUM_PREFER_SYSTEM_UNZIP`|Set to `0` or `false` to request that Appium not use the `unzip` binary included on your system for unzipping downloaded apps or other artifacts. Instead it will use a JS-based unzip library. This could help on some systems with non-existent or non-standard `unzip` commands. Note that if unzipping fails using the system library, the fallback library will be attempted in any case, so setting this env var merely saves time in the event you know the system unzip will fail.|
|`APPIUM_HOST`|Same as the `--address` CLI arg|
|`APPIUM_PORT`|Same as the `--port` CLI arg|
|`APPIUM_RELOAD_EXTENSIONS`|Set to `1` to cause Appium to re-require extensions when new sessions are created. This is mostly useful for [building extensions](../developing/build-drivers.md)|
|`APPIUM_OMIT_PEER_DEPS`|Adds `--omit=peer` to all the NPM commands run internally by Appium. Mostly an internal feature.|
|`APPIUM_APPS_CACHE_MAX_AGE`|Allows to set the maximum age (in minutes) for [cached applications](../guides/caching.md). The default value is `60 * 24` (24 hours). Do not set it to a lower number than the duration of a single session startup.|
|`APPIUM_APPS_CACHE_MAX_ITEMS`|Allows to set the maximum amount of [cached applications](../guides/caching.md). The default value is `1024`. Do not set it to a lower number than the amount of apps in all parallel sessions per process.|
