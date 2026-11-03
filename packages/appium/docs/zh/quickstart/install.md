---
hide:
  - toc

title: 安装Appium
---

!!! 信息

```
安装前，请确保检查 [系统要求] (./requirements.md)。
```

Appium 可以使用 "npm" 在全局安装：

```bash
npm install -g appium
```

!!! 备注

```
目前不支持其他软件包管理。
```

## 启动Appium

Appium 可以使用 [命令行](../reference/cli/index.md) 启动：

```
appium
```

这会启动Appium服务器进程，该进程加载所有已安装的Appium驱动程序，并开始等待来自客户端连接（如测试自动化脚本）的新会话请求。
由于服务器进程独立于其客户端，因此必须在尝试启动新会话之前明确启动它。

当服务器启动时，控制台日志将列出客户端可以用来连接到此服务器的所有有效URL：

```
[Appium] You can provide the following URLs in your client code to connect to this server:
[Appium] 	http://127.0.0.1:4723/ (only accessible from the same host)
(... any other URLs ...)
```

一旦客户端请求新会话，Appium服务器进程将开始记录此会话的所有详细信息，直到其终止。 请记住这一点——如果您遇到Appium测试的问题，您可以随时检查服务器日志以获取更多详细信息。

接下来是什么？ 即使Appium已安装并运行，它也不捆绑任何驱动程序，这意味着它还不能自动化任何东西。 因此，我们将为Android设置自动化——继续[安装UiAutomator2驱动程序](./uiauto2-driver.md)。
