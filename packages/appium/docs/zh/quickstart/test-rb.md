---
hide:
  - toc

title: 编写一个测试(Ruby)
---

[AppiumLib](https://github.com/appium/ruby_lib) 和 [AppiumLibCore](https://github.com/appium/ruby_lib_core)（**推荐**）是 Ruby 中的官方 Appium 客户端库，
它们可以通过 gem 在 [appium_lib](https://rubygems.org/gems/appium_lib) 和 [appium_lib_core](https://rubygems.org/gems/appium_lib_core) 包名称下获得。
appium_lib_core 继承自 Selenium Ruby，appium_lib 继承自 appium_lib_core，因此安装这些库时包括 Selenium 绑定。
如果您需要不太复杂的客户端解决方案，我们建议您使用`appium_lib_core`。`appium_lib`有一些`appium_lib_core`没有的有用方法，
但代价是更高的复杂性和历史方法，这些方法可能无法在最新环境中工作。

第一步，让我们初始化Gemfile来管理依赖项：

```bash
bundle init
```

然后，您可以添加Appium Ruby客户端依赖项，如下所示：

```bash
bundle add appium_lib_core
# 或
# bundle add appium_lib
```

下面的测试代码示例使用`test-unit`模块，因此请运行：

```bash
bundle add test-unit
```

完成这些步骤后，您的`Gemfile`文件应该包括：

```ruby title="Gemfile"
--8<-- "./sample-code/quickstarts/rb/Gemfile"
```

`appium_lib_core`是 appium 客户端的主要部分。`appium_lib`有各种辅助方法，但驱动程序实例通常被设计为全局变量。
这可能会导致处理实例时出现问题。`appiumlib_core`中没有这样的全局变量。

这个例子使用了`appium_lib_core`和`test-unit`gem 模块。使用`appium_lib`的代码应该类似。

```ruby title="test.rb"
--8<-- "./sample-code/quickstarts/rb/test.rb"
```

!!! 注意

    本指南不包括对Ruby客户端库或这里发生的一切进行完整的概述，因此我们暂时不详细解释代码本身。
    
    - 您可能想特别了解[Appium功能](../guides/caps.md)。
    - 在 appium_lib_core 的 GitHub 仓库中，[功能测试代码](https://github.com/appium/ruby_lib_core/tree/master/test/functional)里可以找到更多的示例。
    - 在[appium_lib_core](https://www.rubydoc.info/github/appium/ruby_lib_core) 和 [appium_lib](https://www.rubydoc.info/github/appium/ruby_lib) 的文档中也可以帮你找到可用的方法。
    
!!! 注意

    示例代码可从[GitHub Appium存储库](https://github.com/appium/appium/tree/master/packages/appium/sample-code/quickstarts/rb)获得。

基本上，这段代码正在执行以下操作：

1. 定义一组要发送到Appium服务器的“能力”（参数），以便Appium知道您想要自动化什么。
1. 在内置的Android设置应用程序上启动Appium会话。
1. 找到“电池”列表项并单击它。
1. 暂停片刻，纯粹是为了视觉效果。
1. 结束Appium会话。

就是这样！让我们试试。在运行测试之前，请确保您在另一个终端会话中运行了 Appium 服务器，否则您将收到无法连接到该服务器的错误。然后，您可以执行脚本：

```bash
# 如果您的环境尚未运行安装命令，请首先运行“bundle install”。
bundle exec ruby test.rb
```

如果一切顺利，您会看到“设置”应用程序打开，并导航到“电池”视图，然后应用程序关闭。

恭喜，您已经开始了您的Appium之旅！请继续阅读，了解[下一步](./next-steps.md)要探索的内容。
