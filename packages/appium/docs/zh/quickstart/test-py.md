---
hide:
  - toc

title: 编写一个测试 (Python)
---
[Appium Python Client](https://github.com/appium/python-client) 是官方的Appium Python客户端，可通过pypi里包名为[Appium-Python-Client](https://pypi.org/project/Appium-Python-Client/)进行安装。
它继承自 [Selenium Python Binding](https://pypi.org/project/selenium/)，
因此安装Appium Python客户端时会包含selenium绑定。

```bash
pip install Appium-Python-Client
```

这个示例使用Python内置的`unittest`模块，尽管你可以使用任何你想要的Python测试框架。
Appium Python客户端自动添加`appium:`供应商前缀。
通常你不需要担心前缀。

```python title="test.py"
--8<-- "./sample-code/quickstarts/py/test.py"
```

!!! note

    在本指南中，我们不会详细解释Python客户端库或这里发生的所有事情，因此现在不对代码本身进行详细说明。

    - 你可能想要特别了解一下Appium [Capabilities](../guides/caps.md)。
    - Python客户端GitHub仓库中的[功能测试代码](https://github.com/appium/python-client/tree/master/test/functional)应该有助于找到更多的工作示例。
    - [文档](https://appium.github.io/python-client-sphinx/)也有助于找到在Appium Python客户端中定义的方法。

!!! note

    示例代码可从 [GitHub Appium仓库](https://github.com/appium/appium/tree/master/packages/appium/sample-code/quickstarts/py) 获取。

基本上，这段代码正在做以下事情：

1. 定义一组“Capabilities”（参数），发送到Appium服务器，以便Appium知道你想要自动化的事物类型。
2. 在内置的 Android 设置应用程序上启动 Appium 会话。
3. 查找“Battery”列表项并点击它。
4. 停顿片刻，纯粹是为了观察自动化视觉效果。。
5. 结束Appium会话。

就这些！让我们试一试。在运行测试之前，请确保你有一个Appium服务器在另一个终端会话中运行，否则你将收到无法连接到服务器的错误。然后，你可以执行脚本：

```bash
python test.py
```

如果一切顺利，在应用再次关闭之前，你会看到 "设置 "应用打开并导航到 "Battery "视图。
恭喜您，您已经开始了您的Appium之旅了！继续阅读一些[下一步骤](./next-steps.md)来探索它吧。
