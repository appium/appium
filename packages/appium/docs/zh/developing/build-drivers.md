---
title: 构建Appium驱动程序
---

Appium 希望让任何人都可以轻松开发自己的自动化驱动程序, 
作为Appium生态系统一部分. 
本指南将解释所涉及的内容以及
如何使用 Appium 提供的工具完成各种驱动程序开发任务. 
本指南假定您 (1) 精通Appium, (2) 是一个称职的Node.js开发人员, 
并且(3)您已阅读并理解[驱动程序介绍](../intro/drivers.md).


如果您是这样的, 好棒!本指南将助您起步.

## 创建驱动程序之前

在您开始实现驱动程序之前, 请务必解决一些问题. 
例如, 您需要知道驱动程序将执行的操作. 
其试图暴露于哪个平台WebDriver自动化?

Appium 不会神奇地赋予您自动化任何平台的能力. 
它所做的只是给你一套用于实现 WebDriver 协议的便捷工具. 
因此, 如果您想创建, 例如, 
作为新应用平台的驱动程序, 
您需要知道, *没有 Appium*的前提下如何在该平台上自动化应用.

这通常意味着您需要非常熟悉给定平台的应用程序开发. 并且
这通常意味着您将依赖平台供应商提供的工具或SDK.

基本上, 如果您无法回答问题 **"我将如何启动, 远程触发行为, 以及
从基于此平台上从应用程序读取状态?" 那么您还没有准备好编写 Appium 驱动程序**.
确保做过调研能够回答上述问题, 这样您就 *有* 了继续的方向. 一旦如此, 
编码并使做出Appium驱动程序变成可能, 就应该是简单的部分了!

## 要参考的其他驱动程序

构建 Appium 驱动程序最棒的事情之一是, 
已经有许多开源 Appium 驱动程序, 您可以查看以供参考. 
有一个 [假驱动程序](https://github.com/appium/appium/tree/2.0/packages/fake-driver) 示例驱动程序, 
其中除了展示本指南中描述的一些内容外, 基本上什么都不做.

当然, Appium 的所有官方驱动程序都是开源的, 
可在该项目的 GitHub 组织的仓库中找到. 
因此, 如果你发现自己问, "司机如何做X?",
阅读这些驱动程序的代码!
如果你被卡住了, 也不要害怕向Appium开发人员提问;
我们总是很乐意帮助确保驱动程序开发体验良好!

## Appium 驱动程序的基本要求

这些是您的驱动程序*必须*执行 (或成为) 的操作, 如果您希望它成为有效的Appium驱动程序.

### 带有 Appium 扩展元数据的 Node.js 包

所有 Appium 驱动程序基本上都是 Node.js 软件包, 
因此必须具有有效的`package.json`. 
您的驱动程序不 _限于_  Node.js, 
但它必须提供用 Node.js 编写的适配器以便 Appium 可以加载它. 

您的 `package.json` 必须包含 `appium` 作为 `peerDependency`. 
对依赖项版本应尽可能宽松 (除非您碰巧知道您的驱动程序只会
适用于某些版本的 Appium). 例如, 针对Appium 2.0, 大致上是
`^2.0.0`, 声明您的驱动程序适用于以 2.x 开头的任何版本的 Appium.

您的 `package.json` 必须包含一个 `appium` 字段, 
如下所示(我们称之为 'Appium扩展元数据'):

    ```json
    {
      ...,
      "appium": {
        "driverName": "fake",
        "automationName": "Fake",
        "platformNames": [
          "Fake"
        ],
        "mainClass": "FakeDriver"
      },
      ...
    }
    ```

必填子字段为:

* `driverName`: 这应该是驱动程序的短名称.
* `automationName`: 这应该是用户告诉 Appium 使用*您的*驱动程序用于其 `appium:automationName`功能的字符串.
* `platformNames`: 这是一个或多个平台名称的数组, 这些名称被认为对驱动程序有效. 
  当用户发送 `platformName` 功能以启动会话时, 它必须包含在
  此列表供驱动程序处理会话. 已知的平台名称字符串包括:`iOS`,
  `tvOS`, `macOS`, `Windows`, `Android`.
* `mainClass`: 这是来自 `main` 字段的命名导出(采用 CommonJS 样式). 它必须是
  扩展 Appium 的 `BaseDriver` 的类 (见下文).

### 扩展 Appium 的 `BaseDriver` 类

最终, 您的驱动程序会更容易编写, 
因为实现WebDriver 协议和处理某些常见逻辑已经由 Appium 负责. 
所有这些都被编码为 Appium 导出类以供您使用, 称为 `BaseDriver`. 
其被从 `appium/driver`中导出, 
因此您可以使用这些样式之一来导入它并创建 *自己的* 类以扩展:

```js
import {BaseDriver} from 'appium/driver';
// or: const {BaseDriver} = require('appium/driver');

export class MyDriver extends BaseDriver {
}
```

### 使您的驱动程序可用

基本上就是这样!使用 Node.js 包导出驱动程序类并使用正确的 Appium
扩展元数据, 您已经有了 Appium 驱动程序!
现在它不 *做* 任何事情, 但你可以在 Appium 中加载它, 
使用它启动和停止会话, 等等...

要使其可供用户使用, 您可以通过 NPM 发布它. 
当您这样做时, 您的驱动程序将可通过 Appium CLI 安装:

```
appium driver install --source=npm <driver-package-on-npm>
```

当然, 最好先测试您的驱动程序. 
了解其在 Appium 中如何工作的一种方法是先在本地安装:

```
appium driver install --source=local /path/to/your/driver
```

### 开发驱动程序

如何开发驱动程序取决于您. 
但是, 从Appium内部运行很方便, 无需进行大量发布和安装. 
最直接的方法是将最新版本的 Appium 作为 `devDependency`包含在内, 
然后再包括您自己的驱动程序, 例如这样:

```json
{
    "devDependencies": {
        ...,
        "appium": "^2.0.0",
        "your-driver": "file:.",
        ...
    }
}
```

现在, 您可以在本地运行 Appium (`npm exec appium` 或 `npx appium`),
并且因为您的驱动程序是作为依赖项与它一起列出, 它将自动 "安装" 并可用. 
您可以以这种方式设计您的 E2E 测试, 或者若您在 Node.js 中编写它们, 
您可以简单地导入Appium 的启动服务器方法, 用于处理 Node 中 Appium 服务器的启动和停止. 
(TODO: 准备好后, 在其中一个开源驱动程序中引用此实现).

使用现有 Appium 服务器进行本地开发的另一种方法是, 
简化安装您的本地驱动程序:

```
appium driver install --source=local /path/to/your/driver/dev/dir
```

## 标准驱动程序实现理念

这些是创建驱动程序时可能会发现自己想要做的事情.

### 在构造函数中设置状态

如果你定义了自己的构造函数, 
你需要调用 `super` 来确保所有标准状态设置正确:

```js
constructor(...args) {
    super(...args);
    // now do your own thing
}
```

这里的 `args` 参数是包含用于启动 Appium 的所有 CLI 参数的对象服务器.

### 定义和验证接受的功能

您可以定义自己的功能以及对它们的基本验证. 
用户将始终能够发送您未定义的功能, 但如果它们发送您明确拥有的功能定义, 
然后 Appium 将验证它们是否属于正确的类型
(并将检查存在所需的功能).

如果要完全关闭功能验证, 
请在您的构造函数设置`this.shouldValidateCaps`为 `false`.

要为 Appium 提供验证约束, 请将 `this.desiredCapConstraints`设置为验证对象
在您的构造函数中. 
验证对象可能有些复杂. 
下面是一个来自UiAutomator2 驱动程序:

```js
{
  app: {
    presence: true,
    isString: true
  },
  automationName: {
    isString: true
  },
  browserName: {
    isString: true
  },
  launchTimeout: {
    isNumber: true
  },
}
```

### 启动会话和读取功能

Appium 的`BaseDriver` 已经实现了`createSession`命令, 所以你不必这样做. 
然而需要执行自己的启动操作是常见操作
(启动应用程序, 运行一些平台代码, 
或根据为驱动程序定义的功能执行不同的操作).
因此, 您最终可能会覆盖 `createSession`.
您可以在驱动程序定义如下方法:

```js
async createSession(jwpCaps, reqCaps, w3cCaps, otherDriverData) {
    const [sessionId, caps] = super.createSession(w3cCaps);
    // do your own stuff here
    return [sessionId, caps];
}
```

出于遗留原因, 您的函数将收到旧式JSON Wire Protocol的desired以及
需要的caps作为前两个参数. 
鉴于不再支持旧协议和客户端都已更新, 
您只能依赖 `w3cCaps` 参数. 
(关于讨论 `otherDriverData` 的内容, 请参阅下面有关并发驱动程序的部分).

您需要确保调用 `super.createSession` 以获取会话ID以及
已处理的功能(请注意, 功能也在 `this.caps`上设置;
本地修改 `caps`除了更改用户在创建会话中看到的内容外, 没有任何效果). 

就是这样!您可以使用驱动程序所需的任何启动逻辑填充中间部分.

### 结束会话

如果驱动程序需要任何清理或关闭逻辑, 
最好将其作为重写 `deleteSession`的实现:

```js
async deleteSession() {
    // do your own cleanup here
    // don't forget to call super!
    await super.deleteSession();
}
```

如果可能的话, 不要在这里抛出任何错误, 
这一点非常重要, 以便会话清理的所有部分能成功!

### 访问功能和 CLI 参数

您通常需要读取用户为会话设置的参数, 无论是 CLI 参数还是功能. 
最简单的方法是从 CLI 或功能访问 `this.opts`, 其合并了所有的选项. 
因此, 例如, 要访问`appium:app`功能, 您只需获取`this.opts.app`的值.

如果您想了解某些内容是作为 CLI 参数 *还是* 功能发送的, 
您可以显式访问  `this.cliArgs`  和 `this.caps` 对象.

在所有情况下为方便起见,  `appium:` 功能前缀在访问值时被删除.

### 实现WebDriver命令

通过在驱动程序类中实现函数来处理WebDriver命令. 
如果希望在驱动程序中支持该命令, 
WebDriver协议, 加上各种Appium扩展, 具有您实现的相应功能. 
查看Appium支持哪些命令的最佳方式, 
以及需要为每个命令实现的方法是, 查看Appium的
[routes.js](https://github.com/appium/appium/blob/2.0/packages/base-driver/lib/protocol/routes.js).
此文件中的每个路由对象都会告诉您命令名以及您希望使用的参数接收该命令.

让我们以这个代码块为例:
```js
'/session/:sessionId/url': {
    GET: {command: 'getUrl'},
    POST: {command: 'setUrl', payloadParams: {required: ['url']}},
}
```

这里我们看到路由 `/session/:sessionId/url` 映射到两个命令, 
一个用于`GET`一个用于`POST`请求. 
如果我们想允许驱动程序更改"url"(或无论这对我们的驱动程序意味着什么)
我们可以实现`setUrl`命令, 其将采用`url`参数  :

```js
async setUrl(url) {
    // your implementation here
}
```

一些注意事项:
- 所有命令方法都应该是`async`函数或返回`Promise`
- 您无需担心协议编码/解码. 你将获得JS对象作为参数, 并且
  可以在响应中返回 JSON 可序列化的对象. Appium将负责将其包裹在
  WebDriver协议响应格式, 将其转换为JSON等...
- 所有基于会话的命令都接收`sessionId`参数作为最后一个参数
- 所有基于元素的命令都接收`elementId`参数作为倒数第二个参数
- 如果驱动程序未实现命令, 用户仍可以尝试访问该命令, 并将
  收到`501 501 尚未实现` 响应错误

### 实现元素查找

元素查找是一种特殊的命令实现案例. 
您实际上不想覆盖`findElement`或`findElements`, 
即使这些是`routes.js`中列出的内容. 
Appium 为您做了很多工作, 如果您想要实现这个函数:

```js
async findElOrEls(strategy, selector, mult, context) {
    // find your element here
}
```

这是传入的内容:

- `strategy` - 一个字符串, 正在使用的定位器策略
- `selector` - 一个字符串, 选择器
- `mult` - 布尔值, 无论用户请求了匹配选择器的一个还是所有元素
- `context` - (可选)如果定义, 将是一个 W3C 元素(即, 带有 W3C 元素的 JS 对象
  标识符作为键, 元素 ID 作为值)

并且您需要返回以下内容之一:

- 单个 W3C 元素(如上所述的对象)
- W3C 元素数组

请注意, 您可以从`appium/support`导入W3C网络元素标识符:

```js
import {util} from 'appium/support';
const { W3C_WEB_ELEMENT_IDENTIFIER } = util;
```

你用元素做什么取决于你!
通常, 您最终会保留ID的缓存映射到实际元素"对象"
或任何等效物适用于您的平台.

### 定义有效的定位器策略

驱动程序可能仅支持标准 WebDriver 定位器策略的子集, 
或者可能添加自己的自定义定位器策略. 
告诉Appium哪些策略被认为对您的驱动程序有效, 
创建一系列策略并将其分配给`this.locatorStrategies`:

```js
this.locatorStrategies = ['xpath', 'custom-strategy'];
```

如果用户尝试使用允许的策略以外的任何策略, 
Appium 将抛出错误, 
这使您能够保持元素查找代码干净, 
并且只处理您的策略.

默认情况下, 有效策略列表为空, 
因此如果您的驱动程序不是简单地代理另一个WebDriver端点, 
您需要定义一些. 协议标准定位器策略定义
[此处](https://www.w3.org/TR/webdriver/#locator-strategies).

### 引发特定于WebDriver的错误

WebDriver规范定义了发生错误时响应的
[一组错误代码](https://github.com/jlipps/simple-wd-spec#error-codes). 
Appium为这些代码中的每一个创建了错误类, 因此您可以从命令内部发出适当的错误, 
它将按照协议执行正确的操作响应用户. 
要访问这些错误类, 请从 `appium/driver`导入它们:

```
import {errors} from 'appium/driver';

throw new errors.NoSuchElementError();
```

### 将消息记录到Appium日志

当然, 您可以始终使用 `console.log`,
但Appium为您提供了一个很好的记录器
`this.log` (对于不同的日志, 它有 `.info`, `.debug`, `.log`, `.warn`, `.error` 方法级别). 
如果您想在驱动程序上下文之外创建Appium记录器(例如在脚本或helper文件), 您也可以构建自己的:

```js
import {logging} from 'appium/support';
const log = logging.getLogger('MyDriver');
```

## Appium驱动程序的更多可能性

这些是您的驱动程序*可以*利用额外的驱动程序功能
或更方便地完成其工作的事情.

### 为自定义命令行参数添加模式

如果希望驱动程序在Appium服务器在启动后从命令行接收数据
(举例, 服务器管理员应设置的端口不作为功能传递).

要为Appium服务器定义CLI参数(或配置属性), 扩展必须提供 _schema_ . 
在里面扩展的`package.json`的`appium` 属性, 添加一个`schema` 属性. 
这将是a) 模式本身, 或b)模式文件的路径.

这些模式的规则:

- 模式必须符合 [JSON Schema Draft-07](https://ajv.js.org/json-schema.html#draft-07).
- 如果`schema`属性是模式文件的路径, 则该文件必须为JSON或JS(CommonJS)格式. 
- 不支持自定义`$id` 值. 要使用 `$ref`, 请提供与模式根相关的值, 例如`/properties/foo`.
- 可支持 `format` 关键字的已知值, 但可能不支持其他各种关键字. 如果您发现需要使用的关键字不受支持, 请[寻求支持](https://github.com/appium/appium/issues/new)或发送PR!
- 模式的类型必须为 `object` (`{"type": "object"}`), 包含`properties `关键字中的参数. 不支持嵌套属性. 

例:

```json
{
  "type": "object",
  "properties": {
    "test-web-server-port": {
      "type": "integer",
      "minimum": 1,
      "maximum": 65535,
      "description": "The port to use for the test web server"
    },
    "test-web-server-host": {
      "type": "string",
      "description": "The host to use for the test web server",
      "default": "sillyhost"
    }
  }
}
```

上述模式定义了两个属性, 可以通过CLI参数或配置文件进行设置. 
如果此扩展名为 _driver_ , 其名称为 "horace", CLI参数将分别为
`--driver-horace-test-web-server-port` 和 `--driver-horace-test-web-server-host`. 
或者, 用户可以提供包含以下内容的配置文件:

```json
{
  "server": {
    
    "driver": {
      "horace": {
        "test-web-server-port": 1234,
        "test-web-server-host": "localhorse"
      }
    }
  }
}
```

### 添加驱动程序脚本

有时, 你可能希望驱动程序的用户能够在会话上下文之外运行脚本
(例如, 运行预生成驱动程序方面的脚本). 为了支持这一点, 
您可以将脚本名称和 JS 文件的映射添加到 Appium 扩展中的`scripts`字段中元数据. 
因此, 假设您在项目中创建了一个位于`scripts`目录中的脚本. 
在您的项目中, 名为`driver-prebuild.js`. 
然后, 您可以添加如下所示的`scripts`字段:

```json
{
    "scripts": {
        "prebuild": "./scripts/driver-prebuild.js"
    }
}
```

现在, 假设您的驱动程序名为 `mydriver`,您的驱动程序的用户可以运行 `appium driver run
mydriver prebuild`,您的脚本将执行.

### 将命令代理到另一个 Web 驱动程序实现

Appium 驱动程序的一个非常常见的设计架构是具有某种特定于平台的体系结构, 
是 Appium 驱动程序接口的WebDriver实现. 
例如, Appium UiAutomator2驱动程序与Android设备上运行的特殊(基于Java)服务器接口有关. 
在WebView模式, 它还与Chromedriver接口有关.

如果您发现自己处于这种情况, 
很容易告诉 Appium 您的驱动程序是只是将 WebDriver 命令直接代理到另一个端点.

首先, 通过实现 `canProxy` 方法让 Appium 知道您的驱动程序 *can* 代理:

```js
canProxy() {
    return true;
}
```

接下来, 告诉 Appium 它应该 *不* 尝试代理哪些 WebDriver 路由
(通常最终会是您不想转发的某些路线):

```js
getProxyAvoidList() {
    return [
        ['POST', new RegExp('^/session/[^/]+/appium')]
    ];
}
```

代理避免列表应该是一个数组数组, 
其中每个内部数组都有一个 HTTP 方法作为它的第一个成员, 
正则表达式作为它的第二个成员. 
如果正则表达式匹配路由, 则路由将不会被代理, 并将由您的驱动程序处理. 
此例中, 我们避免代理所有具有 `appium` 前缀的 `POST` 路由.

接下来, 我们必须设置代理本身. 
执行此操作的方法是使用来自Appium称为`JWProxy`的特殊类. 
(该名称的意思是"JSON Wire Proxy" , 与遗留协议的实现有关). 
您需要使用必要的详细信息创建一个`JWProxy`对象连接到远程服务器:

```js
// import {JWProxy} from 'appium/driver';

const proxy = new JWProxy({
    server: 'remote.server',
    port: 1234,
    base: '/',
});

this.proxyReqRes = proxy.proxyReqRes.bind(proxy);
this.proxyCommand = proxy.command.bind(proxy);
```

这里我们创建一个代理对象, 并将其一些方法分配给 `this`名下的
`proxyReqRes` 和  `proxyCommand`. 
这是 Appium 使用代理所必需的, 所以不要忘记这一步!
`JWProxy`还有许多其他选项, 您也可以在源代码中查看.
(TODO: 将选项发布为 API 文档并在此处链接)

最后, 我们需要一种方法来告诉 Appium 代理何时处于活动状态. 
对于您的驱动程序来说, 它可能总是处于活动状态, 
或者它可能仅在特定上下文中处于活动状态. 您可以将逻辑定义为 `proxyActive`的实现:

```js
proxyActive() {
    return true; // or use custom logic
}
```

有了这些部分, 您就不必重新实现任何已经由远程端点代理的实现. 
Appium 将为您处理所有代理.

### 使用新命令扩展现有协议

你可能会发现现有命令不适合你的驱动程序. 
如果要公开未映射到任何现有命令的行为, 
您可以通过以下两种命令的任一种创建新命令:

1. 扩展 WebDriver 协议并创建客户端插件以访问扩展
1. 通过定义 [Execute Methods](../guides/execute-methods.md)重载执行脚本命令

如果你想采用第一种方式, 你可以指示 Appium 识别新方法并添加它们到其允许的 HTTP 路由和命令名称集. 
您可以这样执行此操作, 通过分配与 Appium 的 `routes.js` 对象形式相同的对象, 
给驱动程序类中的 `newMethodMap`静态变量. 
例如, 下面是`FakeDriver`示例驱动程序的 `newMethodMap`:

```js
static newMethodMap = {
  '/session/:sessionId/fakedriver': {
    GET: {command: 'getFakeThing'},
    POST: {command: 'setFakeThing', payloadParams: {required: ['thing']}},
  },
  '/session/:sessionId/fakedriverargs': {
    GET: {command: 'getFakeDriverArgs'},
  },
};
```

在此示例中, 我们将添加一些新路由和总共 3 个新命令. 
有关如何以这种方式定义命令的更多示例, 最好浏览一下 `routes.js`. 
现在你所需要的一切要做的是像实现任何其他Appium命令一样实现命令.

这种添加新命令方式的缺点是人们使用标准 Appium 客户端, 
不会有良好客户端函数设计于这些端点. 
所以你需要为受支持的每种语言创建和发布客户端插件
(说明或示例可在相关客户端文档中找到).

这种操作方式的替代方法是重载所有已访问的WebDriver客户端的命令: 执行脚本.  
Appium 提供了一些便捷工具来简化实现. 
假设您正在构建一个名为`soundz`的立体声系统构建驱动程序, 
并且您希望创建用于按名称播放歌曲的命令. 
您可以通过以下方式向用户公开此内容:

```js
// webdriverio example. Calling webdriverio's `executeScript` command is what trigger's Appium's
// Execute Script command handler
driver.executeScript('soundz: playSong', [{song: 'Stairway to Heaven', artist: 'Led Zeppelin'}]);
```

然后在驱动程序代码中, 可以将静态属性 `executeMethodMap` 作为
驱动程序上脚本方法名称的映射. 它具有与 `newMethodMap`相同的基本形式, 
如下所述在上面一旦定义了 `executeMethodMap` , 
您还需要实现Execute Script命令处理程序, 
根据Appium的路由映射称为`execute`. 
实施可以调用一个助手函数`this.executeMethod`, 
它负责查看脚本和参数, 并将其路由到您定义的正确自定义处理程序. 
示例如下:

```js
static executeMethodMap = {
  'soundz: playSong', {
    command: 'soundzPlaySong',
    params: {required: ['song', 'artist'], optional: []},
  }
}

async soundzPlaySong(song, artist) {
  // play the song based on song and artist details
}

async execute(script, args) {
  return await this.executeMethod(script, args);
}
```

关于这个系统的一些注意事项:
1. 通过调用执行脚本发送的参数数组必须仅包含零个或一个元素. 这
   列表中的第一项被视为方法的参数对象. 这些参数
   将按照`executeMethodMap`中指定的顺序进行转换、验证, 
   然后应用于重载方法 (在`required`参数列表中指定的顺序, 后跟
   `optional`参数列表). 既这个框架通过执行脚本只假设一个实际的参数
   (此参数应是一个对象, 其键/值表示执行方法所需的参数)
1. Appium 不会自动为您实现 `execute`(执行脚本处理程序). 你可以希望, 
   例如, 仅在不在代理中时才调用`executeMethod`帮助程序函数!
1. 如果脚本名称与其中一个不匹配, `executeMethod`助手将根据`executeMethodMap`
   中定义命令的脚本名称拒绝并显示错误, 或者显示缺少参数.

### 实现对 Appium 设置的处理

Appium 用户可以通过 CLI 参数以及功能将参数发送到驱动程序. 
但这些在测试过程中无法更改, 有时用户希望在测试过程中调整参数. 
Appium 有一个 [设置](../guides/settings.md) API用于此目的.

若要支持您自己的驱动程序中的设置, 
首先将`this.settings`定义为构造函数中的相应类:

```js
// import {DeviceSettings} from 'appium/driver';

this.settings = new DeviceSettings();
```

现在, 您可以随时通过调用`this.settings.getSettings()`来读取用户设置. 
这将返回一个 JS 对象, 其中设置名称是键并具有相应的值.

如果要指定一些默认设置, 或者在更新后运行一些代码, 
您也可以同时执行这两项操作.

```js
constructor() {
  const defaults = {setting1: 'value1'};
  this.settings = new DeviceSettings(defaults, this.onSettingsUpdate.bind(this));
}

async onSettingsUpdate(key, value) {
  // do anything you want here with key and value
}
```

### 了解其他并发驱动程序正在使用的资源

假设你的驱动程序耗尽了一些系统资源, 如端口. 
有几种方法可以确保多个同时进行的会话不使用相同的资源:

1. 让用户通过功能(`appium:driverPort` 等)指定资源 ID
1. 只需始终使用自由资源(为每个会话找到一个新的随机端口)
1. 让每个驱动程序表达它正在使用的资源, 然后检查当前使用的资源
   新会话开始时的其他驱动程序.

若要支持这第三种策略, 可以在驱动程序中实现`get driverData`以返回
驱动程序当前正在使用的各种资源, 例如:

```js
get driverData() {
  return {specialPort: 1234, specialFile: /path/to/file}
}
```

现在, 当在驱动程序上启动新会话时, 来自任何其他会话的`driverData`响应
也将包括同时运行的驱动程序(相同类型)在内, 作为`createSession`方法最后的参数:

```js
async createSession(jwpCaps, reqCaps, w3cCaps, driverData)
```

您可以深入研究此`driverData`数组, 
以查看其他驱动程序正在使用哪些资源, 来提供以帮助确定哪些用于此会话.

!!! 警告

    这里要小心, 因为`driverData`只在单个正在运行的Appium服务器的会话之间传递. 
    没有什么可以阻止用户运行多个 Appium 服务器并请求您的驱动程序. 
    在这种情况下, 您将无法通过`driverData`确保资源独立性, 
    因此您可以考虑使用基于文件的锁定机制或类似的东西.

!!! 警告

    同样重要的是要注意, 您只会收到*您的*其他驱动程序实例的`driverData`. 
    因此, 正在运行的不相关驱动程序可能仍在使用某些系统资源. 
    通常Appium 不提供任何功能来确保不相关的驱动程序不会互相干扰, 
    因此由驱动程序允许用户指定资源位置或地址以避免冲突

### 将事件记录到 Appium 事件时间线

Appium 有一个 [Event Timing API](../guides/event-timing.md), 
允许用户获取对某些服务器端事件的时间戳(如命令、启动里程碑等), 
并将它们显示在时间线. 
该功能基本上存在是为了允许内省内部事件的时间, 
以帮助调试或运行对 Appium 驱动程序内部的分析. 
您可以将自己的事件添加到事件日志:

```js
this.logEvent(name);
```

只需为事件提供一个名称, 它就会在当前时间添加, 
并作为用户事件日志的一部分供访问.

### 将行为隐藏在安全标志后面

Appium 有一个基于功能标志的 [安全模型](../guides/security.md), 
允许驱动程序作者将某些功能隐藏在安全标志后面. 
这意味着, 如果你有一个功能, 你认为不安全并希望要求服务器管理员选择性地引入, 
您可以要求他们启用该功能通过将其添加到 `--allow-insecure`列表或完全关闭服务器安全性.

若要支持在自己的驱动程序中进行检查, 
可以调用`this.isFeatureEnabled(featureName)`来确定是否已启用给定名称的功能. 
或者, 若在您未启用该功能的前提下只想短路并抛出错误, 
您可以调用`this.assertFeatureEnabled(featureName)``.

### 对文件使用临时目录

如果要对驱动程序创建的不重要的文件使用临时目录, 
并不受计算机或服务器重新启动的影响, 您只需从`this.opts.tmpDir`读取即可. 
这从`@appium/support`读取临时目录位置, 可能被 CLI 覆盖标记. 
也就是说, 它比写入您自己的临时目录更安全, 因为这里的位置运行与潜在的用户配置契合. 
`this.opts.tmpDir` 是一个字符串, 是目录的路径.

### 处理意外关机或崩溃

您的驱动程序可能会遇到无法继续正常运行的情况. 
例如, 它可能会检测到某些外部服务已崩溃, 并且不再正常工作. 
在这种情况下, 它可以调用`this.startUnexpectedShutdown(err)`, 
其中包含包含任何详细信息的错误对象, 
以及Appium将尝试在关闭会话之前正常处理任何剩余的请求.

如果要在遇到这种情况时执行一些自己的清理逻辑, 
则可以在调用`this.startUnexpectedShutdown`之前立即执行此操作, 
或者您可以附加处理程序到意外的关机事件并运行清理逻辑"带外数据":

```js
this.onUnexpectedShutdown(handler)
```

`handler`  应该是一个接收错误对象的函数(表示意外关机). 
