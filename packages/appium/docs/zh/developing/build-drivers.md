---
title: 开发驱动
---

Appium 希望让任何人都能在 Appium 生态系统中开发自己的自动化驱动。本指南将介绍其中涉及的工作，以及如何使用 Appium 提供的工具完成各种驱动开发任务。阅读本指南的前提是你：（1）能熟练使用 Appium，（2）是一名合格的 Node.js 开发者，（3）已经阅读并理解了[驱动介绍](../intro/drivers.md)。

如果你符合这些描述，太好了！本指南将带你入门。

## 创建驱动之前

在动手实现你的驱动之前，先把几件事理清楚很重要。例如，你需要知道你的驱动要做什么。它为哪个平台提供 WebDriver 自动化能力。

Appium 并不会凭空赋予你自动化任何平台的能力。它所做的只是提供一套便捷的工具，帮你实现 WebDriver 协议。所以，如果你想为一个新的应用平台创建驱动，你需要先知道如&#x4F55;_&#x4E0D;借助Appiu&#x6D;_&#x5728;该平台上自动化应用。

这通常意味着你必须非常熟悉某个平台的应用开发，而且往往要依赖该平台厂商提供的工具或 SDK。

如果你无法回答这个问题——**"我该如何在这个平台上启动应用、远程触发应用行为并读取应用状态？"——那么你还不太适合开始编写 Appium 驱动**。请先做好调研，确认确&#x5B9E;_&#x6709;_&#x53EF;行的路径再继续。一旦路径清晰，把它编码实现并做成一个 Appium 驱动就简单多了！

## 可供参考的其他驱动

构建 Appium 驱动最棒的一点是：已经有许多开源的 Appium 驱动可供参考。其中有一个fake-driver](https://github.com/appium/appium/tree/master/packages/fake-driver) 示例驱动，它几乎不
做任何实际事情，只用来演示本指南中提到的若干要点。

当然，Appium 的所有官方驱动都是开源的，可以在项目的 GitHub 组织的仓库中找到。所以如果你正在思考"驱动是怎么实现 X 的？"，去读这些驱动的源码吧！如果你在开发中遇到卡壳的地方，也尽管向 Appium 开发者们提问，我们总是乐于提供帮助，确保你的驱动开发体验顺畅！

## Appium 驱动的基本要求

如果你想让某个东西成为一个合法的 Appium 驱动，以下是&#x5B83;_&#x5FC5;&#x987B;_&#x505A;到（或满足）的事情。

### 带 Appium 扩展元数据的 Node.js 包

所有 Appium 驱动本质上都是 Node.js 包，因此必须有一个合法的 `package.json`。你的驱动并&#x4E0D;_&#x5C40;&#x9650;_&#x4E8E;用 Node.js 编写，但它必须提供一个用 Node.js 编写的适配器，以便 Appium 能够加载它。

你的 `package.json` 必须将 `appium` 声明为 `peerDependency`。对依赖版本的要求应尽量宽松（除非你明确知道你的驱动只能与某些特定版本的 Appium 配合工作）。以 Appium 2 为例，写成`^2.0.0` 即可，表示你的驱动兼容所有 2.x 版本的 Appium。

你的 `package.json` 必须包含一个 `appium` 字段，如下所示（我们称之为"Appium 扩展元数据"）：

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

必需的子字段如下：

- `driverName`：你的驱动的简短名称。
- `automationName`：用户在 `appium:automationName` 能力中填写的字符串，用于让 Appium 使&#x7528;_&#x4F60;&#x7684;_&#x9A71;动。
- `platformNames`：一个数组，包含你的驱动认为合法的一个或多个平台名称。当用户发起会话并传入  `platformName` 能力时，该值必须在此列表中，你的驱动才会处理该会话。这些名称通常应包含你的驱动所面向的操作系统——例如，面向 iOS 的驱动应包含 `iOS`，而面向 Windows 上 Chrome 浏览器的驱动应包含 `Windows`。
- `mainClass`：从 `main` 字段具名导出（CommonJS 风格）的类。它必须是继承自 Appium 的 `BaseDriver` 的类（见下文）。

### 继承 Appium 的 `BaseDriver` 类

归根结底，你的驱动之所以好写，是因为实现 WebDriver 协议以及处理某些通用逻辑的繁重工作已经由 Appium 代劳了。这一切都封装在一个 Appium 导出的类中，名为 `BaseDriver`。它从 `appium/driver` 导出，你可以用下面任一方式导入它，并创建继承它&#x7684;_&#x4F60;自己&#x7684;_&#x7C7B;：

```js
import {BaseDriver} from 'appium/driver';
// or: const {BaseDriver} = require('appium/driver');

export class MyDriver extends BaseDriver {
}
```

### 让你的驱动可用

基本就是这样！一个导出驱动类的 Node.js 包，再加上正确的 Appium 扩展元数据，你就拥有了一个Appium 驱动！虽然它还什么都&#x4E0D;_&#x505A;_，但你已经可以在 Appium 中加载它、用它启动和停止会话了……

要让其他用户能用你的驱动，你可以通过 NPM 发布它。发布之后，用户就可以通过 Appium CLI 安装它：

```
appium driver install --source=npm <driver-package-on-npm>
```

当然，最好先测试你的驱动。观察它在 Appium 中如何工作，一种方式是以本地方式安装它：

```
appium driver install --source=local /path/to/your/driver
```

### 驱动的开发流程

如何开发你的驱动完全由你决定。不过，如何能在 Appium 中直接运行驱动，免去反复发布和安装呢？最直接的做法是把最新版本的 Appium 作为 `devDependency`，同时把你的驱动也作为依赖引入，例如：

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

这样，你就可以在本地运行 Appium（`npm exec appium` 或 `npx appium`），并且由于你的驱动与它并列列为依赖，它会被自动"安装"并可用。你可以按这种方式设计你的 e2e 测试；如果用 Node.js 编写测试，你还可以直接导入 Appium 的启动服务方法，在 Node 中启停 Appium 服务器。 （TODO：待相关实现就绪后，在此引用某个开源驱动的实现。）

在 Appium 服务器上安装并进行本地开发的另一种方式是直接把驱动以本地源安装：

```
appium driver install --source=local /path/to/your/driver/dev/dir
```

### 开发过程中刷新驱动

Appium 服务器启动时会将你的驱动加载进内存。驱动代码的修改要到下一次 Appium 服务器启动时才会生效。启动一个新会话并不会以让驱动代码重新加载。

不过，你可以把环境变量 `APPIUM_RELOAD_EXTENSIONS` 设为 `1`，要求 Appium 在每次收到新会话请求时清除模块缓存并重新加载扩展。这样在修改驱动代码后，也许就不必重启服务器了。

## 驱动实现的标准思路

以下是创建驱动时你多半会想做的事情。

### 在构造函数中初始化状态

如果你定义了自己的构造函数，需要调用 `super`，确保所有标准状态被正确初始化：

```js
constructor(...args) {
    super(...args);
    // now do your own thing
}
```

这里的 `args` 参数是包含启动 Appium 服务器所用的全部 CLI 参数的对象。

### 定义并校验支持的能力

你可以定义自己的能力并为它们配置基本校验。用户可能调用你未定义的能力；但对于你已明确定义的能力，Appium 会校验其类型是否正确（并检查必填能力是否存在）。

如果你想关闭校验，只需在构造函数中把 `this.shouldValidateCaps` 设为 `false`。

要把校验约束提供给 Appium，需要在构造函数中把 `this.desiredCapConstraints` 设为一个校验对象。校验对象可以写得很复杂。下面是 UiAutomator2 驱动的一个例子：

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

### 启动会话并读取能力

Appium 的 `BaseDriver` 已经实现了 `createSession` 命令，所以你不实现它也可以。但驱动通常需要执行自己的启动动作（启动应用、运行某些平台代码、或根据你为驱动定义的能力做不同的事情）。因此你很可能会去重写 `createSession`。你可以在驱动中定义该方法来实现：

```js
async createSession(w3cCaps) {
    const [sessionId, caps] = await super.createSession(w3cCaps);
    // do your own stuff here
    return [sessionId, caps];
}
```

!!! 警告 “已废弃”

```
较老的驱动可能仍以最多四个参数定义 createSession，例如createSession(jwpCaps, reqCaps, w3cCaps, otherDriverData)。这种形式是已退役的 JSON Wire Protocol 的遗留产物——它要求前两个参数是期望能力和必须能力，而实际上只有第一个W3C 形式的参数被使用过。otherDriverData 参数同样已被废弃，与其他并行运行会话的协调请改用IPC（见下文"向同一会话中的插件发送消息"）。新驱动应使用上面所示的单参数形式。
```

你要确保调用 `super.createSession`，以拿到会话 ID 以及处理过的能力（注意：能力同时也被设置在`this.caps` 上；此处仅修改局部变量 `caps`，这只改变用户在创建会话响应中看到的内容，没有其他效果）。

就是这样！中间的空白部分由你的驱动所需的启动逻辑来填充。

### 结束会话

如果你的驱动需要清理或关闭逻辑，最好的方式是重写 `deleteSession` 实现：

```js
async deleteSession() {
    // do your own cleanup here
    // don't forget to call super!
    await super.deleteSession();
}
```

非常重要的一点是：尽可能不要在这里抛出错误，这样才能让会话清理的每个环节都成功执行！

### 访问能力与 CLI 参数

你可能需要读取用户为会话设置的参数，无论它们是 CLI 参数还是能力。最简单的方式是访问 `this.opts`，它合并了来自 CLI 和能力的全部选项。例如要访问 `appium:app` 能力，直接读取 `this.opts.app` 即可。

如果你想知道某个值究竟是以 CLI 参&#x6570;_&#x8FD8;&#x662F;_&#x80FD;力传入的，可以显式访问 `this.cliArgs` 和 `this.caps` 对象。

在所有情况下，为方便起见，当你读取这些值时，`appium:` 能力前缀都已经被剥离掉了。

### 实现 WebDriver classic 命令

你通过在驱动类中实现函数来处理 WebDriver 命令。 WebDriver 协议的每一个成员，以及 Appium 的各种扩展，都对应一个函数——如果你想支持该命令，就实现它。要了解 Appium 支持哪些命令、每个命令需要实现哪个方法，最好的办法是查看 Appium 的 [routes/](https://github.com/appium/appium/blob/master/packages/base-driver/lib/protocol/routes.js)。该文件中的每个路由对象都会告诉你命令名称以及该命令预期接收的参数。

比如下面这段：

```js
'/session/:sessionId/url': {
    GET: {command: 'getUrl'},
    POST: {command: 'setUrl', payloadParams: {required: ['url']}},
}
```

可以看到路由 `/session/:sessionId/url` 映射到两个命令，一个对应 `GET` 请求，一个对应 `POST` 请求。如果我们想让驱动能够改变 "url"，就可以实现 `setUrl` 命令，并知道它会接收 `url` 参数：

```js
async setUrl(url) {
    // your implementation here
}
```

几点说明：

- 所有命令方法都应当是 `async` 函数，或者以其他方式返回 `Promise`
- 你不必关心协议的编解码。参数会以 JS 对象形式传入，你只需返回可 JSON 序列化的对象即可。 Appium 会自动把它们包装成 WebDriver 协议响应格式、转成 JSON 等等……
- 所有基于会话的命令都会把 `sessionId` 参数作为最后一个参数传入
- 所有基于元素的命令都会把 `elementId` 参数作为倒数第二个参数传入
- 如果你的驱动没有实现某个命令，用户仍然可以尝试调用，但会收到 `501 Not Yet Implemented` 错误响应。

### 实现 WebDriver BiDi 命令

[WebDriver BiDi](https://w3c.github.io/webdriver-bidi) 是 WebDriver 规范的新版本，基于 Websocket 而非 HTTP 实现。作为 Appium 驱动作者，你可以直接利用 Appium 的 BiDi 支持，而无需了解 BiDi 协议或 Websocket 的任何细节。实现 BiDi 命令的处理方法与实现 WebDriver 经典命令的处理方法完全一样（见上一节）。你只需在驱动上定义名称对应的方法，当客户端请求该 BiDi 命令时它就会被调用。要查看 BiDi 命令应使用的具体名称，请参考 [bidi-commands.ts](https://github.com/appium/appium/blob/master/packages/base-driver/lib/protocol/bidi-commands.ts)。

你不必局限于官方 BiDi 规范中已定义的命令。如果你想定义新命令，也完全可以——只需要把这些新命令告知 Appium！详情请见下文 [用新的命令扩展现有协议](#用新的命令扩展现有协议)。

### 实现元素查找

元素查找是一种特殊的命令实现情形。尽管 `routes.js` 中列出的命令是 `findElement` 和 `findElements`，但实际上你不应该重写它们。如果你改为实现下面这个函数，Appium 会替你完成大量工作：

```js
async findElOrEls(strategy, selector, mult, context) {
    // find your element here
}
```

传入的参数含义如下：

- `strategy`——字符串，正在使用的定位策略
- `selector`——字符串，选择器
- `mult`——布尔值，表示用户是要查找单个元素还是匹配该选择器的所有元素
- `context`——（可选）若有值，则是一个 W3C Element（即以 W3C 元素标识符为键、元素 ID 为值的 JS 对象）

你需要返回以下二者之一：

- 单个 W3C 元素（即上面描述的对象）
- W3C 元素数组

注意，你可以从 `appium/support` 导入 W3C web 元素标识符：

```js
import {util} from 'appium/support';
const { W3C_WEB_ELEMENT_IDENTIFIER } = util;
```

拿到元素之后怎么用完全由你决定！通常你会维护一个从 ID 到真实元素"对象"（或你平台上等价事物）的映射。

### 定义合法的定位策略

你的驱动可能只支持标准 WebDriver 定位策略的一个子集，也可能添加自己的自定义定位策略。如何告诉 Appium 你的驱动支持哪些策略呢？你需要创建一个策略数组并赋给 `this.locatorStrategies`：

```js
this.locatorStrategies = ['xpath', 'custom-strategy'];
```

如果用户尝试使用允许范围之外的策略，Appium 会抛出错误，这能让你把元素查找代码保持干净，只处理你支持的策略。

默认情况下，合法策略列表为空。所以如果你的驱动不是简单地代理到另一个 WebDriver 端点，你就需要
定义一些策略。协议标准的定位策略定义在[这里](https://www.w3.org/TR/webdriver/#locator-strategies)。

### 抛出 WebDriver 错误

WebDriver 规范定义了一组[错误码](https://github.com/jlipps/simple-wd-spec#error-codes)，用于在命令发生错误时伴随响应返回。 Appium 为每个错误码都创建了对应的错误类，因此你可以在命令内部抛出相应的错误，Appium 会按照协议规范把它正确地响应给用户。要获得这些错误类，从 `appium/driver` 导入即可：

```
import {errors} from 'appium/driver';

throw new errors.NoSuchElementError();
```

### 向 Appium 日志写消息

你当然可以随时用 `console.log`，但 Appium 为你提供了一个更贴心的日志器 `this.log`（它有 `.info`、`.debug`、`.log`、`.warn`、`.error` 等不同日志级别的方法）。如果你想在驱动上下文之外（比如脚本或辅助文件中）创建 Appium 日志器，也可以自行构造：

```js
import {logging} from 'appium/support';
const log = logging.getLogger('MyDriver');
```

## Appium 驱动的进阶能力

以下是你的驱&#x52A8;_&#x53EF;&#x4EE5;_&#x505A;的事情，以利用更多驱动特性或更便捷地完成工作。

### 为自定义命令行参数添加 schema

如果你希望驱动在 Appium 服务器启动时从命令行接收数据，就可以添加自定义 CLI 参数（例如由服务器管理员设定的端口，这类参数不适合通过能力传入）。

要为 Appium 服务器定义 CLI 参数（或配置属性），你的驱动必须提供一个 _schema_。在驱动 `package.json` 的 `appium` 属性下添加一个 `schema` 属性。它可以本身就是 schema，也可以指向 schema 文件的路径。

schema 的规则如下：

- Schema 必须符合 [JSON Schema Draft-07](https://ajv.js.org/json-schema.html#draft-07)。
- 如果 `schema` 属性是 schema 文件的路径，该文件必须是 JSON 或 JS（CommonJS）格式。
- 不支持自定义 `$id` 值。要使用 `$ref`，请提供相对于 schema 根的值，例如 `/properties/foo`。
- `format` 关键字的已知取值一般是受支持的，但其他一些关键字可能不受支持。如果你需要用到的某个关键字不受支持，请[提出支持请求](https://github.com/appium/appium/issues/new)或提交 PR！
- Schema 的类型必须是 `object`（`{"type": "object"}`），参数放在 `properties` 关键字中。不支持嵌套属性。

示例：

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

上面的 schema 定义了两个可通过 CLI 参数或配置文件设置的属性。如果这个扩展是一&#x4E2A;_&#x9A71;&#x52A8;_&#x4E14;名字为 "horace"，那么对应的 CLI 参数分别是 `--driver-horace-test-web-server-port` 和
`--driver-horace-test-web-server-host`。用户也可以提供如下内容的配置文件：

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

### 添加驱动脚本

Sometimes you might want users of your driver to be able to run scripts outside the context of
a session (for example, to run a script that pre-builds aspects of your driver). To support this,
you can add a map of script names and JS files to the `scripts` field within your Appium extension
metadata. So let's say you've created a script in your project that lives in a `scripts` directory
in your project, named `driver-prebuild.js`. Then you could add a `scripts` field like this:

```json
{
    "scripts": {
        "prebuild": "./scripts/driver-prebuild.js"
    }
}
```

Now, assuming your driver is named `mydriver`, users of your driver can run `appium driver run
mydriver prebuild`, and your script will execute.

### Proxy commands to another WebDriver implementation

A very common design architecture for Appium drivers is to have some kind of platform-specific
WebDriver implementation that the Appium driver interfaces with. For example, the Appium
UiAutomator2 driver interfaces with a special (Java-based) server running on the Android device. In
webview mode, it also interfaces with Chromedriver.

If you find yourself in this situation, it is extremely easy to tell Appium that your driver is
just going to be proxying WebDriver commands straight to another endpoint.

First, let Appium know that your driver _can_ proxy by implementing the `canProxy` method:

```js
canProxy() {
    return true;
}
```

Next, tell Appium which WebDriver routes it should _not_ attempt to proxy (there often end up being
certain routes that you don't want to forward on):

```js
getProxyAvoidList() {
    return [
        ['POST', new RegExp('^/session/[^/]+/appium')]
    ];
}
```

The proxy avoidance list should be an array of arrays, where each inner array has an HTTP method as
its first member, and a regular expression as its second. If the regular expression matches the
route, then the route will not be proxied and instead will be handled by your driver. In this
example, we are avoiding proxying all `POST` routes that have the `appium` prefix.

Next, we have to set up the proxying itself. The way to do this is to use a special class from
Appium called `WebDriverProxy`. You'll want to create a `WebDriverProxy` object using the details
required to connect to the remote server:

```js
// import {WebDriverProxy} from 'appium/driver';

const proxy = new WebDriverProxy({
    server: 'remote.server',
    port: 1234,
    base: '/',
});

this.proxyReqRes = proxy.proxyReqRes.bind(proxy);
this.proxyCommand = proxy.command.bind(proxy);
```

Here we are creating a proxy object and assigning some of its methods to `this` under the names
`proxyReqRes` and `proxyCommand`. This is required for Appium to use the proxy, so don't forget
this step! The `WebDriverProxy` has a variety of other options which you can check out in the
source code as well.

Finally, we need a way to tell Appium when the proxy is active. For your driver it might always
be active, or it might only be active when in a certain context. You can define the logic as an
implementation of `proxyActive`:

```js
proxyActive() {
    return true; // or use custom logic
}
```

With those pieces in play, you won't have to reimplement anything that's already implemented by the
remote endpoint you're proxying to. Appium will take care of all the proxying for you.

### Proxy BiDi commands to another BiDi implementation

All of the above about proxying WebDriver commands is conceptually also valid for proxying BiDi
commands specifically. In order to enable BiDi proxying, you need to implement `get bidiProxyUrl`
on your driver. This should return a Websocket URL which is the address of the upstream socket you
want BiDi commands to be proxied to.

The intended pattern here is for you to start a session on the upstream implementation, check
whether it has an active BiDi socket in the returned capabilities (e.g., the `webSocketUrl`
capability), and then to set an internal field to that value, so that it can be returned by `get
bidiProxyUrl`. Once all this is in place, Appium will proxy BiDi commands from the client straight
to the upstream connection.

### Understand server-assigned driver properties and security flags

When your driver is running under the main Appium server, Appium assigns a small set of
server-related properties on your driver instance when a session is created:

- `cliArgs`: Driver-specific configuration derived from the Appium server’s CLI flags and/or
  configuration files (for example via the `server.driver.<your-driver-name>` section). These
  options are **not** user capabilities and cannot be influenced directly by test code.
- `server`, `serverHost`, `serverPort`, `serverPath`: Information about the HTTP server that is
  hosting your driver. These values reflect how the Appium server was started (for example the
  `--address`, `--port`, and `--base-path` flags) and are useful when your driver needs to construct
  URLs that point back to the Appium server itself (for example when setting up proxies, webhooks,
  or other callbacks).

`BaseDriver` and `AppiumDriver` also cooperate to expose security-related flags on your driver
instance:

- `relaxedSecurityEnabled`: Indicates whether the server is running with relaxed security enabled
  (for example via `--relaxed-security`).
- `allowInsecure`: A list of insecure features which are explicitly allowed for this driver (derived
  from server-level options like `--allow-insecure`).
- `denyInsecure`: A list of insecure features which are explicitly disabled for this driver (derived
  from server-level options like `--deny-insecure`).

See [Hide behaviour behind security flags](#hide-behaviour-behind-security-flags) for how to use
these flags in your driver (e.g. via `isFeatureEnabled` and `assertFeatureEnabled`).

### Extend the existing protocol with new commands

You may find that the existing commands don't cut it for your driver. If you want to expose
behaviours that don't map to any of the existing commands, you can create new commands in one of
three ways:

1. Extending the classic WebDriver protocol and creating client-side plugins to access the extensions via the classic HTTP interface
2. Extending the WebDriver BiDi protocol with new modules and methods, accessed from a client via the BiDi interface
3. Overloading the Execute Script command by defining Execute
   Methods

If you want to follow the first path, you can direct Appium to recognize new methods and add them
to its set of allowed HTTP routes and command names. You do this by assigning the `newMethodMap`
static variable in your driver class to an object of the same form as Appium's `routes.js` object.
For example, here is the `newMethodMap` for the `FakeDriver` example driver:

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

In this example we're adding a few new routes and a total of 3 new commands. For more examples of
how to define commands in this way, it's best to have a look through `routes.js`. Now all you need
to do is implement the command handlers in the same way you'd implement any other Appium command.

The downside of this way of adding new commands is that people using the standard Appium clients
won't have nice client-side functions designed to target these endpoints. So you would need to
create and release client-side plugins for each language you want to support (directions or
examples can be found at the relevant client docs).

The second way of adding new commands is adding them as BiDi commands (accessed via the BiDi
websocket interface, rather than the classic HTTP interface). BiDi commands come in two parts:
a "module", which is basically a container or namespace, and a "command", which is the name of your
new command.

As with the first method, you teach Appium to recognize your new BiDi commands by adding a static
field to your driver class, called `newBidiCommands`. It has a format similar to `newMethodMap`.
Basically it encapsulates information about the BiDi module, BiDi command name, reference to your
driver instance method that will handle the command, and required and optional parameters. Here's
an example of a `newBidiCommands` as implemented on an imaginary driver:

```js
static newBidiCommands = {
  'appium:video': {
    startFramerateCapture: {
      command: 'startFrameCap',
      params: {
        required: ['videoSource'],
        optional: ['showOnScreen'],
      }
    },
    stopFramerateCapture: {
      command: 'stopFrameCap',
    },
  }
};
```

In this imaginary example, we have defined two new BiDi commands:
`appium:video.startFramerateCapture` and `appium:video.stopFramerateCapture`. Note first of all
that, because we are defining a custom BiDi command, we should include a 'vendor prefix' (in this
case, `appium:`, though you should pick something that represents your project). The first command
takes a required and an optional parameter, and the second does not. When combined with generic
BiDi support in your driver (see [the section on BiDi](#implement-webdriver-bidi-commands) above),
and given an implementation of the appropriate methods on your driver (e.g. `startFrameCap` and
`stopFrameCap` in this example), clients would be able to send these BiDi commands using whatever
mechanism normally exists for doing so in the client library.

An alternative to these other ways of doing things is to overload a command which all WebDriver clients
have access to already: Execute Script. Appium provides some a convenient tool for making this
easy. Let's say you are building a driver for stereo system called `soundz`, and you wanted to
create a command for playing a song by name. You could expose this to your users in such a way that
they call something like:

```js
// webdriverio example. Calling webdriverio's `executeScript` command is what trigger's Appium's
// Execute Script command handler
driver.executeScript('soundz: playSong', [{song: 'Stairway to Heaven', artist: 'Led Zeppelin'}]);
```

Then in your driver code you can define the static property `executeMethodMap` as a mapping of
script names to methods on your driver. It has the same basic form as `newMethodMap`, described
above. Once `executeMethodMap` is defined, you'll also need to implement the Execute Script command
handler, which according to Appium's routes mapping is called `execute`. The implementation can
call a single helper function, `this.executeMethod`, which takes care of looking at the script and
arguments the user sent in and routing it to the correct custom handler you've defined. Here's an
example:

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

A couple notes about this system:

1. The arguments array sent via the call to Execute Script must contain only zero or one element(s). The
   first item in the list is considered to be the parameters object for your method. These parameters
   will be parsed, validated, and then applied to your overload method in the order specified in
   `executeMethodMap` (the order specified in the `required` parameters list, followed by the
   `optional` parameters list). I.e., this framework assumes only a single actual argument sent in via
   Execute Script (and this argument should be an object with keys/values representing the
   parameters your execute method expects).
2. Appium does not automatically implement `execute` (the Execute Script handler) for you. You may
   wish, for example, to only call the `executeMethod` helper function when you're not in proxy
   mode!
3. The `executeMethod` helper will reject with an error if a script name doesn't match one of the
   script names defined as a command in `executeMethodMap`, or if there are missing parameters.

One of the nice things about the Execute Method strategy is that methods implemented in this way
will be available via the classic or BiDi interfaces (since they will result in the same Appium
handlers being called).

### Build Appium Doctor checks

Your users can run `appium driver doctor <driverName>` to run installation and health checks. Visit
the [Building Doctor Checks](./build-doctor-checks.md) guide for more information on this
capability.

### Implement handling of Appium settings

Appium users can send parameters to your driver via CLI args as well as via capabilities. But these
cannot change during the course of a test, and sometimes users want to adjust parameters mid-test.
Appium has a [Settings](../guides/settings.md) API for this purpose.

To support settings in your own driver, first of all define `this.settings` to be an instance of
the appropriate class, in your constructor:

```js
// import {DeviceSettings} from 'appium/driver';

this.settings = new DeviceSettings();
```

Now, you can read user settings any time simply by calling `this.settings.getSettings()`. This will
return a JS object where the settings names are keys and have their corresponding values.

If you want to assign some default settings, or run some code on your end whenever settings are
updated, you can do both of these things as well.

```js
constructor() {
  const defaults = {setting1: 'value1'};
  this.settings = new DeviceSettings(defaults, this.onSettingsUpdate.bind(this));
}

async onSettingsUpdate(key, value) {
  // do anything you want here with key and value
}
```

### Emit BiDi events

With the WebDriver BiDi protocol, clients can subscribe to arbitrary events which can be sent
asynchronously to the client over the BiDi socket connection. As an Appium driver author you don't
need to worry about event subscription. If you want to emit an event with a certain method name and
payload, it's as easy as using the built-in event emitter with the `bidiEvent` event.

As an
example, let's say our driver wants to periodically emit CPU load information. We could define an
event called `system.cpu`, and a payload that looks like `{load: 0.97}` to signify 97% CPU usage.
Whenever we want, our driver can simply call the following code (assuming we have the current load
in `this.currentCpuLoad`):

```js
this.eventEmitter.emit('bidiEvent', {
  method: 'appium:system.cpu',
  params: {load: this.currentCpuLoad},
})
```

Now, if the client has subscribed to the `system.cpu` event, it will be notified with the load
whenever the driver emits it.

### Make itself aware of resources other concurrent drivers are using

Let's say your driver uses up some system resources, like ports. There are a few ways to make sure
that multiple simultaneous sessions don't use the same resources:

1. Have your users specify resource IDs via capabilities (`appium:driverPort` etc)
2. Just always use free resources (find a new random port for each session)
3. Have each driver express what resources it is using, then examine currently-used resources from
   other drivers when a new session begins.

!!! warning "Deprecated"

```
The `driverData`-based mechanism described below is deprecated. Prefer
[IPC](#send-messages-to-plugins-running-on-the-same-session) for coordinating resources across
concurrently-running sessions instead.
```

To support this third strategy, you can implement `get driverData` in your driver to return what
sorts of resources your driver is currently using, for example:

```js
get driverData() {
  return {specialPort: 1234, specialFile: /path/to/file}
}
```

Now, when a new session is started on your driver, the `driverData` response from any other
simultaneously running drivers (of the same type) will also be included, as the last parameter of
the deprecated, multi-argument form of the `createSession` method:

```js
async createSession(jwpCaps, reqCaps, w3cCaps, driverData)
```

You can dig into this `driverData` array to see what resources other drivers are using to help
determine which ones you want to use for this particular session.

!!! warning

```
Be careful here, since `driverData` is only passed between sessions of a single running Appium
server. There's nothing to stop a user from running multiple Appium servers and requesting your
driver simultaneously on each of them. In this case, you won't be able to ensure independence
of resources via `driverData`, so you might consider using file-based locking mechanisms or
something similar.
```

!!! warning

```
It's also important to note you will only receive `driverData` for other instances of *your*
driver. So unrelated drivers also running may still be using some system resources. In general
Appium doesn't provide any features for ensuring unrelated drivers don't interfere with one
another, so it's up to the drivers to allow users to specify resource locations or addresses to
avoid clashes.
```

### Log events to the Appium event timeline

Appium has an [Event Timing API](../guides/event-timing.md) which allows users to get timestamps
for certain server-side events (like commands, startup milestones, etc...) and display them on
a timeline. The feature basically exists to allow introspection of timing for internal events to
help with debugging or running analysis on Appium driver internals. You can add your own events to
the event log:

```js
this.logEvent(name);
```

Simply provide a name for the event and it will be added at the current time, and made accessible
as part of the event log for users.

### Hide behaviour behind security flags

Appium has a feature-flag based [security model](../guides/security.md) that allows driver authors
to hide certain features behind security flags. What this means is that if you have a feature you
deem insecure and want to require server admins to opt in to it, you can require that they enable
the feature by adding it to the `--allow-insecure` list or turning off server security entirely.

To support the check within your own driver, you can call `this.isFeatureEnabled(featureName)` to
determine whether a feature of the given name has been enabled. Or, if you want to simply
short-circuit and throw an error if the feature isn't enabled, you can call
`this.assertFeatureEnabled(featureName)`.

### Use a temp dir for files

If you want to use a temporary directory for files your driver creates that are not important to
keep around between computer or server restarts, you can simply read from `this.opts.tmpDir`. This
reads the temporary directory location from `@appium/support`, potentially overridden by a CLI
flag. I.e., it's safer than writing to your own temporary directory because the location here plays
nicely with possible user configuration. `this.opts.tmpDir` is a string, the path to the dir.

### Deal with unexpected shutdowns or crashes

Your driver might run into a situation where it can't continue operating normally. For example, it
might detect that some external service has crashed and nothing will work anymore. In this case, it
can call `this.startUnexpectedShutdown(err)` with an error object including any details, and Appium
will attempt to gracefully handle any remaining requests before shutting down the session.

If you want to perform some of your own cleanup logic when you encounter this condition, you can
either do so immediately before calling `this.startUnexpectedShutdown`, or you can attach a handler
to the unexpected shutdown event and run your cleanup logic "out of band" so to speak:

```js
this.onUnexpectedShutdown(handler)
```

`handler` should be a function which receives an error object (representing the reason for the
unexpected shutdown).

### Send messages to plugins running on the same session

Appium's driver and plugin architecture means that a single driver and any number of plugins can be
running together for a current session. The driver and plugins don't really know anything about
each other though, which can make coordination potentially difficult. Without creating any kind of
tight coupling between drivers or plugins, it's possible for drivers and plugins to communicate
along a pub/sub style message bus. With Appium's IPC feature, "message" means a combination of
"data" (the data intended to be published or received), and metadata (timestamp, the name of the
publisher, etc...).

Drivers and plugins can implement an instance method called `async onIpcInit`, in which they will
know that the IPC channel for the session is now active. At this point, they have access to the
following methods:

#### `ipcSubscribe<T>(topic: string): IIpcSubscription`

This method allows a driver or plugin to subscribe to a topic on the IPC channel for the session.
Topics are simply strings. To coordinate effectively, drivers or plugins would use the same topic
string (so this would be something advertised in the driver/plugin documentation).

The result of this call is an `IpcSubscription` object that allows:

- Looping through messages on the topic via an async generator
- Hooking up an event handler for new messages
- Getting the last message sent on the topic
- Publishing a message to the topic
- Unsubscribing from the topic

#### `IpcSubscription` object

Here is an example of how subscribing and use of these subscription methods might work:

```ts
async onIpcInit() {
  // we know at this point in our driver/plugin lifecycle that we can use IPC methods
  type MyMessageData = {myData: string}; // let's say the message data for this channel has this shape

  const subscription = this.ipcSubscribe<MyMessageData>('coolTopic');

  // listen for new messages on topic
  subscription.on('message', (message) => {
    console.log(message.data); // {myData: 'something'}
  });

  // publish data to the topic; might throw if the data is larger than configured max size, or we
  // are no longer subscribed
  await subscription.publish({myData: 'hi'});

  // get last message sent to topic
  const {data} = subscription.getMessage() ?? {data: null};
  // data = {myData: 'hi'}

  // unsubscribe
  subscription.unsubscribe(); // returns true if we unsubscribed and false if no subscription existed
}
```

With a subscription object, we can also iterate async over it to receive new messages:

```ts
for await (const message of subscription) {
  // here we have a message and can unwrap its data
}
```

Note that the iteration will stop when the subscription ends (i.e., when `unsubscribe` is called).

You can also check whether the subscription is still active (if your subscribe and unsubscribe
logic is not locally connected):

```ts
if (subscription.isActive) {
  // we know we have not yet unsubscribed
}
```

If the subscription is not active, attempts to call `subscription.publish` will throw an error.

#### `IpcMessage` object

When you get a message on a topic, it has the following shape:

```ts
export type IpcMessage<T> = {
  publisher: string,   // the id of the publishing object (typically of the form <ClassName>@<uniqueObjectId>)
  timestampMs: number, // when the message was published, in ms since epoch
  topic: string,       // the topic the message was published on
  data: T,             // the arbitrary message data. Must be serializable and a valid argument to 'structuredClone()'
};
```

#### IPC Notes

There are some important things to keep in mind when using Appium's IPC feature:

- IPC is only available once `onIpcInit` has been called, at the end of the `createSession` flow.
  It cannot be used statically or in `createSession` hooks
- In sum, IPC is only for use during a session (this is also to prevent drivers/plugins from
  accessing or reading data sent on IPC channels in other sessions.)
- The default max size of an IPC message is 1MB. This can be configured by the server-admin by
  using the `--max-ipc-data-size` arg (value is a number in bytes).
- If a message exceeds the configured size, any call to `publish` methods will throw, so be
  sure to cover this case in your error handling.
- The default max number of IPC topics per session is 1000. This can be configured by the
  server-admin using the `--max-ipc-topics` arg.
- If the topic limit is reached, calls to `subscribe` or `publish` on a new topic will throw, so
  be sure to cover this case in your error handling.
- Topic names exist within a global namespace per session. So if you don't want to clash with other
  drivers or plugins, make sure you prefix your topic names with something unique, akin to vendor
  prefixes in the WebDriver standard (for example: `fake-driver:some-topic`). We recommend the
  format `<namespace>:<topic>`.

To see examples of IPC in action, check out Appium's own
[FakeDriver](https://github.com/appium/appium/blob/master/packages/fake-driver/lib/driver.ts) and
[FakePlugin](https://github.com/appium/appium/blob/master/packages/fake-plugin/lib/plugin.ts)
extensions, which showcase several ways of using IPC messages.
