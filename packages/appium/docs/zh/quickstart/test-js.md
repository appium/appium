---
hide:
  - toc

title: 编写测试 (JS)
---

要在 JavaScript (Node.js) 中编写 Appium 测试，我们需要选择一个与 Appium 兼容的客户端库。 维护最好的库，也是 Appium 团队推荐使用的，是 [WebdriverIO](https://webdriver.io)，所以让我们使用它。 由于我们已经安装了 Appium，我们知道我们的 Node 和 NPM 已经满足要求。 所以在您的计算机上某个地方创建一个新的项目目录，然后在其中初始化一个新的 Node.js 项目：

```bash
npm init
```

提示中输入什么并不重要，只要最终得到一个有效的 `package.json`。

现在，通过 NPM 安装 `webdriverio` 包：

```bash
npm i --save-dev webdriverio
```

完成后，您的 `package.json` 文件应该包含如下部分：

```json title="package.json"
--8<-- "./sample-code/quickstarts/js/package.json"
```

现在是编写测试本身的时候了。 创建一个名为 `test.js` 的新文件，内容如下：

```js title="test.js"
--8<-- "./sample-code/quickstarts/js/test.js"
```

!!! note

```
这份指南的范围不包括对 WebdriverIO 客户端库或此处发生的一切进行完整说明，因此我们暂时不对代码本身进行详细解释。您可能需要特别阅读 Appium [Capabilities](../guides/caps.md)，以及熟悉优秀的 [WebdriverIO 文档](https://webdriver.io/docs/gettingstarted) 以获得对您看到的各种 API 命令及其目的的更全面解释。
```

!!! note

```
示例代码可从 [GitHub Appium 仓库](https://github.com/appium/appium/tree/master/packages/appium/sample-code/quickstarts/js) 获取。
```

基本上，此代码执行以下操作：

1. 定义一组"Capabilities"（参数）发送到 Appium 服务器，以便 Appium 知道您想要自动化什么。
2. 在内置的 Android 设置应用上启动 Appium 会话。
3. 查找"Apps"列表项并点击它。
4. 暂停片刻纯粹为了视觉效果。
5. 结束 Appium 会话。

就是这样！ 让我们试试。 在运行测试之前，请确保在另一个终端会话中运行 Appium 服务器，否则您会收到无法连接的错误。 然后，您可以执行脚本：

```bash
node test.js
```

如果一切顺利，您将看到设置应用打开并导航到"Apps"视图，然后应用再次关闭。

恭喜，您已经开始了 Appium 之旅！ 继续阅读一些 [后续步骤](./next-steps.md) 以进行探索。
