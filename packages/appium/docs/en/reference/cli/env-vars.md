---
hide:
  - toc

title: Environment Variables
---

The primary ways of configuring the Appium server are via [Command-Line Arguments](./args.md) or
the [Config File](../../guides/config.md). However, some more advanced features are toggled or
configured via environment variables. To set environment variables, refer to the documentation for
your operating system and terminal.

These are the environment variables that the Appium server understands:

|<div style="width:18em">Variable</div>|Description|
|--------|-----------|
|`APPIUM_HOME`|Set the path to the Appium home directory, which is used for [Managing Extensions](../../guides/managing-exts.md). The default value is a directory called `.appium` in the home directory for your system user.|
|`APPIUM_TMP_DIR`|Set the path to the directory Appium can use to manage temporary files. Same as the `--tmp` command line argument.|
|`APPIUM_RELOAD_EXTENSIONS`|Set this to `1` to cause Appium to re-require extensions when new sessions are created. This feature is mostly useful for [building extensions](../../developing/build-drivers.md).|
|`APPIUM_OMIT_PEER_DEPS`|Set this to `1` to add `--omit=peer` to all the NPM commands run internally by Appium. Mostly an internal feature.|
|`APPIUM_APPS_CACHE_MAX_AGE`|Set the maximum age (in minutes) for [cached applications](../../guides/caching.md). The default value is `60 * 24` (24 hours). Do not set it to a lower number than the duration of a single session startup.|
|`APPIUM_APPS_CACHE_MAX_ITEMS`|Set the maximum amount of [cached applications](../../guides/caching.md). The default value is `1024`. Do not set it to a lower number than the amount of apps in all parallel sessions per process.|
|`APPIUM_APPS_CACHE_IGNORE_URL_QUERY`|Set this to `1` to remove the query part of the URL when used as a cache key. See the corresponding [feature request](https://discuss.appium.io/t/regarding-app-caching-when-using-aws-s3-presigned-urls/42713) for more details. Disabled by default.|
