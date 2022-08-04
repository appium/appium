---
title: 自 Appium 1.x 迁移到 Appium 2.x
---
本文档是针对使用 Appium 1.x 并希望迁移到 Appium 2.x 的用户的指南. 
其包含重大更改的列表, 以及如何迁移您的环境或测试套件以确保与Appium 2.0的兼容性. 

## Appium 2.0 概述

Appium 2.0 是Appium近5年来最重要的新版本. 
Appium 2.0 中的更改主要与特定平台的自动化行为更改 _无_ 关. 
相反, Appium 2.0将Appium重新定义为一个 _平台_, 
其可以轻松创建和共享"驱动程序" (引入对给定平台自动化的支持的代码项目) 
和"插件" (允许覆盖, 更改, 扩展或向Appium添加行为的代码项目) . 

与此同时, Appium项目正在借此机会删除许多陈旧以及作废的功能. 

借此机会介绍一些重大变更, 包括如何安装Appium、
如何管理驱动程序和各种功能、以及协议支持等. 
以下为详细介绍. 

## 重大变更

查看 [Appium 2.0 发行说明](https://github.com/appium/appium/releases) 以获取最全面的变更列表. 
在此, 我们指出重大变更以及您需要为它们执行的操作. 

### :bangbang: 在安装过程中安装驱动程序

当您安装Appium 1.x时, 所有可用的驱动程序将与主Appium Server同时安装. 
现在情况已不再如此. 简单地安装Appium 2.0 (例如, 通过 `npm install -g appium` ) , 
将只安装Appium Server, 但没有驱动程序. 
要安装驱动程序, 您必须改用新的 [Appium 扩展 CLI](../cli/extensions.md). 
例如, 为了获取最新版本的XCUITest和UiAutomator2驱动程序, 
您可以在安装Appium后, 运行以下命令:

```
appium driver install xcuitest
appium driver install uiautomator2
```

至此, 您的驱动程序已安装并准备就绪. 
您可以使用此CLI做更多的事情, 因此请务必查看其文档. 
如果您在持续集成环境中运行, 或者想要在一步到位地安装 Appium 和一些驱动程序, 
则可以在安装过程中使用一些特殊标志来执行此操作, 例如:

```
npm install --global appium --drivers=xcuitest,uiautomator2
```

这将一次性为您安装Appium和两种驱动程序.

### :bangbang: Chromedriver安装标志

在Appium 1.x中, 可以使用以下命令行标志自定义Chromedriver的安装方式
 (例如作为UiAutomator2驱动程序的一部分) :

* `--chromedriver-skip-install`
* `--chromedriver-version`
* `--chromedriver-cdnurl`

由于现在通过 Appium 2.0 为您安装驱动程序, 并且这些标志是作为 NPM 配置标志实现的, 
因此它们将不再有效. 相反地, 请在驱动程序安装过程中使用以下环境变量:


* `APPIUM_SKIP_CHROMEDRIVER_INSTALL`
* `CHROMEDRIVER_VERSION`
* `CHROMEDRIVER_CDNURL`

例如:

```
APPIUM_SKIP_CHROMEDRIVER_INSTALL=1 appium driver install uiautomator2
```

### :bangbang: 特定于驱动程序的命令行选项

在 Appium 1.x 中, 针对特定驱动程序的命令行选项都托管在主 Appium 服务器上. 
因此, 您可以与Appium一起使用诸如
'--chromedriver-executable' 这样的CLI参数, 
来设置特定Chromedriver版本的位置, 
UiAutomator2同理. 


在 Appium 2.x 中, 
所有特定于驱动程序和平台的 CLI 参数都已移至驱动程序本身. 
要访问它们, 您现在需要在参数前面附加扩展类型 ( `driver` 或 `plugin`) 以及扩展名的名称. 
例如, `--chromedriver-executable`变为`--driver-uiautomator2-chromedriver-executable`. 


### :bangbang: 特定于驱动程序的自动化命令

仅与特定驱动程序相关的某些命令的定义已移至这些驱动程序内实现. 
例如, `pressKeyCode` 特定作用于 UiAutomator2 驱动程序, 
并且现在只有该驱动程序才能识别. 
在实践中, 这里唯一的重大变更是未安装驱动程序的那种错误. 
之前, 如果使用未实现命令的驱动程序, 则会收到 `501 Not Yet Implemented` 错误. 
现在, 您将获得`404 Not Found`错误, 
因为如果不知道该命令的驱动程序是否有效, 
主 Appium Server将不会定义与命令对应的路由. 


### :bangbang: 驱动程序更新

在过去, 要获取iOS或Android驱动程序的更新, 
您只需等待新版本的Appium包含这些升级, 
然后更新您的Appium版本即可. 
在 Appium 2.x 中, Appium Server和 Appium 驱动程序是分开进行版本控制和发布的. 
这意味着驱动程序可以按照自己的节奏进行发布, 
并且可以在发生驱动程序更新时获得驱动程序更新, 
而不是等待新的Appium Server发布. 
检查驱动程序更新的方法是使用 CLI:


```bash
appium driver list --updates
```

如果有任何更新可用, 
则可以针对任何给定的驱动程序运行 `update` 命令:


```bash
appium driver update xcuitest
```

要更新Appium Server本身, 您需要执行与过去一致的操作: `npm install -g appium`. 
现在, 安装新版本的Appium Server将无关于其他驱动程序, 因此整个过程将更加快速. 


### :bangbang: 协议变更

Appium的API基于[W3C WebDriver协议](https://www.w3.org/TR/webdriver/), 
并且已经支持该协议多年. 
在W3C WebDriver协议被设计为Web标准之前, 
还有其他几种协议用于Selenium和Appium. 
这些协议是 "JSONWP" (JSON Wire Protocol) 以及 "MJSONWP" (Mobile JSON Wire Protocol). 
W3C协议与(M)JSONWP协议在某些方面略有差异. 


在Appium 2.0之前, Appium支持这两种协议, 
因此之前的Selenium / Appium客户端仍然可以与较新的Appium服务器进行通信. 
长期来看, Appium将删除对遗留协议的支持. 


### :bangbang: _Capabilities_

新旧协议之间的一个显着差异在于capabilities的格式. 
以前称为"desired capabilities", 现在简称为"capabilities", 
现在要求在任何非标准capabilities上使用所谓的"供应商前缀". 
标准capabilities列表在 [WebDriver 协议规范](https://www.w3.org/TR/webdriver/#capabilities)中给出, 
其中包括一些常用capabilities, 如`browserName` 以及 `platformName`. 

这些标准capabilities继续按原样使用. 
所有其他capabilities的名称中必须包含"供应商前缀". 
供应商前缀是后跟冒号的字符串, 例如 `appium:`. 
Appium 的大多数capabilities都超出了标准的 W3C capabilities, 
因此必须包含供应商前缀 (我们建议您使用 `appium:` , 除非文档另有说明) . 例如:


- `appium:app`
- `appium:noReset`
- `appium:deviceName`

面向 Appium 2.0 时, 
此要求对于您的测试套件来说, 可能是也可能不是重大更改. 
如果您使用的是更新过的Appium客户端, 
客户端将在所有必要的功能上为您添加 `appium:` 前缀. 
新版本的Appium Inspector工具也将这样做. 
基于云的Appium提供商也可以这样做. 
因此, 只需注意, 如果您收到任何提示, 
表明您的功能缺少供应商前缀, 这便是如何您解决问题的方法. 

在相关的说明中, 
将无法再使用不支持 W3C 协议的 WebDriver 客户端
启动 Appium 会话 (有关 WD 库的针对此效果的注释, 请参阅下文) . 

为了让大家更轻松一些, 
我们还引入了将所有与 Appium 相关的capabilities
打包到一个capabilities对象`appium:options`中的选项. 
您可以将通常用于 `appium:` 前缀上的任何内容绑定到此capabilities中. 
下面是一个示例 (以原始 JSON 格式) , 
说明如何使用`appium:options`在 Safari 浏览器上启动 iOS 会话:


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

 (当然, 每个客户端都会有不同的方法来创建结构化capabilities, 
诸如 `appium:options` 或其他你可能见过的capabilities, 如 `goog:chromeOptions`) . 
注意:显示在 `appium:options` 中的capabilities将覆盖显示在对象顶层的同名capabilities. 

有关capabilities的更多信息, 请查看[Capabilities指南](caps.md).

### :bangbang: _删除的命令_

除了已移至驱动程序实现的命令外, 
作为W3C协议外的旧的JSON Wire协议命令将不再可用:

- TODO (这些命令正在被区分和删除, 完成后将在此处更新) 

如果您使用现代Appium或Selenium客户端, 
则无论如何都不应再使用遗留命令, 
因此任何重大变更都应首先作用于客户端方面. 


### :bangbang: 图像分析功能移至插件

Appium 2.0 的设计目标之一是
将非核心功能迁移到名为 [plugins](../ecosystem/index.md)的特殊扩展中.
这允许人们选择使用额外时间来下载或扩展系统设置的功能. 
Appium的各种图像相关功能 (图像比较, 按图像查找元素等) 已被移动到一个名为 [images](https://github.com/appium/appium/tree/master/packages/images-plugin)的官方支持的插件中. 

如果您使用这些与图像相关的方法, 
要继续使用它们, 您需要执行两项操作. 

1. 安装插件: `appium plugin install images`
2. 确保您启动 Appium Server时具备访问运行插件的权限,  方法是将其包含在命令行上指定的插件列表中, 例如 `appium --use-plugins=images`

与图像相关的命令也将在客户端被删除, 
这意味着您需要按照插件README上的说明安装客户端插件来使用这些功能. 


### :bangbang: 执行驱动程序脚本命令移至插件

如果您使用高级执行驱动程序脚本功能
 (它允许您发送WebdriverIO脚本以使其完全在服务器上执行, 
而不是从客户端逐个命令执行) , 
则此功能已移至插件. 
以下是继续使用它的方法:


1. 安装插件: `appium plugin install execute-driver`
2. 确保您启动 Appium Server时具备访问运行插件的权限,  方法是将其包含在命令行上指定的插件列表中, 例如 `appium --use-plugins=execute-driver`

### :bangbang: 不再支持外部文件 `--nodeconfig`, `--default-capabilities`, `--allow-insecure` 以及 `--deny-insecure`

这些选项可以在命令行上以字符串形式提供
 ( `--nodeconfig` 的JSON字符串以及
用于`--allow-insecure`和`--deny-insecure`的逗号分隔字符串列表) . 
命令行上提供的参数可能需要用引号括起或转义. 

现在, 提供这些选项的推荐方法是通过 [配置文件](#tada-configuration-files). 

总之, 如果您使用的是 JSON Appium 配置文件, 
则只需将"nodeconfig"JSON 文件的内容剪切并粘贴到 `server.nodeconfig` 属性的值中即可.  
您之前为 `--allow-insecure` 和 `--deny-insecure` 提供的任何类似CSV的文件
分别成为Appium配置文件中 `server.allow-insecure` 和 `server.deny-insecure` 属性的值;
两者都是字符串数组. 


### :bangbang: 删除的旧驱动

旧的iOS和Android (UiAutomator 1) 驱动程序
和相关工具 (例如, `authorize-ios`) 已被删除. 
无论如何, 它们已经很多年都没有关联了. 

### :warning: 内部包已重命名

一些Appium内部的NPM软件包已被重命名
 (例如,  `appium-base-driver` 现在是 `@appium/base-driver`) . 
对于Appium用户来说, 这并非是重大变更, 
仅仅针对那些已经构建了直接包含Appium代码的软件的人来说. 

### :warning: 不再支持"WD"JavaScript 客户端库

多年来, Appium的一些作者一直维护着[WD](https://github.com/admc/wd) 客户端库. 
此库已被弃用, 并且尚未更新W3C WebDriver协议. 
因此, 如果您正在使用此库, 则需要迁移到更现代的库. 
我们推荐 [WebdriverIO](https://webdriver.io). 


### :warning: Appium Inspector 从 Appium Desktop 中分离出来

Appium Desktop的Inspector部分已移至其自己的应用程序Appium Inspector:
[github.com/appium/appium-inspector](https://github.com/appium/appium-inspector). 
其与Appium 2.0 Server完全兼容. 
只需下载它并自行运行即可. 
您不再需要GUI Appium桌面服务器来检查应用程序. 
Appium Desktop Server将继续在其原始站点
[github.com/appium/appium-desktop](https://github.com/appium/appium-desktop) 上受支持. 
它不再将Inspector与其捆绑在一起. 

您现在还可以通过访问[Web版本的Appium Inspector](https://inspector.appiumpro.com)
来使用Appium Inspector而无需下载任何内容. 
请注意, 要针对本地服务器进行测试, 您需要使用"--allow-cors"启动服务器, 
以便基于浏览器版本的Appium Inspector可以访问您的Appium Server以启动会话. 


## 主要新功能

除了上面提到的重大变更之外, 
本节中还列出了您可能希望在 Appium 2.0 中利用的一些主要新功能. 

### 插件

#### :tada: _服务器插件_

TODO

#### :tada: _客户端插件_

TODO

### :tada: 从任何地方安装驱动程序和插件

TODO

### :tada: 配置文件

Appium 现在除了命令行参数外, 
还支持 _配置文件_ . 
简而言之, Appium 1.x需要在CLI上提供的几乎所有参数现在都可以通过配置文件来表达. 
配置文件可以是 JSON、JS 或 YAML 格式. 
有关完整说明, 请参阅 [配置指南](config.md) . 


## 云供应商特别说明

本文档的其余部分已普遍适用于 Appium, 
但 Appium 2.0 中的一些架构更改将构成 Appium 相关服务供应商的重大变更, 
无论是基于云的 Appium 主机还是内部服务. 
在一天结束时, Appium Server的维护者负责安装和提供最终用户可能希望使用的各种Appium驱动程序和插件. 

我们鼓励云供应商彻底阅读并理解我们的 [针对云供应商的建议](caps.md#special-notes-for-cloud-providers), 
以行业兼容的方式支持用户！
