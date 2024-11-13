---
hide:
  - toc

title: 服务器环境变量
---

配置Appium服务器的主要方式是通过[命令行参数](./args.md)。然而，一些更高级的功能是通过环境变量切换或配置的。
要设置环境变量，请参阅操作系统和终端的文档。这些是Appium服务器能够理解的环境变量：

|变量&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|描述|
|--------|-----------|
|`APPIUM_HOME`|默认情况下，Appium会在系统用户的主目录中创建一个名为`.appium`的目录。您可以使用此变量调整目录，详见[管理扩展](../guides/managing-exts.md)指南。|
|`APPIUM_TMP_DIR`|默认情况下，Appium的许多操作都使用随机临时目录。如果您希望使用特定目录，可以通过将绝对路径作为此变量的值来实现。该行为相当于使用`--tmp`CLI参数。|
|`APPIUM_PREFER_SYSTEM_UNZIP`|设置为0或false，以要求Appium不要使用系统中包含的unzip二进制文件来解压下载的应用程序或其他文件，而去使用基于JS的unzip库；这有助于解决一些系统中不存在或存在非标准的unzip命令的问题。请注意，如果使用系统库解压失败，无论如何都会尝试回退库，所以设置这个环境变量只是在你知道系统unzip会失败的情况下节省时间。|
|`APPIUM_HOST`|与`--address`CLI参数相同|
|`APPIUM_PORT`|与`--port`CLI参数相同|
|`APPIUM_RELOAD_EXTENSIONS`|设置为1可使Appium在创建新会话时重新加载扩展，这主要适用于[构建扩展](../developing/build-drivers.md)|
|`APPIUM_OMIT_PEER_DEPS`|将`--omit=peer`添加到Appium内部运行的所有NPM命令中，主要是内部特征。|
|`APPIUM_APPS_CACHE_MAX_AGE`|允许设置[缓存应用程序](../guides/caching.md)的最长使用时间（以分钟为单位），默认值为60*24（24小时）；不要将其设置为低于单个会话启动持续时间的数字。|
|`APPIUM_APPS_CACHE_MAX_ITEMS`|允许设置[缓存应用程序](../guides/caching.md)的最大数量，默认值为`1024`；不要将其设置为低于每个进程所有并行会话中的应用程序数量。|
|`APPIUM_APPS_CACHE_IGNORE_URL_QUERY`|如果启用此选项，则应用程序URL中的“搜索”部分将被忽略；有关更多详细信息，请参阅相应的[内容](https://discuss.appium.io/t/regarding-app-caching-when-using-aws-s3-presigned-urls/42713)；默认情况下禁用。|
