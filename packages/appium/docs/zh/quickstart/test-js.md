---
hide:
  - toc

title: 编写一个测试 (JS)
---

要在 JavaScript（Node.js）中编写 Appium 测试，我们需要选择一个与 Appium 兼容的客户端
库。维护最好的库和 Appium 团队推荐使用的库是
[WebdriverIO](https://webdriver.io), 所有就让我们使用它吧。既然我们已经安装了 Appium，我们
已经满足了 Node 和 NPM 的要求。因此，只需在计算机上创建一个新的项目目录
然后在其中初始化一个新的 Node.js 项目:

```bash
npm init
```

您在提示中输入什么内容并不重要，只要您最终得到一个有效的
`package.json`.


现在，通过 NPM 安装 `webdriverio` 软件包:

```bash
npm i --save-dev webdriverio
```

完成上述操作后，您的 `package.json` 文件应包含类似以下内容的部分:

```json title="package.json"
--8<-- "./sample-code/quickstarts/js/package.json"
```

现在是编写测试本身的时候了。创建一个名为 `test.js` 的新文件，内容如下:

```js title="test.js"
--8<-- "./sample-code/quickstarts/js/test.js"
```

!!! 注意

    本指南的范围不包括完整介绍 WebdriverIO 客户端
    库或这里发生的一切，因此我们暂且不对代码本身进行详细解释。
    所以目前我们暂时不对代码本身进行详细解释。您可能需要特别阅读 Appium
    [能力](../guides/caps.md), 除了熟悉优秀的
    [WebdriverIO 文档](https://webdriver.io/docs/gettingstarted) 来获得更全面的解释,
    你还可以看到的各种 API 命令以及用途。

!!! 注意

    示例代码可从 [GitHub Appium repository](https://github.com/appium/appium/tree/master/packages/appium/sample-code/quickstarts/js).


基本上，这段代码正在执行以下操作：

1. 定义一组 "Capabilities" 能力值(参数)，以便 Appium 知道您想自动执行哪种任务。
要自动执行的任务。
1. 在内置的 Android 设置应用程序上启动 Appium 会话。
1. 找到 "Battery"列表项并点击它。
1. 停顿片刻，纯粹是为了观察自动化视觉效果。
1. 结束 Appium 会话。

就是这样！让我们试一试吧。运行测试前，请确保您的 Appium 服务器
在另一个终端会话中运行，否则会出现一个有关无法连接到 Appium 服务器的错误。
然后，你就可以执行脚本了：

```bash
node test.js
```

如果一切顺利，在应用再次关闭之前，你会看到 "设置 "应用打开并导航到 "Battery "视图

恭喜您，您已经开始了 Appium 之旅！请继续阅读一些 [下一步骤](./next-steps.md) 继续探索.
