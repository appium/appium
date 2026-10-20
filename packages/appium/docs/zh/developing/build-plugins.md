---
title: 开发插件
---

这是一份开发 Appium 插件的高层指南——大多数 Appium 用户并不需要知道或关心这些内容。如果你还不太熟悉面向用户视角的 Appium 插件，可以先看看[插件列表](../ecosystem/plugins.md)，动手试用几个，
了解插件大致能做哪些事情。插件是一套强大的机制，用来增强 Appium 的功能或改变 Appium 的运行方式。它们可以分发给其他 Appium 用户，并以各种有趣的方式扩展 Appium 的生态！（此外，开发插件与开发Appium 驱动有很大重叠，所以你也不妨看看[开发驱动](./build-drivers.md)指南获取更多灵感。）

## 创建插件之前

在创建插件之前，最好对你希望插件完成什么、以及在 Appium 平台的限制下是否可能实现有一个大致的判断。通读本指南能帮你理解哪些事情是可行的。总体而言，Appium 的插件系统非常强大，我们并没有人为地去限制插件能做什么（这也是所有插件都必须由负责启动 Appium 服务器的系统管理员显式启用的主要原因——插件很强大，只应在你明确信任它时才使用！）

## 可供参考的其他插件

有大量开源的 Appium 插件可供查阅。我们强烈建议在动手写自己的插件之前，先看看其他插件的代码。 Appium 团队在 [Appium 的 GitHub 仓库](https://github.com/appium/appium)中维护了一套官方插件。其他开源插件的链接可以在[插件列表](../ecosystem/plugins.md)中找到。

## 插件的基本要求

如果你想让某个东西成为一个合法的 Appium 插件，以下是&#x5B83;_&#x5FC5;&#x987B;_&#x505A;到（或满足）的事情。

### 带 Appium 扩展元数据的 Node.js 包

所有 Appium 插件本质上都是 Node.js 包，因此必须有一个合法的 `package.json`。你的插件并&#x4E0D;_&#x5C40;&#x9650;_&#x4E8E;用 Node.js 编写，但它必须提供一个用 Node.js 编写的适配器，以便 Appium 能够加载它。

你的 `package.json` 必须将 `appium` 声明为 `peerDependency`。对依赖版本的要求应尽量宽松（除非你明确知道你的插件只能与某些特定版本的 Appium 配合工作）。以 Appium 2 为例，写成 `^2.0.0` 即可，表示你的插件兼容所有 2.x 版本的 Appium。

你的 `package.json` 必须包含一个 `appium` 字段，如下所示（我们称之为"Appium 扩展元数据"）：

````
```json
{
  ...,
  "appium": {
    "pluginName": "fake",
    "mainClass": "FakePlugin"
  },
  ...
}
```
````

必需的子字段如下：

- `pluginName`：你的插件的简短名称。
- `mainClass`：从 `main` 字段具名导出（CommonJS 风格）的类。它必须是继承自 Appium 的  `BasePlugin` 的类（见下文）。

### 继承 Appium 的 `BasePlugin` 类

归根结底，你的插件之所以好写，是因为定义"重写命令"的各种模式所需的繁重工作已经替你完成了。这一切都封装在一个 Appium 导出的类中，名为 `BasePlugin`。它从 `appium/plugin` 导出，你可以用下面任一方式导入它，并创建继承它&#x7684;_&#x4F60;自己&#x7684;_&#x7C7B;：

```js
import {BasePlugin} from 'appium/plugin';
// or: const {BasePlugin} = require('appium/plugin');

export class MyPlugin extends BasePlugin {
  // class methods here
}
```

!!! 注意

```
在下面所有代码示例中，凡是给出示例方法的地方，都默认它是定义在类_内部_的；为了简洁和省篇幅，文中没有显式写出这一点。
```

### 让你的插件可用

基本就是这样！一个导出插件类的 Node.js 包，再加上正确的 Appium 扩展元数据，你就拥有了一个 Appium 插件！虽然它还什么都&#x4E0D;_&#x505A;_，但你已经可以在 Appium 中加载它、启用它了……

要让其他用户能用你的插件，你可以通过 NPM 发布它。发布之后，用户就可以通过 Appium CLI 安装它：

```
appium plugin install --source=npm <plugin-package-on-npm>
```

当然，最好先测试你的插件。观察它在 Appium 中如何工作的一个方式，是先以本地方式安装它：

```
appium plugin install --source=local /path/to/your/plugin
```

另外别忘了，启动 Appium 服务器之前，要先启用插件，所以请务必告知用户这一点：

```
appium --use-plugins=plugin-name
```

### 插件的开发流程

如何开发你的插件完全由你决定。不过，直接在 Appium 内部运行会很方便，无需进行繁琐的发布与安装操作。最直接的做法是把最新版本的 Appium 作为 `devDependency`（在较新版本的 NPM 中，它已经作为
`peerDependency` 被引入，也足够了），同时把你的插件也作为依赖引入，例如：

```json
{
    "devDependencies": {
        ...,
        "appium": "^2.0.0",
        "your-plugin": "file:.",
        ...
    }
}
```

这样，你就可以在本地运行 Appium（`npm exec appium` 或 `npx appium`），并且由于你的插件与它并列列为依赖，它会被自动"安装"并可用。你可以按这种方式设计你的 e2e 测试；如果用 Node.js 编写测试，你还可以直接导入 Appium 的启动服务方法，在 Node 中启停 Appium 服务器。

当然，你也随时可以按上文所说的方式以本地源安装。

每次修改插件代码后，你都需要重启 Appium 服务器，才能确保它加载最新的代码。与驱动一样，如果你希望Appium 在新会话启动时尝试重新 require 你的插件模块，可以设置`APPIUM_RELOAD_EXTENSIONS`环境变量。

## 插件实现的标准思路

以下是创建插件时你多半会想做的事情。

### 在构造函数中初始化状态

如果你定义了自己的构造函数，需要调用 `super`，确保所有标准状态被正确初始化：

```js
constructor(...args) {
    super(...args);
    // now do your own thing
}
```

这里的 `args` 参数是包含启动 Appium 服务器所用全部 CLI 参数的对象。

### 拦截并处理特定的 Appium 命令

这是 Appium 插件最常见的用法——修改或替换本应由当前驱动处理的一个或多个命令的执行。要覆盖默认的命令处理逻辑，你需要在类中实现与所要处理的 Appium 命令同名的 `async` 方法（和[驱动本身的实现方式](./build-drivers.md#implement-webdriver-classic-commands)完全一致）。想知道都有哪些命令名？它们定义在 Appium base driver 的
[routes.js](https://github.com/appium/appium-base-driver/blob/master/lib/protocol/routes.js) 文件中，当然你还可以按下一节介绍的方式添加更多命令。

每个命令方法都会收到以下参数：

1. `next`：指向一个 `async` 函数的引用，该函数封装了一系列行为链——如果当前插件未处理该命令，这些行为便会随之发生。你可以在逻辑中的任意位置选择调用链中的下一个行为（只需确保在某处包含 `await next()` 即可），也可以选择不调用。如果不调用，就意味着默认行为（或注册在该插件之后的其他插件）不会被执行。
2. `driver`：该对象代表负责处理当前会话的驱动程序。您可以根据需要使用它来执行各项操作，例如调用驱动程序的其他方法、检查功能配置或设置等。
3. `...args`：一个包含用户在调用命令时所传入的所有参数的数组（通过展开语法获取）。

例如，如果我们想覆盖 `setUrl` 命令，只在原有行为上追加一些日志，可以这样实现：

```js
async setUrl(next, driver, url) {
  this.log(`Let's get the page source for some reason before navigating to '${url}'!`);
  await driver.getPageSource();
  const result = await next();
  this.log(`We can also log after the original behaviour`);
  return result;
}
```

### 拦截并处&#x7406;_&#x6240;有_ Appium 命令

你可能会遇到这样一种情况：需要处&#x7406;_&#x6240;&#x6709;_&#x547D;令，以便检查其中的有效载荷，从而决定是否要采取某种行动。这种情况下，你可以实现 `async handle`，任何没有被你具名方法处理的命令都会交给这个方法处理。它接收以下参数（语义与上文完全一致）：

1. `next`
2. `driver`
3. `cmdName` —— 表示正在运行的命令的字符串
4. `...args`

例如我们想在一个插件中记录所有 Appium 命令的耗时。我们可以这样在插件类中实现 `handle`：

```js
async handle(next, driver, cmdName, ...args) {
  const start = Date.now();
  try {
    const result = await next();
  } finally {
    const elapsedMs = Date.now() - start;
    this.log(`Command '${cmdName}' took ${elapsedMs}`);
  }
  return result;
}
```

### 与驱动代理打交道

在处理 Appium 命令时有一个坑。 Appium 驱动可以开启一种特殊的"代理"模式：在该模式下，Appium 服务器进程会查看进来的 URL，并决定是否把它们转发给某个上游 WebDriver 服务器。可能出现这样的情况：插件想要处理的某个命令，恰好属于被代理到上游服务器的命令。这时就会有问题——插件根本得不到处理该命令的机会！ Appium 对这种情况的处理方式如下：

1. 当一个命令进来时，主协议处理器在决定是否代理该命令之前，会先检查是否有插件要处理它。
2. 如&#x679C;_&#x6CA1;&#x6709;_&#x63D2;件要处理该命令——一切照旧，请求是否被代理取决于驱动的代理模式。
3. 如&#x679C;_&#x6709;_&#x63D2;件要处理该命令，那么代理行为此时会被跳过，并被包装成传给插件的 `next` 函数。所以，如果你的插件里有该命令的处理器，又希望确保驱动的默认代理行&#x4E3A;_&#x786E;&#x5B9E;_&#x53D1;生，只需在你插件处理器所做的事情之外（或之中）`await next()` 即可。

### 抛出 WebDriver 专用错误

WebDriver 规范定义了一组错误代码，以便在发生错误时随命令响应一并返回。 Appium 为每个错误码都创建了对应的错误类，因此你可以在命令内部抛出相应的错误，Appium 会按照协议规范把它正确地响应给用户。要获得这些错误类，从 `appium/driver` 导入即可：

```js
import {errors} from 'appium/driver';

throw new errors.NoSuchElementError();
```

### 向 Appium 日志写消息

你当然可以随时用 `console.log`，但 Appium 为你提供了一个更贴心的日志器 `this.logger`（它有 `.info`、`.debug`、`.log`、`.warn`、`.error` 等不同日志级别的方法）。如果你想在插件上下文之外（比如脚本或辅助文件中）创建 Appium 日志器，也可以自行构造：

```js
import {logging} from 'appium/support';
const log = logging.getLogger('MyPlugin');
```

## Appium 插件的进阶能力

这些是你的插&#x4EF6;_&#x53EF;&#x4EE5;_&#x5B9E;现的功能，旨在利用插件的额外特性，或让插件能更便捷地完成其任务。

### 为自定义命令行参数添加 schema

如果你希望插件在 Appium 服务器启动时从命令行接收数据，就可以添加自定义 CLI 参数（例如由服务器
管理员设定的端口，这类参数不适合通过能力传入）。

插件的这部分机制与驱动基本一致，更多细节请参见[开发驱动文档](./build-drivers.md#add-a-schema-for-custom-command-line-arguments)中的对应章节。

唯一的区别是：构造 CLI 参数名时，前缀要用 `--plugin-<name>`。例如，你的插件名为 `pluggo`，其中定义了一个名为 `electro-port` 的 CLI 参数，那么在启动 Appium 时可以通过
`--plugin-pluggo-electro-port` 来设置它。

通过配置文件设置参数同样是支持的，与驱动一样，只是要写在 `plugin` 字段下。例如

```json
{
  "server": {
    "plugin": {
      "pluggo": {
        "electro-port": 1234
      }
    }
  }
}
```

### 添加插件脚本

有时你可能希望插件用户能够在会话上下文之外运行脚本（例如运行一个预先构建插件某些部分的脚本）。为支持这一点，你可以在 Appium 扩展元数据的 `scripts` 字段中添加一个"脚本名 → JS 文件"的映射。假设你在项目的 `scripts` 目录下创建了一个名为 `plugin-prebuild.js` 的脚本，那么可以像这样添加 `scripts` 字段：

```json
{
    "scripts": {
        "prebuild": "./scripts/plugin-prebuild.js"
    }
}
```

假设你的插件名为 `myplugin`，现在，插件用户就可以运行 `appium plugin run myplugin prebuild`，你的脚本便会执行。

### 添加新的 Appium 命令

如果您希望提供某种功能，而该功能无法对应到驱动程序所支持的现有命令中，那么您可以采用以下两种方式之一来创建新命令——这与驱动程序中的做法相同：

1. 扩展 WebDriver 协议，并编写客户端插件来访问这些扩展
2. 用新的模块和方法扩展 WebDriver BiDi 协议，客户端通过 BiDi 接口访问
3. 通过定义 [Execute Method](../guides/execute-methods.md) 来重载 Execute Script 命令

#### 扩展 HTTP 协议

如果你想采用第一种方式，可以引导 Appium 识别新方法，并将它们添加到其允许的 HTTP 路由和命令名称集合中。具体做法是：在你的驱动类中，将静态变量 `newMethodMap` 赋值为一个对象，该对象的结构应与 Appium 中 `routes.js` 所定义的对象一致。例如，以下是 `FakePlugin` 示例驱动程序中 `newMethodMap` 的部分内容：

```js
static newMethodMap = {
  '/session/:sessionId/fake_data': {
    GET: {command: 'getFakeSessionData', neverProxy: true},
    POST: {
      command: 'setFakeSessionData',
      payloadParams: {required: ['data']},
      neverProxy: true,
    },
  },
  '/session/:sessionId/fakepluginargs': {
    GET: {command: 'getFakePluginArgs', neverProxy: true},
  },
};
```

!!! 注意

```
如果你使用 TypeScript，像这样的静态成员对象应当用 `as const` 来定义。
```

示例中，我们添加了几个新路由，总共新增了 3 条命令。若想查看更多以这种方式定义命令的示例，建议查阅 `routes.js` 文件。接下来，你只需按照实现其他任何 Appium 命令的方式，去实现这些命令的处理程序即可。

此外，请注意针对命令的特殊 `neverProxy` 键；对于插件而言，通常建议将其设置为 `true`。这是因为，当驱动程序处于“代理模式”时，它可能并未明确拒绝代理某些命令（由于是新增的，因而未知的）。将 `neverProxy` 设置为 `true`，可确保 Appium 绝不会代理这些请求路径，从而保证它们始终由您的插件来处理——即便驱动程序正处于代理模式下，也不例外。

通过 `newMethodMap` 添加新命令的不足之处在于，使用标准 Appium 客户端的用户将无法直接调用专为这些端点设计的、便捷的客户端函数。因此，针对你想要支持的每种编程语言，你都需要创建并发布相应的客户端插件（相关说明或示例可在各客户端的文档中找到）。

#### 扩展 BiDi 协议

您还可以通过 WebDriver BiDi（基于 WebSocket 的协议）来提供新的命令。 BiDi 命令由两部分组成：“模块”（本质上是一个容器或命名空间）以及“命令”（即您所定义的新命令的名称）。

与第一种方法类似，你可以通过在驱动类中添加一个名为 `newBidiCommands` 的静态字段，来让 Appium 识别你新增的 BiDi 命令。该字段的格式与 `newMethodMap` 类似。它主要封装了以下信息：BiDi 模块、BiDi 命令名称、指向驱动实例中负责处理该命令的方法的引用，以及该命令所需的必选参数和可选参数。以下是在一个虚构驱动程序中实现 `newBidiCommands` 的示例：

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

在这个虚构的示例中，我们定义了两个新的 BiDi 命令：`appium:video.startFramerateCapture` 和 `appium:video.stopFramerateCapture`。第一个命令包含一个必选参数和一个可选参数，而第二个命令则不需要任何参数。当你在插件类中实现了 `startFrameCap` 和 `stopFrameCap` 方法后，每当客户端触发这些 BiDi 命令时，相应的方法就会被调用。这些方法的签名如下所示：

```js
async startFrameCap(next: () => Promise<any>, driver: DriverClass, videoSource: string, showOnScreen: boolean): Promise<any>;
async stopFrameCap(next: () => Promise<any>, driver: DriverClass): Promise<any>;
```

与添加或重写现有的 HTTP 协议命令类似，这些方法在注入时会包含 `next` 和 `driver` 两个参数。 `driver` 对象代表当前拥有该会话的驱动程序；调用 `await next()` 则会执行（或返回）在插件未激活时本应执行的行为——即驱动程序自身对该方法的处理逻辑，或者是其他已激活插件中同名命令的执行链。

请注意，目前如果启用了 BiDi 代理，插件将无法覆盖由该代理处理的 BiDi 方法。此外，由于这些属于自定义 BiDi 命令，我们的模块名称中应包含厂商前缀（我们选择了 `appium:`，您可以而且应该，根据您的扩​​展功能，选择一个合适的名称）。

#### 重载 Execute Script

除了上述做法外，还有另一种选择：重载一个所有 WebDriver 客户端均可调用的命令——“执行脚本”（Execute Script）。请务必阅读“构建驱动程序”指南中关于[添加新命令](./build-drivers.md#extend-the-existing-protocol-with-new-commands)的章节，以了解其基本运作机制。在插件场景下，其运作方式仅有细微差别。让我们来看一个取自 Appium “模拟插件”（fake-plugin）的示例：

```js
static executeMethodMap = {
  'fake: plugMeIn': {
    command: 'plugMeIn',
    params: {required: ['socket']},
  },
};

async plugMeIn(next, driver, socket) {
  return `Plugged in to ${socket}`;
}

async execute(next, driver, script, args) {
  return await this.executeMethod(next, driver, script, args);
}
```

这里有三个让这套机制运转起来的关键组件，它们都定义在插件类内部：

1. `executeMethodMap`，定义方式与驱动完全相同
2. `executeMethodMap` 中所声明命令方法的实现（本例中为 `plugMeIn`）
3. 覆盖/处理 `execute` 命令。与其他插件命令处理器一样，前两个参数是 `next` 和 `driver`，随后是脚本名和参数。 `BasePlugin` 提供了一个辅助方法，我们可以把这些参数原样传给它调用。

覆盖驱动定义的 Execute Method 的效果符合直觉：如果你的插件定义了与驱动同名的 Execute Method，会先调用你的命令（本例中为 `plugMeIn`）。如果需要，你可以通过 `next` 执行驱动的原有行为。

### 触发 BiDi 事件

你的插件触发自定义 BiDi 事件的方式，与 Appium 驱动完全一致。

### 构建 Appium Doctor 检查

你的用户可以运行 `appium plugin doctor <pluginName>` 来执行安装与健康检查。关于这一能力的更多信息，请访问[构建 Doctor 检查](./build-doctor-checks.md)指南。

### 更新 Appium 服务器对象

You probably don't normally need to update the Appium server object (which is an
[Express](https://expressjs.com/) server having already been
[configured](https://github.com/appium/appium/blob/master/packages/base-driver/lib/express/server.ts)
in a variety of ways). 但你可以为服务器添加新的路由来支撑你的插件的需求。要更新服务器，你必须在类中实现 `static async updateServer` 方法。该方法接收三个参数：

- `expressApp`：Express app 对象
- `httpServer`：Node HTTP 服务器对象
- `cliArgs`：启动 Appium 服务器所用 CLI 参数的映射

在 `updateServer` 方法中，你可以随心所欲地处理这些对象。建议参考 `BaseDriver` 代码中创建及使用这些对象的方式，以确保不会破坏或覆盖任何标准且关键的功能。当然，如果你执意要这样做也是可以的，但务必进行充分测试以验证结果！警告：这属于高级功能，需要你具备 Express 相关知识；同时请务必小心，确保所做的修改不会影响 Appium 服务器其他部分的正常运行！

`updateServer` 在 Appium 自身的路由注册完成后执行，因此此处通过 `expressApp.use(...)` 添加的中间件无法捕获那些已被 Appium 占用的路径请求——Express 是按照注册顺序来匹配中间件和路由的。如果某些中间件必须能够处理这些路径的请求（例如日志记录或身份验证），请改用 `httpServer.frontRouter`：Appium 会在所有路由注册之前挂载该[路由](https://expressjs.com/en/5x/api/router/)，因此挂载到它上面的任何内容（即使是在 `updateServer` 内部添加的）也都会在路由匹配之前执行。需要注意的是，这仍然发生在 Appium 基础中间件（如 CORS 处理、WebSocket 升级处理、请求体解析等）之后；因此，如果请求已被 Appium 本身拒绝（例如 CORS 预检失败或请求体解析失败），这些中间件将无法捕获到此类请求。

```js
static async updateServer(expressApp, httpServer, cliArgs) {
  httpServer.frontRouter.use((req, res, next) => {
    console.log(`Incoming request: ${req.method} ${req.url}`);
    next();
  });
}
```

### 处理会话意外关闭

在开发插件时，你可能需要在会话结束时执行一些清理逻辑。通常，你可以通过为 `deleteSession` 添加处理程序来实现这一点。这种方法在大多数情况下都有效，但如果会话未能正常结束，则不适用。 Appium 有时会判定会话已异常终止；在这种情况下，Appium 会在你的插件类中查找名为 `onUnexpectedShutdown` 的方法并将其调用（该方法接收两个参数：第一个是当前的会话驱动程序，第二个是导致终止的错误对象）。这让你有机会执行必要的清理操作。考虑到该函数不会被 `await`（即不会等待其执行完成），你可以按如下方式进行实现：

```js
async onUnexpectedShutdown(driver, cause) {
  try {
    // do some cleanup
  } catch (e) {
    // log any errors; don't allow anything to be thrown as they will be unhandled rejections
  }
}
```

### 向同一会话中运行的驱动程序或其他插件发送消息

尽管驱动程序和插件彼此并不了解，但它们仍可在同一会话的上下文中，通过 IPC（进程间通信）通道发送消息，供其他驱动程序或插件接收。针对此功能的开发说明对于驱动程序和插件而言是相同的，请参阅“驱动程序开发指南”中有关[驱动程序](./build-drivers.md#send-messages-to-plugins-running-on-the-same-session) IPC 开发的文档。
