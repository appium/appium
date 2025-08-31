---
hide:
  - toc

title: Environment Variables
---

The primary ways of configuring the Appium server are via [Command-Line Arguments](./server.md) or
the [Config File](../../guides/config.md). However, some more advanced features are toggled or
configured via environment variables. To set environment variables, refer to the documentation for
your operating system and terminal.

These are the environment variables that the Appium server understands:

| <div style="width:18em">Variable</div> | Description                                                                                                                                                                                                                                                                             |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `APPIUM_APPS_CACHE_IGNORE_URL_QUERY`   | Set this to a truthy value to remove any query part of a URL when using it as a cache key. See the corresponding [feature request](https://discuss.appium.io/t/regarding-app-caching-when-using-aws-s3-presigned-urls/42713) for more details.          |
| `APPIUM_APPS_CACHE_MAX_AGE`            | Set the maximum age (in minutes) for [cached applications](../../guides/caching.md). Do not set it to a lower number than the duration of a single session startup. Default: `60 * 24` (24 hours) |
| `APPIUM_APPS_CACHE_MAX_ITEMS`          | Set the maximum amount of [cached applications](../../guides/caching.md). Do not set it to a lower number than the amount of apps in all parallel sessions per process. Default: `1024`                                                 |
| `APPIUM_HOME`                          | Set the path to the Appium home directory, which is used for [Managing Extensions](../../guides/managing-exts.md). Default: `.appium` in the home directory of the current user                                                                         |
| `APPIUM_OMIT_PEER_DEPS`                | Set this to `1` to add `--omit=peer` to all the NPM commands run internally by Appium. Mostly an internal feature.                                                                                                                                      |
| `APPIUM_RELOAD_EXTENSIONS`             | Set this to a truthy value to cause Appium to re-require extensions when new sessions are created. This feature is mostly useful for [building extensions](../../developing/build-drivers.md).                                                          |
| `APPIUM_TMP_DIR`                       | Set the path to the directory used for temporary files. Same as the `--tmp` command line argument.                                                                                                                                                      |

Appium drivers and plugins may define additional environment variables. The following variables are
used by official plugins:

| <div style="width:13em">Variable</div> | Plugin    | Description                                                                                                                                                                                                                              |
| -------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `APPIUM_STORAGE_KEEP_ALL`              | `storage` | Set this to `1`, `true` or `yes` to preserve files in the storage after the server process is terminated. By default, stopping the server process also deletes all files in the storage.                 |
| `APPIUM_STORAGE_ROOT`                  | `storage` | Set the path to the directory used for storage. If set to an existing folder, all files in it will be retained after terminating the server, unless specified otherwise using `APPIUM_STORAGE_KEEP_ALL`. |
