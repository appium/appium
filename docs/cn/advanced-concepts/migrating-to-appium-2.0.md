# 从 Appium1.x 迁移到 Appium2.x

如果你正在使用 Appium1.x，并期望迁移至 Appium2.x，这份文档可以作为您的迁移指南。它包含了一系列我们重大变化的修改、您如何改变您的环境或测试套件来对 Appium2.0进行兼容。

## Appium 2.0 概述

Appium 2.0 是 Appium 近5年来最重要的新版本。首先，Appium2.0 最大的变化，*并不是* 对不同平台上的测试行为发生了改变。相反的，Appium 2.0 将Appium 重新定义为一个*平台*,它（Appium2.0）让驱动 (driver)（引入对给定平台自动化支持的代码项目）、插件（plugin）（允许覆盖、修改、扩展或向Appium添加行为的代码项目）变得更易创建与分享。

与此同时，Appium项目正在利用这个机会删除许多旧的和被弃用的功能。

这些都对Appium的安装方式、驱动程序和各种特性的管理方式以及协议支持等方面带来了一些重大变化。以下是详细说明。

## 重大变化

查看[Appium 2.0发布说明](https://github.com/appium/appium/releases/tag/v2.0.0-beta)以获得更全面的变更列表。这里有我们所郑重展示的重大变化，与您需要为他们做的一些事情。

#### :bangbang: 在准备过程中安装需要的驱动（drivers）

如果您使用过 Appium1.x，所有的能支持使用的驱动（driver）都会在同一时间通过Appium主服务安装好。现在已经不是这样了。简单地安装 Appium 2.0(例如，通过' npm install -g Appium ')，将只会安装没有任何驱动（driver）的 Appium 的主服务。如果想要安装驱动（driver），您必须使用新的 [Appium 扩展命令行工具（Appium extension CLI）](../drivers/driver-cli.md)。例如，要安装XCUITest和UiAutomator2驱动程序的最新版本，在安装Appium之后，您将运行以下命令:

```
appium driver install xcuitest
appium driver install uiautomator2
```

执行安装命令后，您的驱动程序已经安装就绪。使用这个CLI可以做的事情还有很多，所以一定要查看它的文档。
如果您正在CI环境中运行，或期望在安装后接着安装一些驱动（driver），可以在安装时添加一些参数，如：

```
npm install -g appium --drivers=xcuitest,uiautomator2
```

这将为您一次性安装Appium和两个驱动程序。

#### :bangbang: 驱动（driver）更新

在过去，要更新 iOS 或 Android 驱动程序，你只需等待这些更新被整合到新发行的 Appium 中，然后更新你的 Appium 版本。在 Appium2.0，Appium 服务器和Appium 驱动（driver）的版本和发布是分开的。这意味着驱动（driver）的更新可以按照驱动本身的发布节奏进行发布，您可以在驱动程序更新发生时进行更新，而不是等待新的Appium服务器发布。检查驱动程序更新的方法是使用CLI:

```
appium driver list --updates
```

如果有任何驱动（driver）可以更新了，你可以对任何给定的驱动（driver）执行' update '命令:

```
appium driver update xcuitest
```

要更新 Appium 服务器本身，您需要执行与过去相同的操作:' npm install -g Appium '。现在，安装新版本的 Appium 服务器将不会影响您的驱动程序，因此整个过程将会更快。

#### :bangbang: 协议的变更

Appium 的 API 基于[W3C WebDriver协议](https://www.w3.org/TR/webdriver/)，并且多年来一直遵循该协议。在 W3C WebDriver 协议被设计成 web 标准之前，Selenium 和 Appium 都曾使用了其他几个协议。这些协议是 "JSONWP" (JSON有线协议) 和 "MSJONWP"(移动JSON有线协议)。W3C协议与(M)JSONWP协议有几处不同。

在Appium 2.0之前，Appium支持这两种协议，因此较老的Selenium/Appium客户端（client）仍然可以与较新的Appium服务器通信。今后，对旧协议的支持将被移除。

:bangbang: *功能*

新旧协议之间的一个重要区别是功能的格式。以前称为“所需的功能”，现在简单地称为“功能”，现在对任何非标准功能都需要一个所谓的“供应商前缀”。标准的功能列表在[WebDriver协议规范](https://www.w3.org/TR/webdriver/#capabilities)中给出，包括一些常用的功能，如“browserName”和“platformName”。

这些标准功能仍可以按原来的方式使用。但是所有功能的名称中必须包含一个“供应商前缀”。vendor前缀是一个冒号后面的字符串，例如' appium: '。Appium的大多数功能都超出了标准的W3C功能，因此必须包含供应商前缀(我们建议您使用' appium: '，除非文档另有指示)。例如:

* `appium:app`
* `appium:noReset`
* `appium:deviceName`

针对Appium 2.0的测试套件来说，这些改变，可能是也可能不是一个重大的变化。如果你正在使用一个已经适配更新的 Appium 客户端（如：Appium-java-client等），客户端会在所有必要的功能上为你添加' appium: '前缀。新版本的Appium Inspector工具（如：Appium Desktop 或 Appium inspector）也会这样做。
基于云的Appium提供商也可能这样做。因此，只要注意：如果您得到提示消息，说您的功能缺少供应商前缀，这就是解决问题的方法。

另外，使用不支持W3C协议的WebDriver客户端启动Appium会话将不再允许(请参阅下面关于WD库这种效果的注释)。

为了让每个人的生活更容易一些，我们还引入了一个选项，将所有与appium相关的功能打包到一个对象功能中，即 "appium:options"。你可以将任何你通常会在这个功能上添加' appium: '前缀的东西捆绑在一起。以下是一个关于如何在Safari浏览器上使用 "appium:options" 启动 iOS 会话的示例(基于原始JSON):

```json
{
    "platformName": "iOS",
    "browserName": "Safari",
    "appium:options": {
        "platformVersion": "14.4",
        "deviceName": "iPhone 11",
        "automationName": "XCUITest"
    }
}
```

(当然，每个客户端都有不同的方式来创建结构化功能，如“appium:options”或其他你可能见过的功能，如“goog:chromeOptions”)。注意:在“appium:options”中显示的能力将覆盖在对象顶层显示的相同名称的能力。

:bangbang: *被删除的命令*

那些旧的JSON有线协议的一部分，并且不是W3C协议的一部分的命令不再可用:

* TODO (这些命令正在被归纳和删除，完成后将在这里进行更新)

如果您使用最新的 Appium 或 Selenium 客户端（client），那么无论如何您都不应该再访问这些文件，因此任何重大的改变都会首先在客户端体现。

#### :bangbang: 图像分析功能移至插件（plugin）

Appium 2.0 的设计目标之一，是将非核心特性迁移到称为[插件（plugins）](#TODO)的特殊扩展中。这会让大家选择性地、按需地花费功夫去安装并设置这些。
Appium 的各种图像相关特性(图像比较、根据图像查找元素等)已经转移到官方支持的插件[图像插件（images）](https://github.com/appium/appium-plugins/tree/master/packages/images)中。

如果您使用了这些与图像相关的方法，并且需要继续使用它们，您需要做两件事。
1. 安装插件:`appium plugin install images`
2. 确保你启动了Appium服务器，通过在命令行指定的插件列表中包含它来运行插件，例如，`appium --plugins=images`

与图像相关的命令也将在客户端删除，这意味着您需要按照插件README上的说明安装客户端插件来访问这些功能。

#### :bangbang: 删除一些旧的驱动（driver）

The old iOS and Android (UiAutomator 1) drivers and related tools (e.g., `authorize-ios`) have been removed. They haven't been relevant for many years anyway.

旧版本的 iOS 与 Android 驱动（driver）(UiAutomator 1) 及相关联的工具（如：`authorize-ios`）已经被删除。他们已经很多年不被使用了。

#### :warning: 内部包重命名

一些 appium 内部的 NPM 包被重命名 （如：`appium-base-driver` 改为 `@appium/base-driver`）。这并不是一个突破性的变化，只是为了那些已经构建了直接合并Appium代码的软件的人来进行了解。

#### :warning: 不再支持“WD”JavaScript客户端库

多年来，Appium的一些作者维护了[WD](https://github.com/admc/wd)客户库。此库已弃用，并没有更新以与W3C WebDriver协议一起使用。因此，如果您正在使用这个库，您将需要转向一个更新的库。我们建议(WebdriverIO) (https://webdriver.io)。

#### :warning: 将 Appium 检查器（Appium Inspector）从 Appium Desktop 中分离出来

Appium Desktop 的检查器部分（查看页面元素树的功能）已经转移到它自己的app，Appium 检查器（Appium Inspector）: [github.com/appium/appium-inspector](https://github.com/appium/appium-inspector)。它完全兼容Appium 2.0服务器。如果您只需要对页面元素树进行检查与操作，那么下载并运行检查器单独的app即可，不需要一定得下载GUI 版本的 Appium Desktop了。Appium Desktop 仍在原来的地方维护中，[github.com/appium/appium-desktop](https://github.com/appium/appium-desktop)。只是它不再会与检查器完全捆绑在一起了。

您也可以不需要下载 Appium 检查器（Appium Inspector），直接从网页访问[web version of Appium Inspector](https://inspector.appiumpro.com)。注意，要针对本地服务器进行测试，您需要使用`--allow-cors`启动服务器，以便基于浏览器的Appium Inspector可以访问您的Appium服务器来启动会话。

## 重要的新特性

除了上面提到的重大变化之外，本节列出了一些您也许会喜欢的 Appium 2.0 重要的新特性。

#### 插件（Plugins）

:tada: *服务端插件（Server Plugins）*

TODO

:tada: *客户端插件（Client Plugins）*

TODO

#### :tada: 从任何地方下载驱动（driver）与插件（plugin）

TODO

#### :tada: 驱动（driver）与插件（plugin）的命令行参数

TODO

## 云提供商的特别说明

本文之外的地方一般是Appium的通用部分，但Appium 2.0中的一些架构更改将对与Appium相关的服务提供商(无论是基于云的Appium主机还是内部服务)构成重大变化。最终，Appium服务器的维护者负责安装和提供终端用户可能希望使用的各种Appium驱动程序和插件。

有了 Appium 2.0，我们进入了一个新时代，终端用户可以使用各种独立版本的驱动（driver）和插件（plugin）。在 Appium 1.x 上，这是无法实现的。因为任何给定的 Appium 版本都会包含且仅包含每个驱动（driver）的一个版本。当然，这取决于每个服务提供商希望如何实现任何官方或第三方驱动程序或插件的发现、安装和可用性。但 Appium 团队希望就服务提供商支持的功能提出建议，以确保整个行业的一致性。这只是一个建议，而不是一个标准，但是采用它将帮助用户应对在云环境中使用 Appium 2.0 可能带来的日益增加的复杂性。

### 建议使用的功能

除了标准的`platformName`, `appium:deviceName`, `appium:automationName`, 与 `appium:platformVersion`,我们建议使用 `$cloud:appiumOptions`, 当标签为：`$cloud` 并不是要直接按这个写，而是应该被你的供应商前缀替换(举几个例子，HeadSpin应该是' HeadSpin '， Sauce Labs应该是' Sauce '， BrowserStack应该是' BrowserStack ')。`appium:platformVersion` 功能本身将是一个JSON对象，具有以下内部key:

|能力（Capability）|作用域（Used for）|示例（Example）|
|----------|-------|-------|
|`version`|指定用于托管和管理驱动程序的 Appium 服务器版本。如果不写，按提供商提供的为准，但建议提供最新的官方版本|`2.0.0`|
|`automationVersion`|指定应该使用指定驱动程序的哪个版本。|`1.55.2`|
|`automation`|指定要使用的自定义驱动程序(参见下面的更多信息)。将会覆盖： `appium:automationName` and `$cloud:automationVersion`|`{"name": "org/custom-driver", "source": "github", "package": "custom-driver"}`|
|`plugins`|指定要激活的插件列表(以及可能的插件版本)(参见下面的更多信息)。|`["images", "universal-xml"]`|

### 基础示例

Appium扩展(驱动程序和插件)有一组属性，指定它们可以从哪里安装。云提供商显然没有义务为任意指定的扩展提供支持，因为这些扩展可能使得在托管环境中运行的不可信代码。在不支持任意扩展的情况下，`appium:automationName`, `$cloud:automationVersion`, 与 `$cloud:appiumPlugins`的功能应该足够了。以下JSON对象表示会话的功能:

```json
{
    "platformName": "iOS",
    "appium:platformVersion": "14.4",
    "appium:deviceName": "iPhone 11",
    "appium:app": "Some-App.app.zip",
    "appium:automationName": "XCUITest",
    "$cloud:appiumOptions": {
        "appiumVersion": "2.0.0",
        "automationVersion": "3.52.0",
        "plugins": ["images"],
    }
}
```
这组功能参数，指示 Appium 2.0 服务器支持 `3.52.0` 版本的 XCUITest 驱动程序，并激活`images`插件。云提供商很容易验证这个集合。显而易见，云提供商可以通过这些功能参数，做任何它想做的事情来响应这些功能，包括：动态下载Appium、驱动程序和插件包，或者如果请求的版本不在一个支持的集中，或者提示插件不支持，等等……

### `appium:options`的基础示例

前面的例子看起来仍然有点混乱，所以我们当然也建议云提供商支持 `appium:options` 参数，就像上面详细描述的那样，这可以将之前的功能集变成以下参数:

```json
{
    "platformName": "iOS",
    "appium:options": {
        "platformVersion": "14.4",
        "deviceName": "iPhone 11",
        "app": "Some-App.app.zip",
        "automationName": "XCUITest",
    },
    "$cloud:appiumOptions": {
        "appiumVersion": "2.0.0",
        "automationVersion": "3.52.0",
        "plugins": ["images"],
    }
}
```

### 扩展对象

一些服务提供商可能希望动态地允许访问 Appium 2.0 CLI 的所有特性，包括下载任意驱动程序和插件。为了支持使用这些扩展，我们可以定义特殊的JSON“扩展对象”，关键字如下:

* `name`: 扩展名。这是一个NPM包名(如果是从NPM下载)，或者是一个git或GitHub规格(如果是从git服务器或GitHub下载)。
* `version`: 扩展的版本，例如NPM包版本或Git SHA。
* (optional) `source`: 扩展可以从哪里下载的表示。建议支持以下值: `appium`, `npm`, `git`, `github`。 这里的： `appium` 表示" Appium 自己的官方列表"，如果不包含此key，`appium` 则应该是默认值。
* (optional) `package`: 当从git或github下载扩展时，扩展的NPM包名也必须提供。对于非git源，这是可选的。

由于每个会话都由单个驱动程序处理，`$cloud:appiumOptions`/`$automation` 功能参数可以与扩展对象值一起使用，以表示该驱动程序，例如:

```json
{
    ...,
    "$cloud:appiumOptions": {
        ...,
        "automation": {
            "name": "git+https://some-git-host.com/custom-driver-project.git",
            "version": "some-git-sha",
            "source": "git",
            "package": "driver-npm-package-name"
        },
        ...
    },
    ...
}
```

由于会话可以处理多个插件，`$cloud:appiumPlugins` 列表中的每个值也可以是一个扩展对象，而不是字符串，这样就可以请求特定的版本:

```json
{
    ...,
    "$cloud:appiumOptions": {
        ...,
        "plugins": [{
            "name": "images",
            "version": "1.1.0"
        }, {
            "name": "my-github-org/my-custom-plugin",
            "version": "a83f2e",
            "source": "github",
            "package": "custom-plugin"
        }],
        ...,
    }
    ...
}
```
这些都是本文建议的说明性示例。当然，要由服务提供商在他们的前端/负载均衡器上实现对这些功能的处理，去完成任何情况下的错误检查，或运行任何一个用户请求的`appium driver` 或 `appium plugin` 。本节只是关于服务提供商如何设计他们面向用户的功能 API 的建议，如果他们自己运行 Appium，原则上支持 Appium 为最终用户提供的所有功能。
