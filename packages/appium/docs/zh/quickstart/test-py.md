---
hide:
  - toc

title: 编写测试 (Python)
---

[Appium Python Client](https://github.com/appium/python-client) 是
官方的 Python Appium 客户端，可通过 pypi 以 [Appium-Python-Client](https://pypi.org/project/Appium-Python-Client/) 包名获取。
它继承自 [Selenium Python Binding](https://pypi.org/project/selenium/)，
因此安装 Appium Python Client 包括 selenium 绑定。

```bash
pip install Appium-Python-Client
```

此示例使用 Python 的内置 `unittest` 模块，您也可以使用任何您想要的 Python 测试框架。
Appium Python 客户端自动添加 `appium:` 前缀。
您通常不需要担心前缀。

```python title="test.py"
--8<-- "./sample-code/quickstarts/py/test.py"
```

!!! note

```
这份指南的范围不包括对 Python 客户端库或此处发生的一切进行完整说明，因此我们暂时不对代码本身进行详细解释。

- 您可能需要特别阅读 Appium [Capabilities](../guides/caps.md)。
- Python Client GitHub 仓库中的 [功能测试代码](https://github.com/appium/python-client/tree/master/test/functional) 应该有助于找到更多工作示例。
- [文档](https://appium.github.io/python-client-sphinx/) 也有助于找到 Appium Python Client 中定义的方法。
```

!!! note

```
示例代码可从 [GitHub Appium 仓库](https://github.com/appium/appium/tree/master/packages/appium/sample-code/quickstarts/py) 获取。
```

基本上，此代码执行以下操作：

1. 定义一组"Capabilities"（参数）发送到 Appium 服务器，以便 Appium 知道您想要自动化什么。
2. 在内置的 Android 设置应用上启动 Appium 会话。
3. 查找"Apps"列表项并点击它。
4. 暂停片刻纯粹为了视觉效果。
5. 结束 Appium 会话。

就是这样！ 让我们试试。 在运行测试之前，请确保在另一个终端会话中运行 Appium 服务器，否则您会收到无法连接的错误。 然后，您可以执行脚本：

```bash
python test.py
```

如果一切顺利，您将看到设置应用打开并导航到"Apps"视图，然后应用再次关闭。

恭喜，您已经开始了 Appium 之旅！ 继续阅读一些 [后续步骤](./next-steps.md) 以进行探索。
