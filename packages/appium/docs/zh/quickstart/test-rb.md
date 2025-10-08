---
hide:
  - toc

title: 编写测试 (Ruby)
---

[AppiumLib](https://github.com/appium/ruby_lib) 和 [AppiumLibCore](https://github.com/appium/ruby_lib_core)（**推荐**）是 Ruby 中的官方 Appium 客户端库，可通过 gem 以 [appium_lib](https://rubygems.org/gems/appium_lib) 和 [appium_lib_core](https://rubygems.org/gems/appium_lib_core) 包名获取。 appium_lib_core 继承自 Selenium Ruby Binding，而 appium_lib 继承自 appium_lib_core，因此安装这些库包括 selenium 绑定。 如果您需要一个不太复杂的客户端解决方案，我们推荐 `appium_lib_core`。 `appium_lib` 有一些核心没有的有用方法，但代价是更大的复杂性和可能在最新环境中不工作的历史方法。

作为第一步，让我们初始化一个 Gemfile 来管理依赖项：

```bash
bundle init
```

然后，您可以如下添加 Appium Ruby Client 依赖项：

```bash
bundle add appium_lib_core
# or
# bundle add appium_lib
```

下面的测试代码示例使用 `test-unit` 模块，因此请运行：

```bash
bundle add test-unit
```

一旦这些步骤完成，您的 `Gemfile` 文件应该包含：

```ruby title="Gemfile"
--8<-- "./sample-code/quickstarts/rb/Gemfile"
```

`appium_lib_core` 是作为 Appium 客户端的主要部分。
`appium_lib` 有各种辅助方法，但驱动程序实例通常被设计为全局变量使用。 它可能导致处理实例的问题。
`appium_lib_core` 没有这样的全局变量。

此示例使用 `appium_lib_core` 和 `test-unit` gem 模块。
在 `appium_lib` 中的测试代码应该类似。

```ruby title="test.rb"
--8<-- "./sample-code/quickstarts/rb/test.rb"
```

!!! note

```
这份指南的范围不包括对 Ruby 客户端库或此处发生的一切进行完整说明，因此我们暂时不对代码本身进行详细解释。

- 您可能需要特别阅读 Appium [Capabilities](../guides/caps.md)。
- appium_lib_core GitHub 仓库中的 [功能测试代码](https://github.com/appium/ruby_lib_core/tree/master/test/functional) 应该有助于找到更多工作示例。
- 文档 [appium_lib_core](https://www.rubydoc.info/github/appium/ruby_lib_core) 和 [appium_lib](https://www.rubydoc.info/github/appium/ruby_lib) 也有助于找到可用方法。
```

!!! note

```
示例代码可从 [GitHub Appium 仓库](https://github.com/appium/appium/tree/master/packages/appium/sample-code/quickstarts/rb) 获取。
```

基本上，此代码执行以下操作：

1. 定义一组"Capabilities"（参数）发送到 Appium 服务器，以便 Appium 知道您想要自动化什么。
2. 在内置的 Android 设置应用上启动 Appium 会话。
3. 查找"Apps"列表项并点击它。
4. 暂停片刻纯粹为了视觉效果。
5. 结束 Appium 会话。

就是这样！ 让我们试试。 在运行测试之前，请确保在另一个终端会话中运行 Appium 服务器，否则您会收到无法连接的错误。 然后，您可以执行脚本：

```bash
# 如果您的环境尚未运行安装命令，请先运行 "bundle install"。
bundle exec ruby test.rb
```

如果一切顺利，您将看到设置应用打开并导航到"Apps"视图，然后应用再次关闭。

恭喜，您已经开始了 Appium 之旅！ 继续阅读一些 [后续步骤](./next-steps.md) 以进行探索。
