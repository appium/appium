## Appium 2.0 驱动的命令行工具 Command Line Interface (CLI)

Appium 将使用某种利用自动化技术，实现某个平台自动化的软件称为"驱动程序(driver)"。包括 iOS、Android 及其他平台。在 Appium 2.0 上，将不会您下载 Appium 时，按以往那样，默认下载所有驱动（driver）。因为这样被下载的驱动太多了。取而代之的，是您可以使用一个特殊的命令行来指导 Appium 为您安装和注册驱动程序，以便能够真正用到您需要的驱动。本文档强调了该界面中可用的各种命令。

### 概述

所有这些命令都可以在输入`appium driver`后使用。例如，在本文档中，定义为`list`的命令将以以下方式使用:

```
appium driver list
```

*公共参数*

这里有些所有命令都可用的公共参数:

|参数|描述|默认值|
|----|-----------|-------|
|`-ah`, `--home`, `--appium-home`|设置 APPIUM_HOME 目录的路径，该目录将安装驱动程序和插件，并将维护驱动程序/插件清单，|如果设置了该参数，默认值为设置的地址，否则默认地址为：`$HOME/.appium`|
|`--json`|只输出JSON格式的命令返回结果，而不输出人们可读的日志信息|默认值为false。通过包含此标志设置为true。|

### `list`

该命令无参数时，按名称列出可安装的驱动程序，以及通过任何方式安装的驱动。

|参数|描述|默认值|
|----|-----------|-------|
|`--installed`|只展示已安装的|否|
|`--updates`|对于通过NPM安装的驱动程序，检查并显示任何更新|否|

|示例|描述|
|-------|-----------|
|`appium driver list`|列出可用的驱动程序|
|`appium driver list --installed`|列出已安装的驱动程序|
|`appium driver list --updates`|列出已安装且可更新的驱动程序|

### `install`

该命令使用驱动名称或规格，或来源标识（如果它不是正式驱动程序）来作为参数，

|参数|描述|默认值|
|----|-----------|-------|
|`--source`|如果不是官方驱动，可以按以下几种方式之一来表示: `npm`, `local`, `github`, `git`|None|

注意，对于任何通过NPM安装的驱动程序（包括官方驱动程序，以及使用`--source=npm`安装的驱动），你可以在驱动程序名称后面使用任何有效的NPM安装规范，如：`xcuitest@2.1.2` 将会安装指定版本的XCUITest驱动程序。

|示例|描述|
|-------|-----------|
|`appium driver install xcuitest`|下载安装官方 XCUITest 驱动|
|`appium driver install xcuitest@2.1.2`|下载安装官方指定版本的 XCUITest 驱动|
|`appium driver install --source=npm appium-fake-driver`|通过 NPM 下载安装 `appium-fake-driver` |
|`appium driver install --source=github appium/appium-fake-driver`|从 github 下载安装 `appium-fake-driver` 驱动|
|`appium driver install --source=local /path/to/driver/directory`|从本地文件安装|

### `update`

该命令通过添加已经安装的驱动名称，或关键词 `installed`，来自动更新一个或所有的驱动(如果用了： `installed`)。

注意：这将更新驱动程序到最高可用的小版本（minor version），但将*不*更新到新的大版本（major version）。因为可能包含一些重大变化。如果期望更新到大版本，使用参数：`--unsafe` 

|参数|描述|默认值|
|----|-----------|-------|
|`--unsafe`|更新到一个大版本|None|

|示例|描述|
|-------|-----------|
|`appium driver update xcuitest`|更新 XCUITest 驱动到最新的安全版本|
|`appium driver update installed`|更新所有已安装的驱动到最新的安全版本|
|`appium driver update --unsafe xcuitest`|更新 XCUITest 驱动到最新版本 (即使是最新的大版本)|

### `uninstall`

删除一个驱动.

|示例|描述|
|-------|-----------|
|`appium driver uninstall xcuitest`|删除 XCUITest 驱动|
